import { NextResponse } from "next/server";
import { getSessionUser } from "@/features/auth/session";
import {
  createRazorpayOrder,
  isRazorpayConfigured,
  PLAN_AMOUNT_PAISE,
  type RazorpayPlan,
} from "@/lib/razorpay";

const VALID_PLANS = Object.keys(PLAN_AMOUNT_PAISE) as RazorpayPlan[];

export async function POST(req: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Payment gateway not configured yet." },
      { status: 503 },
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const plan = (body as Record<string, unknown>)?.plan as string | undefined;
  if (!plan || !VALID_PLANS.includes(plan as RazorpayPlan)) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  try {
    const order = await createRazorpayOrder(user.uid, plan as RazorpayPlan);
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (e) {
    console.error("[payments/create-order]", e);
    return NextResponse.json({ error: "Could not create payment order." }, { status: 500 });
  }
}
