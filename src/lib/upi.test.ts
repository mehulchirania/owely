import { describe, expect, it } from "vitest";
import { buildUpiLink } from "./upi";

describe("buildUpiLink", () => {
  it("converts paise to rupees with two decimals at the boundary", () => {
    const link = buildUpiLink({ upiId: "priya@okaxis", payeeName: "Priya", paise: 12345 });
    expect(link).toContain("am=123.45");
    expect(link).toContain("cu=INR");
    expect(link.startsWith("upi://pay?")).toBe(true);
  });

  it("pads whole-rupee amounts to two decimals", () => {
    expect(buildUpiLink({ upiId: "a@b", payeeName: "A", paise: 10000 })).toContain("am=100.00");
    expect(buildUpiLink({ upiId: "a@b", payeeName: "A", paise: 1 })).toContain("am=0.01");
  });

  it("URL-encodes the payee name and note", () => {
    const link = buildUpiLink({
      upiId: "x@ybl",
      payeeName: "Ravi Kumar",
      paise: 5000,
      note: "Goa trip",
    });
    expect(link).toContain("pn=Ravi%20Kumar");
    expect(link).toContain("tn=Goa%20trip");
  });

  it("rejects non-positive or non-integer amounts", () => {
    expect(() => buildUpiLink({ upiId: "a@b", payeeName: "A", paise: 0 })).toThrow();
    expect(() => buildUpiLink({ upiId: "a@b", payeeName: "A", paise: -100 })).toThrow();
    expect(() => buildUpiLink({ upiId: "a@b", payeeName: "A", paise: 12.5 })).toThrow();
  });

  it("rejects a missing UPI ID", () => {
    expect(() => buildUpiLink({ upiId: "", payeeName: "A", paise: 100 })).toThrow();
  });
});
