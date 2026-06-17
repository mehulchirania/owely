import { Bolt } from "./icons";

export default function Hero() {
  return (
    <section
      id="top"
      data-hero
      className="relative flex min-h-screen items-center overflow-hidden px-5 pb-20 pt-[128px] sm:px-10 sm:pt-[140px]"
    >
      <div data-drift="1" aria-hidden className="pointer-events-none absolute -left-[60px] -top-[120px] h-[560px] w-[560px] rounded-full bg-accent opacity-[.22] blur-[170px]" />
      <div data-drift="2" aria-hidden className="pointer-events-none absolute -right-[100px] top-[200px] h-[520px] w-[520px] rounded-full bg-accent2 opacity-[.16] blur-[180px]" />
      <div
        data-spotlight
        aria-hidden
        className="pointer-events-none absolute h-[480px] w-[480px] rounded-full"
        style={{
          background: "radial-gradient(circle,rgba(139,123,255,.1),transparent 65%)",
          transform: "translate(-50%,-50%)",
          left: "-9999px",
          top: "-9999px",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-10">
        <div className="min-w-0 max-w-[600px] flex-1 basis-[340px]">
          <div data-in className="mb-[26px] inline-flex items-center gap-[9px] rounded-[30px] border border-white/8 bg-card px-[15px] py-2">
            <span data-pulse className="h-2 w-2 rounded-full bg-mint" />
            <span className="text-[13px] font-medium text-strong">India-first expense splitting 🦉</span>
          </div>
          <h1
            className="font-display font-bold tracking-[-0.03em]"
            style={{ fontSize: "clamp(44px,8.5vw,74px)", lineHeight: 0.98, margin: 0 }}
          >
            <span className="block">Split anything.</span>
            <span className="block">
              Settle in <span style={{ color: "var(--color-accent)" }}>one tap</span>.
            </span>
          </h1>
          <p className="mt-[26px] max-w-[480px] text-[18px] leading-[1.6] text-muted">
            Owely splits group bills to the exact paise and settles them over UPI — no chasing
            friends, no awkward math. Just square up and stay friends.
          </p>
          <div data-in className="mt-[30px] flex items-center gap-4">
            <div className="flex">
              <Avatar bg="var(--color-accent)" color="#fff">A</Avatar>
              <Avatar bg="#ff6fb5" color="#100f15" overlap>D</Avatar>
              <Avatar bg="#45d0e0" color="#100f15" overlap>R</Avatar>
              <Avatar bg="#ffc24b" color="#100f15" overlap>M</Avatar>
            </div>
            <span className="text-[13.5px] text-dim">Free plan · UPI-native · Made in India 🇮🇳</span>
          </div>
        </div>

        {/* right visual */}
        <div data-fadein className="relative flex flex-1 basis-[360px] justify-center">
          <div className="relative h-[600px] w-[300px]">
            <div data-float="14" className="absolute inset-0 z-[2] transition-transform duration-300">
              <div
                data-floatloop="A"
                className="flex h-[600px] w-[300px] flex-col overflow-hidden rounded-[42px] border border-white/8 bg-surface"
                style={{ boxShadow: "0 60px 110px -30px rgba(0,0,0,.85),0 0 0 7px #050507" }}
              >
                <div className="flex h-[44px] items-center justify-between px-6 pt-[14px]">
                  <span className="font-display text-[13px] font-semibold">9:41</span>
                  <span className="font-display text-[10px] text-muted">5G</span>
                </div>
                <div className="flex-1 px-[18px] py-[14px]">
                  <div className="mb-[14px] flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-dim">Goa Trip 🌴</div>
                      <div className="font-display text-[16px] font-bold">Balances</div>
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent font-display text-[13px] font-semibold text-white">A</span>
                  </div>
                  <div className="mb-[11px] rounded-[18px] border border-accent/20 bg-card p-[15px]">
                    <div className="text-[11px] text-muted">You&apos;re owed</div>
                    <div className="mt-[3px] font-display text-[30px] font-bold text-mint">+₹1,240</div>
                  </div>
                  <OwedRow bg="#45d0e0" name="Rohan owes you" amount="₹820">R</OwedRow>
                  <OwedRow bg="#ffc24b" name="Meera owes you" amount="₹420">M</OwedRow>
                  <div className="mt-[11px] flex h-[44px] items-center justify-center rounded-[13px] bg-accent text-[13.5px] font-semibold text-white">
                    Settle up
                  </div>
                </div>
              </div>
            </div>

            <div data-float="40" className="absolute -left-[86px] -top-[26px] z-[3] transition-transform duration-300">
              <div data-floatloop="A" className="flex items-center gap-[11px] rounded-2xl border border-white/10 bg-card px-[15px] py-3" style={{ boxShadow: "0 24px 50px -16px rgba(0,0,0,.7)" }}>
                <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] text-[19px]" style={{ background: "rgba(255,138,91,.16)" }}>🍽️</span>
                <div>
                  <div className="text-[13px] font-semibold">Beach dinner</div>
                  <div className="text-[11px] text-dim">You paid · ₹2,450</div>
                </div>
              </div>
            </div>

            <div data-float="52" className="absolute -right-[96px] bottom-[48px] z-[3] transition-transform duration-300">
              <div data-floatloop="B" className="flex items-center gap-[11px] rounded-2xl border border-accent2/25 bg-card px-[15px] py-3" style={{ boxShadow: "0 24px 50px -16px rgba(0,0,0,.7)" }}>
                <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px]" style={{ background: "rgba(69,224,200,.16)" }}>
                  <Bolt size={20} />
                </span>
                <div>
                  <div className="text-[13px] font-semibold text-accent2">Paid via UPI</div>
                  <div className="text-[11px] text-dim">₹560 · settled ✓</div>
                </div>
              </div>
            </div>

            <div data-float="30" className="absolute -right-[70px] top-[188px] z-[1] transition-transform duration-300">
              <div data-floatloop="C" className="rounded-[14px] bg-accent px-[14px] py-[10px]" style={{ boxShadow: "0 24px 50px -16px var(--color-accent)", transform: "rotate(-3deg)" }}>
                <div className="font-display text-[15px] font-bold text-white">8 → 3</div>
                <div className="text-[10px]" style={{ color: "rgba(255,255,255,.85)" }}>debts simplified</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Avatar({ children, bg, color, overlap = false }: { children: string; bg: string; color: string; overlap?: boolean }) {
  return (
    <span
      className={`flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-ink font-display text-[13px] font-semibold ${overlap ? "-ml-[9px]" : ""}`}
      style={{ background: bg, color }}
    >
      {children}
    </span>
  );
}

function OwedRow({ children, bg, name, amount }: { children: string; bg: string; name: string; amount: string }) {
  return (
    <div className="mb-2 flex items-center gap-[10px] rounded-[14px] bg-card p-[10px]">
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full font-display text-[12px] font-semibold text-[#100f15]" style={{ background: bg }}>
        {children}
      </span>
      <span className="flex-1 text-[12.5px] text-strong">{name}</span>
      <span className="font-display text-[13px] font-semibold text-mint">{amount}</span>
    </div>
  );
}
