import { Bolt, ArrowRight } from "./icons";

export default function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-[1280px] px-5 pb-[110px] pt-10 sm:px-10">
      <div data-reveal className="mb-[46px]">
        <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-accent2">
          Why Owely
        </span>
        <h2 className="mt-[14px] max-w-[620px] font-display text-[clamp(34px,6vw,46px)] font-bold leading-[1.05] tracking-[-0.02em]">
          Everything you need. Nothing you&apos;ll pay for.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-6">
        {/* Debt simplification — wide */}
        <div
          data-reveal
          className="ow-hovborder relative overflow-hidden rounded-3xl border border-white/[.06] bg-surface p-8 md:col-span-4"
          style={{ "--ow-hov": "rgba(139,123,255,.3)" } as React.CSSProperties}
        >
          <div className="mb-[10px] flex items-center gap-[10px]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl text-[20px]" style={{ background: "rgba(139,123,255,.16)" }}>🪄</span>
            <span className="rounded-[20px] px-[11px] py-[5px] text-[12px] font-semibold text-accent" style={{ background: "rgba(139,123,255,.12)" }}>
              Smart debt simplification
            </span>
          </div>
          <h3 className="my-2 font-display text-[24px] font-semibold">Fewer payments, less awkwardness.</h3>
          <p className="mb-[22px] max-w-[430px] text-[14.5px] leading-[1.6] text-muted">
            Owely nets everyone out and finds the minimum set of transfers. No more five people
            paying each other in circles.
          </p>
          <div className="flex items-center gap-[14px]">
            <div className="flex items-center gap-2 rounded-[14px] border border-white/[.06] bg-card px-4 py-3">
              <span className="font-display text-[24px] font-bold text-coral">8</span>
              <span className="text-[12px] leading-[1.2] text-dim">tangled<br />debts</span>
            </div>
            <span className="text-accent"><ArrowRight size={28} width={2} /></span>
            <div className="flex items-center gap-2 rounded-[14px] border border-mint/25 px-4 py-3" style={{ background: "rgba(84,224,160,.1)" }}>
              <span className="font-display text-[24px] font-bold text-mint">3</span>
              <span className="text-[12px] leading-[1.2] text-mint-soft">clean<br />transfers</span>
            </div>
          </div>
          <div aria-hidden className="pointer-events-none absolute -right-[30px] -top-[50px] h-[180px] w-[180px] rounded-full bg-accent opacity-[.16] blur-[70px]" />
        </div>

        <SmallCard span hov="rgba(69,224,200,.3)" iconBg="rgba(69,224,200,.16)" delay={80} title="One-tap UPI settle" body="Pay directly via your UPI app. Owely never holds your money — it's fully peer to peer." icon={<Bolt size={24} />} />
        <SmallCard span hov="rgba(255,111,181,.3)" iconBg="rgba(255,111,181,.14)" delay={0} title="Split any way" body="Equal, unequal, or by percentage — always reconciled to the paise." emoji="🧾" />
        <SmallCard span hov="rgba(255,194,75,.3)" iconBg="rgba(255,194,75,.14)" delay={120} title="Works offline" body="Add expenses on patchy networks. Everything syncs the moment you're back online." emoji="📶" />

        {/* Spends analytics — accent fill */}
        <div data-reveal data-delay="200" className="relative overflow-hidden rounded-3xl bg-accent p-7 md:col-span-2">
          <div className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-[13px] text-[23px]" style={{ background: "rgba(255,255,255,.18)" }}>📊</div>
          <h3 className="mb-2 font-display text-[19px] font-semibold text-white">Spends analytics</h3>
          <p className="text-[14px] leading-[1.6]" style={{ color: "rgba(255,255,255,.88)" }}>
            See exactly where your money goes — by category, person and group. Free on every plan.
          </p>
        </div>
      </div>
    </section>
  );
}

function SmallCard({
  hov,
  iconBg,
  delay,
  title,
  body,
  emoji,
  icon,
  span,
}: {
  hov: string;
  iconBg: string;
  delay: number;
  title: string;
  body: string;
  emoji?: string;
  icon?: React.ReactNode;
  span?: boolean;
}) {
  return (
    <div
      data-reveal
      data-delay={delay}
      className={`ow-hovborder rounded-3xl border border-white/[.06] bg-surface p-7 ${span ? "md:col-span-2" : ""}`}
      style={{ "--ow-hov": hov } as React.CSSProperties}
    >
      <div className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-[13px] text-[23px]" style={{ background: iconBg }}>
        {emoji ?? icon}
      </div>
      <h3 className="mb-2 font-display text-[19px] font-semibold">{title}</h3>
      <p className="text-[14px] leading-[1.6] text-muted">{body}</p>
    </div>
  );
}
