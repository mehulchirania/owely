import { NextResponse } from "next/server";
import { requirePaidFeature } from "@/lib/entitlements";
import { logActionError } from "@/lib/log";
import { extractReceiptHints } from "@/lib/receipt-ocr";
import { fetchGroup } from "@/features/groups/queries";
import { getSessionUser } from "@/features/auth/session";
import { detectReceiptText } from "@/lib/vision-ocr";

export const runtime = "nodejs";

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

function jsonError(error: string, status: number, code?: string): Response {
  return NextResponse.json({ error, code }, { status });
}

function isReceiptImage(file: File): boolean {
  return file.type.startsWith("image/");
}

export async function POST(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return jsonError("Please sign in to continue.", 401, "unauthorized");

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Upload a receipt image.", 400, "invalid-form");
  }

  const groupIdValue = formData.get("groupId");
  if (typeof groupIdValue === "string" && groupIdValue.trim()) {
    const group = await fetchGroup(groupIdValue.trim());
    if (!group || !group.members.includes(user.uid)) {
      return jsonError("Group not found.", 404, "not-found");
    }
  }

  const paid = await requirePaidFeature(user.uid, "ocr");
  if (!paid.ok) return jsonError(paid.error, 402, paid.code);

  const receipt = formData.get("receipt");
  if (!(receipt instanceof File)) {
    return jsonError("Upload a receipt image.", 400, "missing-receipt");
  }
  if (!isReceiptImage(receipt)) {
    return jsonError("Receipt OCR currently accepts image uploads only.", 415, "unsupported-media");
  }
  if (receipt.size <= 0 || receipt.size > MAX_RECEIPT_BYTES) {
    return jsonError("Receipt image must be under 8 MB.", 413, "receipt-too-large");
  }

  try {
    const image = Buffer.from(await receipt.arrayBuffer());
    const text = await detectReceiptText(image);
    return NextResponse.json(extractReceiptHints(text), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logActionError("receiptOcr", error);
    return jsonError("Could not read that receipt. Please try another image.", 500);
  }
}
