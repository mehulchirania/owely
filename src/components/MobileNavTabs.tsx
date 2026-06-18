"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNavTabs() {
  const pathname = usePathname();

  const tabs = [
    { href: "/groups", label: "Groups" },
    { href: "/people", label: "People" },
    { href: "/own", label: "Personal" },
  ];

  return (
    <nav className="mx-auto flex w-full max-w-2xl gap-2 px-4 pb-3" aria-label="Primary">
      {tabs.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex h-9 flex-1 items-center justify-center rounded-[9px] text-[12.5px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              active ? "bg-accent/10 text-hi" : "bg-card text-muted hover:bg-elevated"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
