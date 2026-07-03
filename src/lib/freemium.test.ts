import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkFreemiumLimit, currentMonthKey } from "./freemium";

// Stub server-only and Firebase Admin so pure logic can be tested in Vitest
vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: vi.fn(),
}));
vi.mock("@/lib/firebase/collections", () => ({
  paths: {
    groupCounter: (groupId: string, monthKey: string) =>
      `groups/${groupId}/counters/${monthKey}`,
  },
}));
// firebase-admin/firestore stub — FieldValue.increment is used in the write path,
// not in checkFreemiumLimit which only reads. No need to fake it here.

import { getAdminDb } from "@/lib/firebase/admin";

/**
 * Build a fake Firestore DocumentReference whose .get() resolves to a snapshot
 * with the given data, or a non-existent snapshot when data is null.
 */
function fakeSnap(data: Record<string, unknown> | null) {
  return {
    exists: data !== null,
    get: (key: string) => (data ? data[key] : undefined),
  };
}

function fakeDb(snapData: Record<string, unknown> | null) {
  const mockGet = vi.fn().mockResolvedValue(fakeSnap(snapData));
  const mockDoc = vi.fn().mockReturnValue({ get: mockGet });
  return { doc: mockDoc };
}

describe("currentMonthKey", () => {
  it("returns YYYY-MM in IST for a UTC midnight crossing", () => {
    // 2026-07-01T00:00:00Z is still 2026-06-30 at 18:30 UTC in UTC+5:30
    // so currentMonthKey should return "2026-06"
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T00:00:00Z")); // 00:00 UTC = 05:30 IST July 1
    // Actually 00:00 UTC = 05:30 IST → same day in IST → "2026-07"
    // Let's use a time that crosses: 2026-06-30T20:00:00Z = 2026-07-01 01:30 IST
    // → should be "2026-07"
    vi.setSystemTime(new Date("2026-06-30T20:00:00Z"));
    expect(currentMonthKey()).toBe("2026-07");
    vi.useRealTimers();
  });

  it("returns zero-padded month", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T10:00:00Z")); // Jan, IST Jan 15
    expect(currentMonthKey()).toMatch(/^\d{4}-01$/);
    vi.useRealTimers();
  });
});

describe("checkFreemiumLimit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns ok:true for paid tier without reading Firestore", async () => {
    vi.mocked(getAdminDb).mockReturnValue(fakeDb(null) as never);
    const result = await checkFreemiumLimit("group1", "paid");
    expect(result.ok).toBe(true);
    expect(getAdminDb).not.toHaveBeenCalled();
  });

  it("returns ok:true when counter doc does not exist (first expense)", async () => {
    vi.mocked(getAdminDb).mockReturnValue(fakeDb(null) as never);
    const result = await checkFreemiumLimit("group1", "free");
    expect(result.ok).toBe(true);
  });

  it("returns ok:true when count is below limit", async () => {
    vi.mocked(getAdminDb).mockReturnValue(fakeDb({ count: 50 }) as never);
    const result = await checkFreemiumLimit("group1", "free");
    expect(result.ok).toBe(true);
  });

  it("returns ok:true when count is exactly at limit minus one", async () => {
    vi.mocked(getAdminDb).mockReturnValue(fakeDb({ count: 99 }) as never);
    const result = await checkFreemiumLimit("group1", "free");
    expect(result.ok).toBe(true);
  });

  it("returns limit-reached when count would exceed 100", async () => {
    vi.mocked(getAdminDb).mockReturnValue(fakeDb({ count: 100 }) as never);
    const result = await checkFreemiumLimit("group1", "free");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("limit-reached");
      expect(result.limit).toBe(100);
    }
  });

  it("accounts for batch size when checking limit", async () => {
    // count=95, batch of 6 would push to 101 → should reject
    vi.mocked(getAdminDb).mockReturnValue(fakeDb({ count: 95 }) as never);
    const result = await checkFreemiumLimit("group1", "free", 6);
    expect(result.ok).toBe(false);
  });

  it("allows a batch that fits exactly", async () => {
    // count=95, batch of 5 → exactly 100 → ok
    vi.mocked(getAdminDb).mockReturnValue(fakeDb({ count: 95 }) as never);
    const result = await checkFreemiumLimit("group1", "free", 5);
    expect(result.ok).toBe(true);
  });

  it("returns ok:true for newExpenseCount <= 0", async () => {
    vi.mocked(getAdminDb).mockReturnValue(fakeDb({ count: 100 }) as never);
    const result = await checkFreemiumLimit("group1", "free", 0);
    expect(result.ok).toBe(true);
  });
});
