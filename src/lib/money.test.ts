import { describe, expect, it } from "vitest";
import {
  assertExactSplit,
  formatPaise,
  rupeesToPaise,
  splitByWeights,
  splitEqual,
} from "./money";

const sum = (r: Record<string, number>) =>
  Object.values(r).reduce((s, v) => s + v, 0);

describe("rupeesToPaise", () => {
  it("parses without float drift", () => {
    expect(rupeesToPaise("19.99")).toBe(1999);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30); // 0.30000000000000004
    expect(rupeesToPaise("1,234.50")).toBe(123450);
    expect(rupeesToPaise("100")).toBe(10000);
    expect(rupeesToPaise("-50.25")).toBe(-5025);
  });
  it("rejects garbage and sub-paise precision", () => {
    expect(() => rupeesToPaise("12.345")).toThrow();
    expect(() => rupeesToPaise("abc")).toThrow();
    expect(() => rupeesToPaise("")).toThrow();
  });
});

describe("formatPaise", () => {
  it("renders Indian grouping", () => {
    expect(formatPaise(123450)).toBe("₹1,234.50");
    expect(formatPaise(10000000)).toBe("₹1,00,000.00");
    expect(formatPaise(5)).toBe("₹0.05");
    expect(formatPaise(-5025)).toBe("-₹50.25");
  });
});

describe("splitEqual", () => {
  it("distributes remainder deterministically and conserves total", () => {
    const r = splitEqual(10000, ["a", "b", "c"]); // ₹100 / 3
    expect(r).toEqual({ a: 3334, b: 3333, c: 3333 });
    expect(sum(r)).toBe(10000);
  });
  it("handles a single member", () => {
    expect(splitEqual(9999, ["solo"])).toEqual({ solo: 9999 });
  });
  it("throws on zero members", () => {
    expect(() => splitEqual(100, [])).toThrow();
  });
  it("conserves total for many awkward amounts", () => {
    for (const total of [1, 7, 101, 99999, 100000001]) {
      for (const n of [2, 3, 4, 7, 11]) {
        const members = Array.from({ length: n }, (_, i) => `m${i}`);
        expect(sum(splitEqual(total, members))).toBe(total);
      }
    }
  });
});

describe("splitByWeights", () => {
  it("splits by percentage and conserves total", () => {
    const r = splitByWeights(10000, { a: 50, b: 30, c: 20 });
    expect(sum(r)).toBe(10000);
    expect(r).toEqual({ a: 5000, b: 3000, c: 2000 });
  });
  it("uses largest-remainder for indivisible cases", () => {
    const r = splitByWeights(100, { a: 1, b: 1, c: 1 }); // ₹1 / 3
    expect(sum(r)).toBe(100);
    expect(Object.values(r).sort()).toEqual([33, 33, 34]);
  });
  it("rejects non-positive weight sums", () => {
    expect(() => splitByWeights(100, { a: 0, b: 0 })).toThrow();
    expect(() => splitByWeights(100, {})).toThrow();
  });
});

describe("assertExactSplit", () => {
  it("passes an exact split", () => {
    expect(assertExactSplit(100, { a: 60, b: 40 })).toEqual({ a: 60, b: 40 });
  });
  it("rejects an off-by-one split", () => {
    expect(() => assertExactSplit(100, { a: 60, b: 41 })).toThrow();
  });
  it("rejects non-integer paise", () => {
    expect(() => assertExactSplit(100, { a: 60.5, b: 39.5 })).toThrow();
  });
});
