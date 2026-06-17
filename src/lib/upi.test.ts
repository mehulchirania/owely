import { describe, expect, it } from "vitest";
import { buildUpiLink, buildGpayLink, buildPhonepeLink, buildPhoneUpiLink } from "./upi";

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

describe("buildGpayLink", () => {
  it("creates intent link for GPay using normalized phone number with @upi handle", () => {
    const link = buildGpayLink({ phone: "+919876543210", payeeName: "A", paise: 1000 });
    expect(link).toContain("pa=9876543210%40upi");
    expect(link).toContain("am=10.00");
    expect(link.startsWith("intent://upi/pay?")).toBe(true);
    expect(link).toContain("package=com.google.android.apps.nbu.paisa.user");
  });
});

describe("buildPhonepeLink", () => {
  it("creates intent link for PhonePe using normalized phone number with @ybl handle", () => {
    const link = buildPhonepeLink({ phone: "98765 43210", payeeName: "B", paise: 5000 });
    expect(link).toContain("pa=9876543210%40ybl");
    expect(link).toContain("am=50.00");
    expect(link.startsWith("intent://pay?")).toBe(true);
    expect(link).toContain("package=com.phonepe.app");
  });
});

describe("buildPhoneUpiLink", () => {
  it("creates generic upi link using raw normalized phone number", () => {
    const link = buildPhoneUpiLink({ phone: "+91 9876543210", payeeName: "C", paise: 10000 });
    expect(link).toContain("pa=9876543210");
    expect(link).toContain("am=100.00");
    expect(link.startsWith("upi://pay?")).toBe(true);
  });
});

