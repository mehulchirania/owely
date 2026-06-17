type Stat = {
  count?: number;
  suffix?: string;
  literal?: string;
  label: string;
  color?: string;
};

const STATS: Stat[] = [
  { count: 100, label: "free expenses / month", color: "var(--color-mint)" },
  { count: 10, label: "people per group, free" },
  { literal: "∞", label: "expenses & members on Pro", color: "var(--color-accent)" },
  { count: 3, suffix: " taps", label: "to settle a debt", color: "#ffc24b" },
];

export default function ValueBand() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-[90px] sm:px-10">
      <div data-reveal className="flex flex-wrap gap-[18px] text-center">
        {STATS.map((s) => (
          <div key={s.label} className="min-w-[200px] flex-1 rounded-[22px] border border-white/[.06] bg-surface px-5 py-[34px]">
            <div className="font-display text-[48px] font-bold tracking-[-0.02em]" style={{ color: s.color }}>
              {s.literal ?? (
                <span data-count={s.count} data-suffix={s.suffix}>
                  0
                </span>
              )}
            </div>
            <div className="mt-[6px] text-[14px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
