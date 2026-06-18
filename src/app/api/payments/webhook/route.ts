import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections } from "@/lib/firebase/collections";
import { verifyRazorpaySignature, type RazorpayPlan } from "@/lib/razorpay";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyRazorpaySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only handle payment.captured — all other event types are acknowledged and ignored
  if (event.event !== "payment.captured") {
    return NextResponse.json({ received: true });
  }

  const entity = (
    (event.payload as Record<string, unknown>)?.payment as Record<string, unknown>
  )?.entity as Record<string, unknown> | undefined;

  const notes = entity?.notes as Record<string, string> | undefined;
  const uid = notes?.uid;
  const plan = notes?.plan as RazorpayPlan | undefined;

  if (!uid) {
    console.error("[payments/webhook] payment.captured missing uid in order notes");
    return NextResponse.json({ received: true });
  }

  const patch: Record<string, unknown> = {
    tier: "paid",
    tierUpgradedAt: FieldValue.serverTimestamp(),
  };

  // Trip Pass: 30-day access window. The entitlements check can enforce expiry
  // by comparing tripPassExpiresAt against the current timestamp once billing
  // supports auto-renewal or explicit expiry enforcement is added.
  if (plan === "trip_pass") {
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    patch.tripPassExpiresAt = expiresAt;
  }

  try {
    await getAdminDb().collection(Collections.users).doc(uid).update(patch);
  } catch (e) {
    console.error("[payments/webhook] failed to update user tier", uid, e);
    // Return 500 so Razorpay retries the webhook
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
