"use server";

import { cookies } from "next/headers";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections } from "@/lib/firebase/collections";
import { revalidatePath } from "next/cache";
import { failure, success, type ActionResult } from "@/lib/result";

const ADMIN_COOKIE = "owely_admin_session";

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === "true";
}

export async function loginAdmin(input: any): Promise<ActionResult<boolean>> {
  const { username, password } = input || {};
  if (username === "admin" && password === "admin") {
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE, "true", {
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
    revalidatePath("/admin");
    return success(null);
  } catch (error) {
    return failure("Could not update user details.");
  }
}


