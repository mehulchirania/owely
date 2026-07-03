import { describe, it, expect, vi, beforeEach } from "vitest";
import { requirePaidFeature } from "./entitlements";
import { fetchUser } from "@/features/auth/queries";
import type { User } from "@/types";

// Mock the queries module since requirePaidFeature depends on fetchUser
vi.mock("@/features/auth/queries", () => ({
  fetchUser: vi.fn(),
}));
vi.mock("server-only", () => ({}));

describe("requirePaidFeature", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T12:00:00Z"));
  });

  const baseUser: User = {
    uid: "test-uid",
    displayName: "Test User",
    email: null,
    phone: null,
    photoURL: null,
    tier: "free",
    currency: "INR",
    createdAt: Date.now(),
  };

  it("denies access for free tier", async () => {
    vi.mocked(fetchUser).mockResolvedValue(baseUser);
    const result = await requirePaidFeature("test-uid", "pdf-export");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("is available on Owely Pro");
    }
  });

  it("grants access for paid tier without expiry", async () => {
    vi.mocked(fetchUser).mockResolvedValue({ ...baseUser, tier: "paid" });
    const result = await requirePaidFeature("test-uid", "pdf-export");
    expect(result.ok).toBe(true);
  });

  it("grants access for paid tier with future expiry", async () => {
    vi.mocked(fetchUser).mockResolvedValue({
      ...baseUser,
      tier: "paid",
      tripPassExpiresAt: Date.now() + 86400000, // +1 day
    });
    const result = await requirePaidFeature("test-uid", "pdf-export");
    expect(result.ok).toBe(true);
  });

  it("denies access for paid tier with past expiry", async () => {
    vi.mocked(fetchUser).mockResolvedValue({
      ...baseUser,
      tier: "paid",
      tripPassExpiresAt: Date.now() - 86400000, // -1 day
    });
    const result = await requirePaidFeature("test-uid", "pdf-export");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Trip Pass has expired");
    }
  });
});
