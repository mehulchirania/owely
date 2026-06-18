/**
 * Session-cookie endpoint.
 *
 *  POST   — exchange a freshly-minted Firebase ID token for a 14-day session
 *           cookie (`__session`, HttpOnly, SameSite=Lax). The client posts here
 *           right after `signInWith*` succeeds.
 *  DELETE — clear the cookie (sign-out) and revoke the user's refresh tokens.
 *
 * The Admin SDK verifies the ID token before minting the cookie, so a forged
 * token can't create a session.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/features/auth/session";
import { logActionError } from "@/lib/log";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function POST(request: Request): Promise<NextResponse> {
  let idToken: unknown;
  try {
    ({ idToken } = await request.json());
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }
  if (typeof idToken !== "string" || idToken.length === 0) {
    return NextResponse.json({ error: "Missing ID token." }, { status: 400 });
  }

  try {
    const auth = getAdminAuth();
    // Verify before minting; rejects tokens issued more than 5 min ago to
    // ensure the user just authenticated.
    await auth.verifyIdToken(idToken, true);
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionCookie, {
      ...cookieOptions,
      maxAge: SESSION_MAX_AGE,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logActionError("session:create", error);
    return NextResponse.json({ error: "Could not create a session." }, { status: 401 });
  }
}

export async function DELETE(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionCookie) {
    try {
      const auth = getAdminAuth();
      const decoded = await auth.verifySessionCookie(sessionCookie);
      await auth.revokeRefreshTokens(decoded.uid);
    } catch (error) {
      logActionError("session:delete", error);
    }
  }
  cookieStore.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return NextResponse.json({ ok: true });
}
