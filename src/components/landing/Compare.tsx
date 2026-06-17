import { Check, Cross } from "./icons";

const ROWS = [
  { label: "Settle up over UPI in one tap", us: "Built in", them: "Manual" },
  { label: "Smart debt simplification", us: "Free", them: "Paywalled" },
  { label: "Paise-perfect splits", us: "Always", them: "Rounds off" },
  { label: "Spends analytics", us: "Free", them: "Paid add-on" },
  { label: "Works offline", us: "Yes", them: "No" },
  { label: "No ads, no data selling", us: "Always", them: "Shows ads" },
  { label: "Generous free tier", us: "100/mo · 10 ppl", them: "Tight caps" },
];

const GRID = "grid grid-cols-[1.6fr_1fr_1fr]";

export default function Compare() {
  return (
    <section id="compare" className="relative mx-auto max-w-[1180px] px-5 pb-[30px] pt-[110px] sm:px-10">
      <div data-reveal className="mb-12 text-center">
        <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-accent2">
          Owely vs the rest
        </span>
        <h2 className="mx-auto mt-[14px] max-w-[640px] font-display text-[clamp(34px,6vw,46px)] font-bold leading-[1.05] tracking-[-0.02em]">
          What we do differently.
        </h2>
        <p className="mx-auto mt-4 max-w-[480px] text-[16px] leading-[1.6] text-muted">
          Other split apps make you pay to settle, round off the paise, and bury you in ads. Owely
          doesn&apos;t.
        </p>
      </div>

      <div data-reveal className="overflow-hidden rounded-3xl border border-white/8 bg-surface">
        {/* header row */}
        <div className={`${GRID} items-stretch`}>
          <div className="px-6 py-5" />
          <div
            className="px-4 py-[18px] text-center"
            style={{
              background: "rgba(139,123,255,.1)",
              borderBottom: "1px solid rgba(139,123,255,.25)",
              borderLeft: "1px solid rgba(139,123,255,.2)",
              borderRight: "1px solid rgba(139,123,255,.2)",
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-accent text-[15px]">🦉</span>
              <span className="font-display text-[17px] font-bold">Owely</span>
            </div>
          </div>
          <div className="border-b border-white/[.06] px-4 py-[18px] text-center">
            <span className="font-display text-[15px] font-semibold text-dim">Other apps</span>
          </div>
        </div>

        {/* rows */}
        {ROWS.map((row) => (
          <div key={row.label} className={`${GRID} items-center border-t border-white/[.05]`}>
            <div className="px-6 py-[17px] text-[14.5px] font-medium text-[#e4e1ee]">{row.label}</div>
            <div
              className="flex items-center justify-center gap-[7px] px-4 py-[17px]"
              style={{
                background: "rgba(139,123,255,.06)",
                borderLeft: "1px solid rgba(139,123,255,.16)",
                borderRight: "1px solid rgba(139,123,255,.16)",
              }}
            >
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full" style={{ background: "rgba(84,224,160,.16)" }}>
                <Check size={13} />
              </span>
              <span className="text-[12.5px] font-semibold text-mint">{row.us}</span>
            </div>
            <div className="flex items-center justify-center gap-[7px] px-4 py-[17px]">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full" style={{ background: "rgba(255,122,138,.12)" }}>
                <Cross size={12} />
              </span>
              <span className="text-[12.5px] text-dim">{row.them}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
