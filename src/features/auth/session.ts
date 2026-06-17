/**
 * Session + authorization guards (server-only).
 *
 * The `__session` cookie holds a Firebase **session cookie** (14-day), set by
 * `POST /api/auth/session` after the client signs in. We verify it with the
 * Admin SDK on every protected read and every Server Action — middleware
 * (`proxy.ts`) only checks cookie *presence* for routing, so the real
 * authorization lives here (defense in depth; the Admin SDK bypasses rules).
 */

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuth } from "@/lib/firebase/admin";
import { fetchGroup } from "@/features/groups/queries";
import { failure, success, type ActionResult } from "@/lib/result";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "./session-cookie";
import type { Group } from "@/types";

export { SESSION_COOKIE, SESSION_MAX_AGE };

export interface SessionUser {
  uid: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  picture: string | null;
}

/** Resolve the signed-in user from the session cookie, or `null`. Never throws. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(token, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      phone: decoded.phone_number ?? null,
      name: decoded.name ?? null,
      picture: decoded.picture ?? null,
    };
  } catch {
    // Expired / revoked / malformed cookie — treat as signed out.
    return null;
  }
}

/** Server Component / route-handler guard: redirect to login when signed out. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/?login=true");
  return user;
}

/** Action guard: signed-in user as an `ActionResult`. */
export async function authorizeUser(): Promise<ActionResult<SessionUser>> {
  const user = await getSessionUser();
  if (!user) return failure("Please sign in to continue.", { code: "unauthorized" });
  return success(user);
}

/** Action guard: signed-in AND a member of `groupId`. */
export async function authorizeMember(
  groupId: string,
): Promise<ActionResult<{ user: SessionUser; group: Group }>> {
  const user = await getSessionUser();
  if (!user) return failure("Please sign in to continue.", { code: "unauthorized" });
  const group = await fetchGroup(groupId);
  if (!group) return failure("Group not found.", { code: "not-found" });
  if (!group.members.includes(user.uid)) {
    return failure("You're not a member of this group.", { code: "forbidden" });
  }
  return success({ user, group });
}
