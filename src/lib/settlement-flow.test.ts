import { describe, expect, it } from "vitest";
import {
  buildDesktopQrPayload,
  buildSettlementReminderMessage,
  buildUpiIdNudgeMessage,
  buildWhatsAppShareUrl,
} from "./settlement-flow";

describe("settlement flow helpers", () => {
  it("builds a manual reminder message with amount, group, and app link", () => {
    expect(
      buildSettlementReminderMessage({
        payerName: "Ravi",
        payeeName: "Mehul",
        amount: 12345,
        groupName: "Goa trip",
        settleUrl: "https://owely.app/groups/g1/settle",
      }),
    ).toBe(
      "Hi Ravi, please settle ₹123.45 with Mehul for Goa trip. Open Owely: https://owely.app/groups/g1/settle",
    );
  });

  it("builds a UPI ID nudge message for payees without a target", () => {
    expect(buildUpiIdNudgeMessage("Priya", "Flat")).toContain("add your UPI ID");
    expect(buildUpiIdNudgeMessage("Priya", "Flat")).toContain("Flat");
  });

  it("encodes WhatsApp share URLs", () => {
    expect(buildWhatsAppShareUrl("Pay ₹10.00 for Goa trip")).toBe(
      "https://wa.me/?text=Pay%20%E2%82%B910.00%20for%20Goa%20trip",
    );
  });

  it("keeps QR payloads restricted to generic UPI pay links", () => {
    expect(buildDesktopQrPayload("upi://pay?pa=a%40b&am=10.00")).toBe("upi://pay?pa=a%40b&am=10.00");
    expect(buildDesktopQrPayload("intent://pay?pa=a%40b")).toBeNull();
    expect(buildDesktopQrPayload(null)).toBeNull();
  });
});
