import "server-only";
import crypto from "node:crypto";

export type RazorpayPlan = "pro_monthly" | "trip_pass";

export const PLAN_AMOUNT_PAISE: Record<RazorpayPlan, number> = {
  pro_monthly: 9900,
  trip_pass: 4900,
};

export const PLAN_LABEL: Record<RazorpayPlan, string> = {
  pro_monthly: "Owely Pro — ₹99/mo",
  trip_pass: "Trip Pass — ₹49",
};

export function isRazorpayConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

export async function createRazorpayOrder(
  uid: string,
  plan: RazorpayPlan,
): Promise<RazorpayOrder> {
  const keyId = process.env.RAZORPAY_KEY_ID!;
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: PLAN_AMOUNT_PAISE[plan],
      currency: "INR",
      receipt: `owely_${plan}_${Date.now()}`,
      notes: { uid, plan },
    }),
  });
  if (!res.ok) {
    throw new Error(`Razorpay order failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<RazorpayOrder>;
}

export function verifyRazorpaySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}
