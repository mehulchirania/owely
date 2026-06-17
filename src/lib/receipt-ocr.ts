export interface ReceiptOcrHints {
  text: string;
  lines: string[];
  title?: string;
  merchant?: string;
  amountRupees?: string;
  date?: string;
}

interface AmountCandidate {
  value: number;
  score: number;
}

const AMOUNT_REGEX = /(?:rs\.?|inr|₹)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/gi;
const DATE_REGEX =
  /\b(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/;
const TOTAL_WORDS = /\b(grand\s+total|amount\s+paid|net\s+amount|total|paid)\b/i;
const LOW_SIGNAL_WORDS = /\b(gst|tax|cgst|sgst|igst|discount|subtotal|sub\s+total|qty|quantity|invoice|bill\s+no|phone|mobile)\b/i;

function cleanLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function normalizeAmount(value: number): string {
  return value.toFixed(2);
}

function amountCandidates(lines: string[]): AmountCandidate[] {
  const candidates: AmountCandidate[] = [];
  for (const line of lines) {
    if (DATE_REGEX.test(line)) continue;
    const keywordBoost = TOTAL_WORDS.test(line) ? 100 : 0;
    const lowSignalPenalty = LOW_SIGNAL_WORDS.test(line) ? 25 : 0;
    for (const match of line.matchAll(AMOUNT_REGEX)) {
      const parsed = Number(match[1].replace(/,/g, ""));
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1_000_000) continue;
      candidates.push({
        value: parsed,
        score: keywordBoost - lowSignalPenalty + Math.min(parsed / 1000, 20),
      });
    }
  }
  return candidates;
}

function bestAmount(lines: string[]): string | undefined {
  const candidates = amountCandidates(lines);
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => b.score - a.score || b.value - a.value);
  return normalizeAmount(candidates[0].value);
}

function bestDate(lines: string[]): string | undefined {
  for (const line of lines) {
    const match = line.match(DATE_REGEX);
    if (match) return match[0];
  }
  return undefined;
}

function bestMerchant(lines: string[]): string | undefined {
  return lines.find(
    (line) =>
      line.length >= 3 &&
      line.length <= 80 &&
      !DATE_REGEX.test(line) &&
      !LOW_SIGNAL_WORDS.test(line) &&
      !TOTAL_WORDS.test(line),
  );
}

export function extractReceiptHints(text: string): ReceiptOcrHints {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);
  const merchant = bestMerchant(lines);
  return {
    text,
    lines,
    title: merchant ? `Receipt - ${merchant}` : undefined,
    merchant,
    amountRupees: bestAmount(lines),
    date: bestDate(lines),
  };
}
