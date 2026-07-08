/**
 * Client-safe rupee string → paise parser.
 *
 * Mirrors `rupeesToPaise` (from `money.ts`) semantics:
 *  - Rejects sub-paise precision (more than 2 decimal digits)
 *  - Rejects non-numeric and empty input
 *  - Rejects zero and negative values
 *
 * Returns `null` instead of throwing — designed for form validation where
 * invalid input is a normal state, not an exception. Pure function: no
 * React, no Firebase.
 */
export function parseRupees(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Must be a valid numeric pattern (optional minus, digits, optional decimal)
  if (!/^-?\d*\.?\d+$/.test(trimmed)) return null;

  // Must look like a number with at most 2 decimal places
  const parts = trimmed.split(".");
  if (parts.length > 2) return null;
  if (parts[1] !== undefined && parts[1].length > 2) return null; // sub-paise

  const rupees = parseFloat(trimmed);
  if (!isFinite(rupees) || rupees <= 0) return null;

  return Math.round(rupees * 100);
}
