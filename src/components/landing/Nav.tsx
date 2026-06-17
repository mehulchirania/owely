import Link from "next/link";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#compare", label: "Why Owely" },
  { href: "#pricing", label: "Pricing" },
];

export default function Nav() {
  return (
    <nav
      data-nav
      className="fixed inset-x-0 top-0 z-[150] flex items-center gap-[18px] border-b border-transparent px-5 py-4 transition-[background,border-color] duration-300 sm:px-10"
    >
      <a href="#top" className="flex items-center gap-[11px] text-inherit no-underline">
        <span
          className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-accent text-[21px]"
          style={{ boxShadow: "0 8px 22px -6px var(--color-accent)" }}
        >
          🦉
        </span>
        <span className="font-display text-[21px] font-bold tracking-[-0.01em]">owely</span>
      </a>
      <div className="ml-auto flex items-center gap-5 sm:gap-[30px]">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="ow-link hidden text-[14.5px] font-medium text-muted no-underline md:inline"
          >
            {l.label}
          </a>
        ))}
        <Link
          href="/?login=true"
          data-magnet
          className="ow-glowbtn flex h-[42px] items-center gap-2 rounded-[13px] bg-accent px-5 text-sm font-semibold text-ink no-underline"
          style={{ boxShadow: "0 10px 24px -10px var(--color-accent)" }}
        >
          Login
        </Link>
      </div>
    </nav>
  );
}
