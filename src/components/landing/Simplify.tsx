import { Check } from "./icons";

/** Node positions for the 5-person debt graph (shared by before/after). */
const NODES = [
  { key: "A", style: { top: 18, left: "50%", transform: "translateX(-50%)" }, bg: "var(--color-accent)", color: "#fff" },
  { key: "D", style: { top: 76, right: 6 }, bg: "#ff6fb5", color: "#100f15" },
  { key: "R", style: { bottom: 18, right: 48 }, bg: "#45d0e0", color: "#100f15" },
  { key: "M", style: { bottom: 18, left: 42 }, bg: "#ffc24b", color: "#100f15" },
  { key: "K", style: { top: 76, left: 6 }, bg: "#54e0a0", color: "#100f15" },
] as const;

const BEFORE_EDGES = [
  [110, 34, 186, 92], [110, 34, 158, 180], [186, 92, 158, 180], [186, 92, 62, 180],
  [158, 180, 34, 92], [62, 180, 34, 92], [34, 92, 110, 34], [62, 180, 110, 34],
];
const AFTER_EDGES = [
  [158, 180, 110, 34], [62, 180, 110, 34], [34, 92, 110, 34],
];

function Node({ k, dimmed, ring }: { k: (typeof NODES)[number]; dimmed?: boolean; ring?: boolean }) {
  return (
    <div
      className="absolute flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-surface font-display text-[13px] font-semibold"
      style={{
        ...k.style,
        background: k.bg,
        color: k.color,
        opacity: dimmed ? 0.4 : 1,
        boxShadow: ring ? "0 0 0 5px rgba(139,123,255,.18)" : undefined,
      }}
    >
      {k.key}
    </div>
  );
}

function Graph({ edges, stroke, width, after }: { edges: number[][]; stroke: string; width: number; after?: boolean }) {
  return (
    <div className="relative h-[230px] w-full">
      <svg viewBox="0 0 220 220" className="absolute inset-0 h-full w-full">
        {edges.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={width} strokeLinecap="round" />
        ))}
      </svg>
      {NODES.map((n) => (
        <Node key={n.key} k={n} dimmed={after && n.key === "D"} ring={after && n.key === "A"} />
      ))}
    </div>
  );
}

export default function Simplify() {
  return (
    <section id="simplify" className="relative overflow-hidden border-y border-white/[.06] bg-[#0d0c11]">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-[60px] px-5 py-[110px] sm:px-10">
        <div data-reveal className="min-w-[320px] max-w-[480px] flex-1">
          <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-accent">The magic</span>
          <h2 className="my-[14px] mb-[18px] font-display text-[clamp(32px,6vw,44px)] font-bold leading-[1.06] tracking-[-0.02em]">
            Five friends. Eight debts. Three payments.
          </h2>
          <p className="mb-[26px] text-[16px] leading-[1.65] text-muted">
            When everyone owes everyone, settling up is a mess. Owely untangles the web into the
            fewest possible transfers — so each person sends at most one payment.
          </p>
          <div className="flex flex-col gap-3">
            {[
              "Net balances computed to the paise",
              "Minimum-cashflow transfer plan",
              "Recomputed live on every expense",
            ].map((t) => (
              <div key={t} className="flex items-center gap-[11px]">
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg" style={{ background: "rgba(84,224,160,.16)" }}>
                  <Check size={15} width={3} />
                </span>
                <span className="text-[14.5px] text-strong">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div data-reveal className="flex min-w-[340px] flex-1 flex-wrap items-stretch justify-center gap-[18px]">
          <div className="min-w-[230px] flex-1 rounded-[22px] border border-white/[.06] bg-surface p-5">
            <div className="mb-[6px] flex items-center justify-between">
              <span className="text-[12.5px] text-dim">Before</span>
              <span className="rounded-[20px] px-[9px] py-1 text-[11px] font-semibold text-coral" style={{ background: "rgba(255,122,138,.12)" }}>8 payments</span>
            </div>
            <Graph edges={BEFORE_EDGES} stroke="#3a3748" width={2} />
          </div>
          <div className="min-w-[230px] flex-1 rounded-[22px] border border-accent/[.22] bg-surface p-5">
            <div className="mb-[6px] flex items-center justify-between">
              <span className="text-[12.5px] text-dim">After Owely</span>
              <span className="rounded-[20px] px-[9px] py-1 text-[11px] font-semibold text-mint" style={{ background: "rgba(84,224,160,.12)" }}>3 payments</span>
            </div>
            <Graph edges={AFTER_EDGES} stroke="var(--color-accent)" width={3} after />
          </div>
        </div>
      </div>
    </section>
  );
}
