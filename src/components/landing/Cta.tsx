import Link from "next/link";

export default function Cta() {
  return (
    <section id="get" className="relative mx-auto mb-[90px] max-w-[1080px] px-5 sm:px-10">
      <div
        data-reveal
        className="relative overflow-hidden rounded-[32px] border border-accent/25 bg-surface px-5 py-[70px] text-center sm:px-10"
      >
        <div aria-hidden className="pointer-events-none absolute -top-[80px] left-1/2 h-[300px] w-[420px] -translate-x-1/2 rounded-full bg-accent opacity-[.28] blur-[110px]" />
        <div className="relative">
          <div
            className="mx-auto mb-[22px] flex h-16 w-16 items-center justify-center rounded-[20px] bg-accent text-[34px]"
            style={{ boxShadow: "0 18px 44px -12px var(--color-accent)" }}
          >
            🦉
          </div>
          <h2 className="mx-auto max-w-[660px] font-display text-[clamp(34px,7vw,50px)] font-bold leading-[1.04] tracking-[-0.02em]">
            Stop chasing friends for money.
          </h2>
          <p className="mx-auto mt-[18px] max-w-[480px] text-[17px] leading-[1.6] text-muted">
            Split your next trip, dinner, or rent in seconds — and settle up the moment it&apos;s over.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-[14px]">
            <Link
              href="/login"
              data-magnet
              className="ow-glowbtn flex h-14 items-center gap-[10px] rounded-2xl bg-accent px-[30px] text-[16px] font-semibold text-white no-underline"
              style={{ boxShadow: "0 16px 40px -12px var(--color-accent)" }}
            >
              Start for free
            </Link>
            <Link
              href="/login"
              data-magnet
              className="ow-softbtn flex h-14 items-center gap-[9px] rounded-2xl border border-white/12 bg-card px-[26px] text-[16px] font-semibold text-hi no-underline"
            >
              For Android &amp; Web
            </Link>
          </div>
          <div className="mt-[22px] text-[13px] text-faint">No credit card · No sign-up wall · Made in India 🇮🇳</div>
        </div>
      </div>
    </section>
  );
}
