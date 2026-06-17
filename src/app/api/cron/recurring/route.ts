/**
 * Scheduled trigger for recurring-expense generation. Point Cloud Scheduler (or
 * any cron) at `POST /api/cron/recurring` once a day with the shared secret:
 *
 *   Authorization: Bearer <CRON_SECRET>
 *
 * The generator is idempotent, so running daily (and catching up missed days)
 * is safe. Not a Server Action — it's an unauthenticated endpoint protected by
 * the secret, since the caller is a machine, not a signed-in user.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { generateDueRecurring } from "@/lib/recurring";
import { logActionError } from "@/lib/log";

/** Constant-time compare for the shared cron secret. */
function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  }
  const header = request.headers.get("authorization");
  const provided = header?.startsWith("Bearer ")
    ? header.slice(7)
    : request.headers.get("x-cron-secret");
  if (!secretMatches(provided ?? null, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await generateDueRecurring();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logActionError("cron:recurring", error);
    return NextResponse.json({ error: "Generation failed." }, { status: 500 });
  }
}
