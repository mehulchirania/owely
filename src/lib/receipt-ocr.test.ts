import { describe, expect, it } from "vitest";
import { extractReceiptHints } from "./receipt-ocr";

describe("extractReceiptHints", () => {
  it("prefers grand total over tax/subtotal amounts", () => {
    const hints = extractReceiptHints(`
      Fresh Mart
      GST 29ABCDE1234F1Z5
      Subtotal 1,099.00
      CGST 27.50
      SGST 27.50
      Grand Total Rs. 1,154.00
    `);

    expect(hints.merchant).toBe("Fresh Mart");
    expect(hints.amountRupees).toBe("1154.00");
  });

  it("extracts a receipt date", () => {
    const hints = extractReceiptHints(`
      Cafe Indiranagar
      Date: 17/06/2026
      Total ₹420.50
    `);

    expect(hints.date).toBe("17/06/2026");
    expect(hints.title).toBe("Receipt - Cafe Indiranagar");
  });

  it("ignores date-like numbers as amounts", () => {
    const hints = extractReceiptHints(`
      Store
      2026-06-17
      Amount Paid INR 99
    `);

    expect(hints.amountRupees).toBe("99.00");
  });
});
