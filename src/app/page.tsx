import Link from "next/link";

const GROUPS = [
  { icon: "\u{1F334}", name: "Goa Trip", amount: "+1,240", tone: "text-mint", active: true },
  { icon: "\u{1F3E0}", name: "Flat 4B", amount: "-560", tone: "text-coral", active: false },
  { icon: "\u{1F371}", name: "Office Lunch", amount: "ok", tone: "text-faint", active: false },
  { icon: "\u{1F389}", name: "Weekend Squad", amount: "+680", tone: "text-mint", active: false },
];

const EXPENSES = [
  { icon: "\u{1F3E8}", title: "Beach villa · 2 nights", meta: "You paid · split 5 ways", amount: "₹8,400", note: "you lent ₹6,720", tone: "text-mint" },
  { icon: "\u{1F37D}\uFE0F", title: "Beach shack dinner", meta: "You paid · split 3 ways", amount: "₹2,450", note: "you lent ₹1,838", tone: "text-mint" },
  { icon: "\u{1F6D2}", title: "Beer & snacks", meta: "Rohan paid · split 5 ways", amount: "₹1,200", note: "you owe ₹240", tone: "text-coral" },
  { icon: "\u{1F695}", title: "Cab to airport", meta: "Meera paid · split 5 ways", amount: "₹680", note: "you owe ₹136", tone: "text-coral" },
];

export default function Home() {
  return (
    <main className="relative flex flex-1 overflow-hidden px-3 py-5 sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-44 left-[9%] h-[480px] w-[480px] rounded-full bg-accent opacity-16 blur-[180px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-180px] right-[4%] h-[460px] w-[460px] rounded-full bg-accent2 opacity-10 blur-[190px]"
      />

      <section className="relative mx-auto flex min-h-[min(820px,calc(100vh-40px))] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-white/8 bg-ink shadow-[0_44px_140px_-54px_rgba(0,0,0,.95)]">
        <div className="flex h-16 shrink-0 items-center border-b border-white/6 px-5">
          <div className="flex gap-2.5" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-[#ff6b62]" />
            <span className="h-3 w-3 rounded-full bg-cat-yellow" />
            <span className="h-3 w-3 rounded-full bg-mint" />
          </div>
          <div className="mx-auto hidden items-center gap-2 rounded-2xl bg-card px-5 py-2 text-sm text-dim sm:flex">
            <span className="h-2 w-2 rounded-full bg-mint" />
            app.owely.in
          </div>
          <Link
            href="/login"
            className="hidden h-10 items-center rounded-xl border border-white/8 px-4 text-sm font-semibold text-strong transition-colors hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex"
          >
            Sign in
          </Link>
        </div>

        <div className="grid flex-1 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden border-r border-white/6 bg-surface px-5 py-8 lg:flex lg:flex-col">
            <div className="mb-10 flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-3xl shadow-[0_18px_50px_-18px_var(--color-accent)]">
                {"\u{1F989}"}
              </span>
              <span className="font-display text-3xl font-bold tracking-tight text-hi">owely</span>
            </div>

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

          <div className="relative min-w-0">
            <div className="grid min-h-full gap-7 p-4 sm:p-6 lg:p-9 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
              <div className="min-w-0">
                <div className="flex flex-col gap-6 border-b border-white/6 pb-8 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-5">
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-mint/12 text-4xl">
                      {"\u{1F334}"}
                    </span>
                    <div className="min-w-0">
                      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-accent2">
                        India-first expense splitting
                      </p>
                      <h1 className="font-display text-4xl font-bold tracking-tight text-hi sm:text-5xl">
                        owely
                      </h1>
                      <p className="mt-3 max-w-xl text-base leading-7 text-muted sm:text-lg">
                        Split group bills, see who owes whom, and settle directly over UPI.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                    <Link
                      href="/login"
                      className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-accent px-6 font-semibold text-white shadow-[0_18px_44px_-18px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <PlusIcon />
                      Get started
                    </Link>
                    <a
                      href="#preview"
                      className="flex h-13 items-center justify-center rounded-2xl border border-white/8 px-6 font-semibold text-strong transition-colors hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      View flow
                    </a>
                  </div>
                </div>

                <div id="preview" className="mt-7 grid gap-4 md:grid-cols-3">
                  <Metric label="Total spent" value="₹14,200" />
                  <Metric label="You're owed" value="+₹1,240" accent />
                  <Metric label="Expenses" value="12" />
                </div>

                <section className="mt-8 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="font-display text-xl font-semibold text-hi">Recent expenses</h2>
                    <span className="hidden rounded-full bg-accent2/10 px-3 py-1 text-xs font-semibold text-accent2 sm:inline">
                      8 debts simplified into 3 transfers
                    </span>
                  </div>
                  <div className="mt-5 flex flex-col gap-3">
                    {EXPENSES.map((expense, index) => (
                      <div
                        key={expense.title}
                        className={`flex items-center gap-4 rounded-2xl px-3 py-3 sm:px-4 sm:py-4 ${
                          index === 0 ? "border border-white/8 bg-card" : ""
                        }`}
                      >
                        <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-2xl">
                          {expense.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-hi">{expense.title}</p>
                          <p className="truncate text-sm text-dim">{expense.meta}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-display text-base font-semibold text-hi sm:text-lg">{expense.amount}</p>
                          <p className={`text-xs sm:text-sm ${expense.tone}`}>{expense.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-6">
                <section className="rounded-3xl border border-white/8 bg-card p-5">
                  <h2 className="font-display text-xl font-semibold text-hi">Settle up</h2>
                  <div className="mt-5">
                    <SettlementRow initial="R" name="Rohan owes you" amount="₹820" tone="text-mint" bg="bg-cat-cyan" />
                    <SettlementRow initial="M" name="Meera owes you" amount="₹420" tone="text-mint" bg="bg-cat-yellow" />
                    <div className="my-4 h-px bg-white/8" />
                    <SettlementRow initial="D" name="You owe Aditi" amount="₹560" tone="text-coral" bg="bg-cat-pink" />
                  </div>
                  <div className="mt-5 flex h-13 items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-white shadow-[0_16px_42px_-18px_var(--color-accent)]">
                    <LockIcon />
                    Pay ₹560 via UPI
                  </div>
                </section>

                <section className="rounded-3xl border border-accent2/20 bg-accent2/8 p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent2/15 text-xl">
                      ⚡
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-hi">Built for UPI settle-up</h2>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Owely opens your UPI app with the amount filled in. You confirm the payment, Owely keeps the group square.
                      </p>
                    </div>
                  </div>
                </section>

                <footer className="text-xs text-faint">
                  © {new Date().getFullYear()} owely · Made in India 🇮🇳
                </footer>
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
    <div className={`rounded-3xl border bg-card p-5 ${accent ? "border-mint/25" : "border-white/8"}`}>
      <p className={accent ? "text-mint" : "text-dim"}>{label}</p>
      <p className={`mt-3 font-display text-3xl font-bold tracking-tight ${accent ? "text-mint" : "text-hi"}`}>
        {value}
      </p>
    </div>
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

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
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
