/**
 * Route gate (Next.js 16 `proxy` — formerly `middleware`).
 *
 * Routing concern ONLY: redirect unauthenticated requests for app routes to
 * `/login`, and bounce already-signed-in users away from `/login`. This checks
 * cookie *presence*, not validity — it can't run the Admin SDK on the edge.
 * Real authorization (verifying the session cookie + membership) happens in
 * Server Components and Server Actions via `src/lib/session.ts`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/** Authenticated areas of the app. */
const PROTECTED = ["/groups", "/people", "/settings"];

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/groups";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/groups/:path*", "/people/:path*", "/settings/:path*", "/login"],
};
