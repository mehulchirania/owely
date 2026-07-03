"use server";

import { cookies } from "next/headers";
import { getAdminDb } from "@/lib/firebase/admin";
import { revalidatePath } from "next/cache";
import { failure, success, type ActionResult } from "@/lib/result";
import { logActionError } from "@/lib/log";
import crypto from "crypto";

const ADMIN_COOKIE = "owely_admin_session";

function adminCredentials(): { username: string; password: string } | null {
  const username = process.env.OWELY_ADMIN_USERNAME;
  const password = process.env.OWELY_ADMIN_PASSWORD;
  if (username && password) return { username, password };
  return null;
}

function getAdminSecret(): string {
  return process.env.OWELY_ADMIN_PASSWORD || process.env.CRON_SECRET || "fallback_dev_secret_only";
}

function signSession(expiresAt: number): string {
  const payload = Buffer.from(JSON.stringify({ expiresAt })).toString("base64url");
  const hmac = crypto.createHmac("sha256", getAdminSecret()).update(payload).digest("base64url");
  return `${payload}.${hmac}`;
}

function verifySession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  const hmac = crypto.createHmac("sha256", getAdminSecret()).update(payload).digest("base64url");
  if (hmac !== signature) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof data.expiresAt === "number" && data.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(ADMIN_COOKIE)?.value);
}

export async function loginAdmin(input: unknown): Promise<ActionResult<boolean>> {
  const credentials = input as Partial<{ username: unknown; password: unknown }> | null;
  const username = typeof credentials?.username === "string" ? credentials.username : "";
  const password = typeof credentials?.password === "string" ? credentials.password : "";
  const expected = adminCredentials();
  if (!expected) return failure("Admin login is not configured.");
  if (username === expected.username && password === expected.password) {
    const cookieStore = await cookies();
    const expiresAt = Date.now() + 86400 * 1000;
    cookieStore.set(ADMIN_COOKIE, signSession(expiresAt), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400, // 24 hours
    });
    return success(true);
  }
  return failure("Invalid admin credentials.");
}

export async function logoutAdmin(): Promise<ActionResult<null>> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return success(null);
}

export async function updateUserAdmin(input: {
  userId: string;
  displayName: string;
  phone: string | null;
  tier: "free" | "paid";
}): Promise<ActionResult<null>> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) return failure("Unauthorized.", { code: "unauthorized" });

  try {
    const db = getAdminDb();
    await db.doc(`users/${input.userId}`).update({
      displayName: input.displayName.trim(),
      phone: input.phone?.trim() || null,
      tier: input.tier,
    });
    revalidatePath("/", "layout");
    return success(null);
  } catch (error) {
    logActionError("updateUserAdmin", error);
    return failure("Could not update user details.");
  }
}
