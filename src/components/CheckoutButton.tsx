"use client";

import { useState } from "react";
import type { RazorpayPlan } from "@/lib/razorpay";

// Minimal Razorpay Web SDK types — the real SDK is loaded at runtime from CDN
interface RzpOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  theme: { color: string };
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string }) => void;
  modal?: { ondismiss?: () => void };
}
interface RzpInstance {
  open(): void;
  on(event: string, cb: (response: { error: { description: string } }) => void): void;
}
declare global {
  interface Window {
    Razorpay: new (opts: RzpOptions) => RzpInstance;
  }
}

function loadRazorpayScript(): Promise<void> {
  const SRC = "https://checkout.razorpay.com/v1/checkout.js";
  if (document.querySelector(`script[src="${SRC}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

const PLAN_META: Record<RazorpayPlan, { description: string }> = {
  pro_monthly: { description: "Owely Pro — ₹99/mo" },
  trip_pass: { description: "Trip Pass — ₹49 one-time" },
};

interface Props {
  plan: RazorpayPlan;
  label: string;
  className?: string;
}

export function CheckoutButton({ plan, label, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setError((data.error as string) ?? "Payment unavailable. Try again later.");
        return;
      }

      await loadRazorpayScript();

      const rzp = new window.Razorpay({
        key: data.keyId as string,
        amount: data.amount as number,
        currency: data.currency as string,
        order_id: data.orderId as string,
        name: "Owely",
        description: PLAN_META[plan].description,
        theme: { color: "#8b7bff" },
        handler: () => {
          // Webhook handles tier upgrade asynchronously; redirect to settings
          // where the user will see their updated plan once the webhook fires.
          window.location.href = "/settings?upgraded=1";
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });
      rzp.on("payment.failed", (r) => {
        setError(r.error.description ?? "Payment failed. Please try again.");
        setLoading(false);
      });
      rzp.open();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className}
      >
        {loading ? "Loading…" : label}
      </button>
      {error && (
        <span role="alert" className="text-[11px] text-coral-soft">
          {error}
        </span>
      )}
    </span>
  );
}
