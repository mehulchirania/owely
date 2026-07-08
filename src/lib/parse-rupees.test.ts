import { describe, it, expect } from "vitest";
import { parseRupees } from "./parse-rupees";

describe("parseRupees (client-safe validator)", () => {
  it("parses whole rupee amounts", () => {
    expect(parseRupees("100")).toBe(10000);
    expect(parseRupees("1")).toBe(100);
    expect(parseRupees("999")).toBe(99900);
  });

  it("parses amounts with decimals", () => {
    expect(parseRupees("99.99")).toBe(9999);
    expect(parseRupees("0.01")).toBe(1);
    expect(parseRupees("1.50")).toBe(150);
    expect(parseRupees("1.5")).toBe(150);
  });

  it("rejects sub-paise precision (more than 2 decimal places)", () => {
    expect(parseRupees("1.234")).toBeNull();
    expect(parseRupees("0.001")).toBeNull();
    expect(parseRupees("99.999")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseRupees("abc")).toBeNull();
    expect(parseRupees("12ab")).toBeNull();
    expect(parseRupees("$100")).toBeNull();
  });

  it("rejects empty and whitespace-only input", () => {
    expect(parseRupees("")).toBeNull();
    expect(parseRupees("   ")).toBeNull();
  });

  it("rejects zero and negative values", () => {
    expect(parseRupees("0")).toBeNull();
    expect(parseRupees("0.00")).toBeNull();
    expect(parseRupees("-5")).toBeNull();
    expect(parseRupees("-1.50")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(parseRupees("  100  ")).toBe(10000);
    expect(parseRupees(" 0.50 ")).toBe(50);
  });

  it("handles leading zeros correctly", () => {
    expect(parseRupees("007")).toBe(700);
    expect(parseRupees("00.50")).toBe(50);
  });

  it("rejects multiple decimal points", () => {
    expect(parseRupees("1.2.3")).toBeNull();
  });

  it("rejects Infinity and NaN", () => {
    expect(parseRupees("Infinity")).toBeNull();
    expect(parseRupees("NaN")).toBeNull();
  });
});
