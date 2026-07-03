import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections } from "@/lib/firebase/collections";
import { verifyRazorpaySignature, type RazorpayPlan, PLAN_AMOUNT_PAISE } from "@/lib/razorpay";

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
  const amount = entity?.amount as number | undefined;

  if (!uid || !plan || !amount) {
    console.error("[payments/webhook] payment.captured missing uid, plan, or amount");
    return NextResponse.json({ received: true });
  }

  if (amount !== PLAN_AMOUNT_PAISE[plan]) {
    console.error("[payments/webhook] amount mismatch", { plan, amount, expected: PLAN_AMOUNT_PAISE[plan] });
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  const paymentId = entity?.id as string | undefined;
  if (!paymentId) {
    console.error("[payments/webhook] payment missing id");
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
    const db = getAdminDb();
    const eventRef = db.collection(Collections.webhookEvents).doc(paymentId);
    
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(eventRef);
      if (snap.exists) {
        throw new Error("ALREADY_PROCESSED");
      }
      tx.set(eventRef, { processedAt: FieldValue.serverTimestamp(), source: "webhook" });
      tx.update(db.collection(Collections.users).doc(uid), patch);
    });
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY_PROCESSED") {
      return NextResponse.json({ received: true });
    }
    console.error("[payments/webhook] failed to process payment", paymentId, e);
    // Return 500 so Razorpay retries the webhook
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
