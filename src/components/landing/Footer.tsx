const COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string }> }> = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "How it works", href: "/#how" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/[.06] bg-[#0d0c11]">
      <div className="mx-auto flex max-w-[1280px] flex-wrap gap-10 px-5 pb-[30px] pt-[54px] sm:px-10">
        <div className="min-w-[240px] flex-1">
          <div className="mb-[14px] flex items-center gap-[11px]">
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-accent text-[21px]">🦉</span>
            <span className="font-display text-[20px] font-bold">owely</span>
          </div>
          <p className="max-w-[280px] text-[13.5px] leading-[1.6] text-dim">
            India-first expense splitting. Split bills with anyone, settle over UPI in one tap.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-[64px] gap-y-8">
          {COLUMNS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-[11px]">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">{col.heading}</span>
              {col.links.map((l) => (
                <a key={l.label} href={l.href} className="ow-link text-[14px] text-muted no-underline">
                  {l.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 border-t border-white/[.05] px-5 pb-10 pt-[18px] sm:px-10">
        <span className="text-[13px] text-faint">© 2026 Owely · Made in India 🇮🇳</span>
        <div className="flex gap-[9px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 w-8 rounded-[10px] border border-white/[.06] bg-card" />
          ))}
        </div>
      </div>
    </footer>
  );
}
