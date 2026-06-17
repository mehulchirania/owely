const STEPS = [
  {
    n: "01",
    emoji: "👥",
    tint: "rgba(139,123,255,.16)",
    hov: "rgba(139,123,255,.35)",
    title: "Create a group",
    body: "Trip, flat, or friends. Invite by phone number — no app install required to be added.",
    delay: 0,
  },
  {
    n: "02",
    emoji: "🧮",
    tint: "rgba(69,224,200,.16)",
    hov: "rgba(69,224,200,.35)",
    title: "Add expenses",
    body: "Split equally, unequally or by percentage. Owely reconciles to the exact paise — no rounding leaks.",
    delay: 120,
  },
  {
    n: "03",
    emoji: "⚡",
    tint: "rgba(84,224,160,.16)",
    hov: "rgba(84,224,160,.35)",
    title: "Settle over UPI",
    body: "One tap opens your UPI app pre-filled. Pay, mark it done, and you're square — peer to peer.",
    delay: 240,
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative mx-auto max-w-[1280px] px-5 py-[120px] sm:px-10">
      <div data-reveal className="mb-[60px]">
        <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-accent">
          How it works
        </span>
        <h2 className="mt-[14px] max-w-[620px] font-display text-[clamp(34px,6vw,46px)] font-bold leading-[1.05] tracking-[-0.02em]">
          From shared bill to settled up — in three taps.
        </h2>
      </div>
      <div className="flex flex-wrap gap-[22px]">
        {STEPS.map((s) => (
          <div
            key={s.n}
            data-reveal
            data-delay={s.delay}
            className="ow-hovcard min-w-[280px] flex-1 rounded-3xl border border-white/[.06] bg-surface p-[30px]"
            style={{ "--ow-hov": s.hov } as React.CSSProperties}
          >
            <div className="font-display text-[54px] font-bold leading-none text-segment">{s.n}</div>
            <div
              className="my-[18px] mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-[15px] text-[26px]"
              style={{ background: s.tint }}
            >
              {s.emoji}
            </div>
            <h3 className="mb-2 font-display text-[20px] font-semibold">{s.title}</h3>
            <p className="text-[14.5px] leading-[1.6] text-muted">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
