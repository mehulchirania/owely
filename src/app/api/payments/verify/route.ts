import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections } from "@/lib/firebase/collections";
import { getSessionUser } from "@/features/auth/session";
import { isRazorpayConfigured, type RazorpayPlan } from "@/lib/razorpay";
import crypto from "crypto";

export async function POST(req: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Payment gateway not configured yet." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  let isValid = false;
  try {
    isValid = crypto.timingSafeEqual(Buffer.from(expectedSignature, "hex"), Buffer.from(razorpay_signature, "hex"));
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Fetch the payment from Razorpay to verify notes and avoid forged requests
  // pointing to another user's valid payment.
  const keyId = process.env.RAZORPAY_KEY_ID!;
  const authHeader = `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`;
  
  let paymentRes: Response;
  try {
    paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { Authorization: authHeader }
    });
  } catch (e) {
    console.error("[payments/verify] Razorpay API unreachable", e);
    return NextResponse.json({ error: "Could not fetch payment details." }, { status: 502 });
  }
  
  if (!paymentRes.ok) {
     return NextResponse.json({ error: "Could not fetch payment" }, { status: 500 });
  }
  
  let paymentData: Record<string, unknown>;
  try {
    paymentData = await paymentRes.json();
  } catch {
    return NextResponse.json({ error: "Invalid response from Razorpay" }, { status: 500 });
  }

  const notes = paymentData.notes as Record<string, string> | undefined;
  const uid = notes?.uid;
  const plan = notes?.plan as RazorpayPlan | undefined;
  
  if (uid !== user.uid) {
     return NextResponse.json({ error: "Payment belongs to a different user." }, { status: 403 });
  }
  
  if (paymentData.status !== "captured") {
     return NextResponse.json({ error: "Payment not captured." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    tier: "paid",
    tierUpgradedAt: FieldValue.serverTimestamp(),
  };

  if (plan === "trip_pass") {
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    patch.tripPassExpiresAt = expiresAt;
  }

  try {
    const db = getAdminDb();
    const eventRef = db.collection(Collections.webhookEvents).doc(razorpay_payment_id);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(eventRef);
      if (!snap.exists) {
        tx.set(eventRef, { processedAt: FieldValue.serverTimestamp(), source: "verify" });
        tx.update(db.collection(Collections.users).doc(user.uid), patch);
      }
    });
  } catch (e) {
    console.error("[payments/verify] failed to process verification", user.uid, e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
