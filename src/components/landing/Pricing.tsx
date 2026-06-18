import Link from "next/link";
import { Check } from "./icons";

const FREE = [
  ["100 expenses", " per month"],
  ["Up to 10 people", " per group"],
  ["Spend analytics", ""],
  ["One-tap UPI settle-up", ""],
  ["Smart debt simplification", ""],
] as const;

const TRIP = [
  ["Unlimited expenses", " for 1 group"],
  ["AI receipt scanner", ""],
  ["PDF export", ""],
  ["No monthly commitment", ""],
] as const;

const PRO = [
  ["Unlimited", " expenses"],
  ["Unlimited", " group members"],
  ["SMS reminders", " for payments"],
  ["Everything in Free", ""],
] as const;

function Feature({
  bold,
  rest,
  variant = "free",
}: {
  bold: string;
  rest: string;
  variant?: "free" | "trip" | "pro";
}) {
  const iconBg =
    variant === "pro"
      ? "rgba(139,123,255,.22)"
      : variant === "trip"
        ? "rgba(69,224,200,.2)"
        : "rgba(84,224,160,.16)";
  const iconColor =
    variant === "pro" ? "#b6abff" : variant === "trip" ? "#45e0c8" : "#54e0a0";
  const textCls =
    variant === "pro"
      ? "text-hi"
      : variant === "trip"
        ? "text-[#d4f7f3]"
        : "text-[#e4e1ee]";

  return (
    <div className="flex items-center gap-[11px]">
      <span
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full"
        style={{ background: iconBg }}
      >
        <Check size={13} stroke={iconColor} />
      </span>
      <span className={`text-[14.5px] ${textCls}`}>
        <b className="font-semibold">{bold}</b>
        {rest}
      </span>
    </div>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="relative mx-auto max-w-[1160px] px-5 pb-[30px] pt-[90px] sm:px-10">
      <div data-reveal className="mb-[46px] text-center">
        <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-accent">Pricing</span>
        <h2 className="mx-auto mt-[14px] max-w-[560px] font-display text-[clamp(34px,6vw,46px)] font-bold leading-[1.05] tracking-[-0.02em]">
          Start free. Go Pro when you grow.
        </h2>
      </div>

      <div className="flex flex-wrap items-stretch gap-5">
        {/* FREE */}
        <div data-reveal className="flex min-w-[280px] flex-1 flex-col rounded-[26px] border border-white/8 bg-surface p-[30px]">
          <div className="mb-[6px] flex items-center gap-[10px]">
            <span className="font-display text-[18px] font-semibold">Free</span>
            <span className="rounded-[20px] bg-elevated px-[10px] py-1 text-[11px] font-semibold text-muted">For getting started</span>
          </div>
          <div className="mb-1 mt-[10px] flex items-baseline gap-1">
            <span className="font-display text-[46px] font-bold tracking-[-0.02em]">₹0</span>
            <span className="text-[15px] text-dim">/ month</span>
          </div>
          <p className="mb-[22px] text-[13.5px] text-dim">Everything you need to split with your group.</p>
          <div className="mb-[26px] flex flex-col gap-[13px]">
            {FREE.map(([b, r]) => (
              <Feature key={b + r} bold={b} rest={r} variant="free" />
            ))}
          </div>
        </div>

        {/* TRIP PASS */}
        <div
          data-reveal
          data-delay="80"
          className="relative flex min-w-[280px] flex-1 flex-col overflow-hidden rounded-[26px] border border-accent2/36 p-[30px]"
          style={{ background: "#0e1a19" }}
        >
          <div aria-hidden className="pointer-events-none absolute -right-[30px] -top-[60px] h-[180px] w-[180px] rounded-full bg-accent2 opacity-[.18] blur-[70px]" />
          <div className="relative mb-[6px] flex items-center gap-[10px]">
            <span className="font-display text-[18px] font-semibold">Trip Pass</span>
            <span className="rounded-[20px] bg-accent2/14 px-[10px] py-1 text-[11px] font-semibold text-accent2">One-time</span>
          </div>
          <div className="relative mb-1 mt-[10px] flex items-baseline gap-1">
            <span className="font-display text-[46px] font-bold tracking-[-0.02em]">₹49</span>
            <span className="text-[15px] text-dim">one-time</span>
          </div>
          <p className="relative mb-[22px] text-[13.5px] text-muted">All Pro features for one group. No subscription needed.</p>
          <div className="relative mb-[26px] flex flex-col gap-[13px]">
            {TRIP.map(([b, r]) => (
              <Feature key={b + r} bold={b} rest={r} variant="trip" />
            ))}
          </div>
          <Link
            href="/?login=true"
            data-magnet
            className="relative mt-auto flex h-[50px] items-center justify-center rounded-[15px] border border-accent2/40 bg-accent2/12 text-[14.5px] font-semibold text-accent2 no-underline transition-colors hover:bg-accent2/18"
          >
            Get Trip Pass
          </Link>
        </div>

        {/* PRO */}
        <div
          data-reveal
          data-delay="160"
          className="relative flex min-w-[280px] flex-1 flex-col overflow-hidden rounded-[26px] border border-accent/40 p-[30px]"
          style={{ background: "#13111c" }}
        >
          <div aria-hidden className="pointer-events-none absolute -right-[30px] -top-[70px] h-[200px] w-[200px] rounded-full bg-accent opacity-20 blur-[80px]" />
          <div className="relative mb-[6px] flex items-center gap-[10px]">
            <span className="font-display text-[18px] font-semibold">Pro</span>
            <span className="rounded-[20px] bg-accent px-[10px] py-1 text-[11px] font-semibold text-ink">Most popular</span>
          </div>
          <div className="relative mb-1 mt-[10px] flex items-baseline gap-1">
            <span className="font-display text-[46px] font-bold tracking-[-0.02em]">₹99</span>
            <span className="text-[15px] text-dim">/ month</span>
          </div>
          <p className="relative mb-[22px] text-[13.5px] text-muted">Everything in Free, plus no limits.</p>
          <div className="relative mb-[26px] flex flex-col gap-[13px]">
            {PRO.map(([b, r]) => (
              <Feature key={b + r} bold={b} rest={r} variant="pro" />
            ))}
          </div>
          <Link
            href="/?login=true"
            data-magnet
            className="ow-glowbtn relative mt-auto flex h-[50px] items-center justify-center rounded-[15px] bg-accent text-[14.5px] font-semibold text-ink no-underline"
            style={{ boxShadow: "0 14px 32px -10px var(--color-accent)" }}
          >
            Go Pro
          </Link>
        </div>
      </div>
      <p data-reveal className="mx-auto mt-6 text-center text-[13px] text-faint">
        No transaction fees on either plan · Cancel Pro anytime · Made in India 🇮🇳
      </p>
    </section>
  );
}
