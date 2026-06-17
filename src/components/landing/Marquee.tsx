const ITEMS: Array<[string, string]> = [
  ["SPLIT EQUALLY", "var(--color-accent)"],
  ["SETTLE OVER UPI", "var(--color-accent2)"],
  ["SPENDS ANALYTICS", "#ff6fb5"],
  ["PAISE-PERFECT", "#54e0a0"],
  ["WORKS OFFLINE", "#ffc24b"],
  ["SMS REMINDERS", "var(--color-accent)"],
];

function Track({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div
      aria-hidden={ariaHidden || undefined}
      className="flex items-center gap-[30px] pr-[30px] font-display text-[24px] font-semibold text-faint"
    >
      {ITEMS.map(([label, color], i) => (
        <span key={i} className="flex items-center gap-[30px]">
          <span>{label}</span>
          <span style={{ color }}>✦</span>
        </span>
      ))}
    </div>
  );
}

export default function Marquee() {
  return (
    <div className="relative overflow-hidden border-y border-white/[.06] bg-[#0d0c11] py-[22px]">
      <div data-marquee className="flex w-max">
        <Track />
        <Track ariaHidden />
      </div>
    </div>
  );
}
