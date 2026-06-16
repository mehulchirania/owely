import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in - Owely",
};

const GROUPS = [
  { icon: "\u{1F334}", name: "Goa Trip", amount: "+1,240", tone: "text-mint", active: true },
  { icon: "\u{1F3E0}", name: "Flat 4B", amount: "-560", tone: "text-coral", active: false },
  { icon: "\u{1F371}", name: "Office Lunch", amount: "ok", tone: "text-faint", active: false },
];

const EXPENSES = [
  { icon: "\u{1F3E8}", title: "Beach villa", meta: "You paid · split 5 ways", amount: "₹8,400", note: "lent ₹6,720", tone: "text-mint" },
  { icon: "\u{1F37D}\uFE0F", title: "Shack dinner", meta: "You paid · split 3 ways", amount: "₹2,450", note: "lent ₹1,838", tone: "text-mint" },
  { icon: "\u{1F6D2}", title: "Beer & snacks", meta: "Rohan paid · split 5 ways", amount: "₹1,200", note: "owe ₹240", tone: "text-coral" },
];

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-3 py-5 sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-44 left-[10%] h-[440px] w-[440px] rounded-full bg-accent opacity-15 blur-[170px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-180px] right-[6%] h-[420px] w-[420px] rounded-full bg-accent2 opacity-10 blur-[180px]"
      />

      <section className="relative flex min-h-[min(760px,calc(100vh-40px))] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-white/8 bg-ink shadow-[0_40px_120px_-50px_rgba(0,0,0,.95)]">
        <div className="flex h-16 shrink-0 items-center border-b border-white/6 px-5">
          <div className="flex gap-2.5" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-[#ff6b62]" />
            <span className="h-3 w-3 rounded-full bg-cat-yellow" />
            <span className="h-3 w-3 rounded-full bg-mint" />
          </div>
          <div className="mx-auto hidden items-center gap-2 rounded-2xl bg-card px-5 py-2 text-sm text-dim sm:flex">
            <span className="h-2 w-2 rounded-full bg-mint" />
            app.owely.in/login
          </div>
          <div className="w-[60px]" aria-hidden />
        </div>

        <div className="grid flex-1 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden border-r border-white/6 bg-surface px-5 py-8 lg:flex lg:flex-col">
            <Link href="/" className="mb-10 flex items-center gap-4 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-3xl shadow-[0_18px_50px_-18px_var(--color-accent)]">
                {"\u{1F989}"}
              </span>
              <span className="font-display text-3xl font-bold tracking-tight text-hi">owely</span>
            </Link>

            <nav className="flex flex-col gap-4 text-lg text-muted" aria-label="Preview navigation">
              <span className="flex items-center gap-4">
                <HomeIcon />
                Home
              </span>
              <span className="flex items-center gap-4">
                <ClockIcon />
                Activity
              </span>
            </nav>

            <p className="mt-10 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-faint">
              Groups
            </p>
            <div className="mt-5 flex flex-col gap-3">
              {GROUPS.map((group) => (
                <div
                  key={group.name}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${
                    group.active ? "border border-accent/30 bg-card" : ""
                  }`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-elevated text-xl">
                    {group.icon}
                  </span>
                  <span className={`min-w-0 flex-1 truncate ${group.active ? "font-semibold text-hi" : "text-muted"}`}>
                    {group.name}
                  </span>
                  <span className={`font-display text-sm font-semibold ${group.tone}`}>
                    {group.amount}
                  </span>
                </div>
              ))}
            </div>
          </aside>

          <div className="grid min-w-0 gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:p-9">
            <div className="hidden min-w-0 flex-col gap-7 lg:flex">
              <div className="flex items-center gap-5">
                <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-mint/12 text-4xl">
                  {"\u{1F334}"}
                </span>
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-4xl font-bold tracking-tight text-hi">
                    Goa Trip
                  </h1>
                  <div className="mt-2 flex items-center gap-3 text-muted">
                    <AvatarStack />
                    <span>5 members</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <Metric label="Total spent" value="₹14,200" />
                <Metric label="You're owed" value="+₹1,240" accent />
                <Metric label="Expenses" value="12" />
              </div>

              <div className="grid min-h-0 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.9fr)]">
                <section className="min-w-0">
                  <h2 className="font-display text-xl font-semibold text-hi">Recent expenses</h2>
                  <div className="mt-5 flex flex-col gap-3">
                    {EXPENSES.map((expense, index) => (
                      <div
                        key={expense.title}
                        className={`flex items-center gap-4 rounded-2xl px-4 py-4 ${
                          index === 0 ? "border border-white/8 bg-card" : ""
                        }`}
                      >
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-2xl">
                          {expense.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-hi">{expense.title}</p>
                          <p className="truncate text-sm text-dim">{expense.meta}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg font-semibold text-hi">{expense.amount}</p>
                          <p className={`text-sm ${expense.tone}`}>{expense.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="font-display text-xl font-semibold text-hi">Settle up</h2>
                  <div className="mt-5 rounded-3xl border border-white/8 bg-card p-5">
                    <SettlementRow initial="R" name="Rohan owes you" amount="₹820" tone="text-mint" bg="bg-cat-cyan" />
                    <SettlementRow initial="M" name="Meera owes you" amount="₹420" tone="text-mint" bg="bg-cat-yellow" />
                    <div className="my-4 h-px bg-white/8" />
                    <SettlementRow initial="D" name="You owe Aditi" amount="₹560" tone="text-coral" bg="bg-cat-pink" />
                    <div className="mt-5 flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-white">
                      <LockIcon />
                      Pay ₹560 via UPI
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="flex items-center justify-center lg:justify-end">
              <div className="w-full max-w-[390px] rounded-[26px] border border-white/8 bg-surface p-5 shadow-[0_30px_90px_-42px_rgba(0,0,0,.9)] sm:p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <Link href="/" className="mb-5 flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-2xl">
                        {"\u{1F989}"}
                      </span>
                      <span className="font-display text-2xl font-bold tracking-tight text-hi">owely</span>
                    </Link>
                    <h2 className="font-display text-3xl font-bold tracking-tight text-hi">
                      Sign in
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Enter your group dashboard and settle up over UPI.
                    </p>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-3 gap-2">
                  <MiniStat label="owed" value="+₹1.2k" tone="text-mint" />
                  <MiniStat label="spent" value="₹14.2k" tone="text-hi" />
                  <MiniStat label="fees" value="₹0" tone="text-accent2" />
                </div>

                <Suspense
                  fallback={
                    <div className="h-48 w-full animate-pulse rounded-2xl bg-card" />
                  }
                >
                  <LoginForm />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-3xl border bg-card p-6 ${accent ? "border-mint/25" : "border-white/8"}`}>
      <p className={accent ? "text-mint" : "text-dim"}>{label}</p>
      <p className={`mt-3 font-display text-4xl font-bold tracking-tight ${accent ? "text-mint" : "text-hi"}`}>
        {value}
      </p>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-card px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-faint">{label}</p>
      <p className={`mt-1 font-display text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function AvatarStack() {
  const avatars = [
    ["A", "bg-accent text-white"],
    ["D", "bg-cat-pink text-ink"],
    ["R", "bg-cat-cyan text-ink"],
    ["M", "bg-cat-yellow text-ink"],
  ];
  return (
    <span className="flex">
      {avatars.map(([label, classes], index) => (
        <span
          key={label}
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink font-display text-xs font-semibold ${classes} ${index > 0 ? "-ml-2" : ""}`}
        >
          {label}
        </span>
      ))}
      <span className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-elevated font-display text-[10px] text-muted">
        +1
      </span>
    </span>
  );
}

function SettlementRow({ initial, name, amount, tone, bg }: { initial: string; name: string; amount: string; tone: string; bg: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className={`flex h-11 w-11 items-center justify-center rounded-full font-display font-semibold text-ink ${bg}`}>
        {initial}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-strong">{name}</span>
      <span className={`font-display text-sm font-semibold ${tone}`}>{amount}</span>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9v11h13V9" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5l3 2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
