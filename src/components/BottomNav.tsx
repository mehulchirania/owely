"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { QuickActionSheet } from "./QuickActionSheet";

export function BottomNav() {
  const pathname = usePathname();

  const isHome = pathname === "/home";
  const isGroups =
    !isHome &&
    (pathname === "/groups" || pathname.startsWith("/groups/"));
  const isPeople =
    pathname === "/people" || pathname.startsWith("/people/");
  const isMe = pathname === "/settings";

  // When on a group detail page, FAB goes directly to add expense.
  const groupMatch = pathname.match(/^\/groups\/([^/]+)/);
  const groupId = groupMatch?.[1];
  const fabHref = groupId ? `/groups/${groupId}/expenses/new` : undefined;

  const { scrollDir, isScrolled } = useScrollDirection(15);
  const [sheetOpen, setSheetOpen] = useState(false);

  const item = (active: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-[3px] transition-colors min-w-0 ${
      active ? "text-accent" : "text-faint"
    }`;

  const label = (active: boolean) =>
    `text-[9.5px] ${active ? "font-semibold" : "font-medium"}`;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 flex h-[68px] items-stretch bg-ink lg:hidden transition-transform duration-300 ease-out border-t ${
        isScrolled ? "border-white/6 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.5)]" : "border-transparent"
      } ${scrollDir === "down" ? "translate-y-[120%]" : "translate-y-0"}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary navigation"
    >
      {/* Home */}
      <Link
        href="/home"
        className={item(isHome)}
        aria-current={isHome ? "page" : undefined}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className={label(isHome)}>Home</span>
      </Link>

      {/* Groups */}
      <Link
        href="/groups"
        className={item(isGroups)}
        aria-current={isGroups ? "page" : undefined}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        <span className={label(isGroups)}>Groups</span>
      </Link>

      {/* FAB spacer — the button is absolutely positioned */}
      <div className="flex flex-1 items-center justify-center" aria-hidden />

      {/* People */}
      <Link
        href="/people"
        className={item(isPeople)}
        aria-current={isPeople ? "page" : undefined}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span className={label(isPeople)}>People</span>
      </Link>

      {/* Me */}
      <Link
        href="/settings"
        className={item(isMe)}
        aria-current={isMe ? "page" : undefined}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className={label(isMe)}>Me</span>
      </Link>

      {/* Floating Action Button */}
      {fabHref ? (
        <Link
          href={fabHref}
          aria-label="Add expense"
          className="absolute bottom-[8px] left-1/2 flex h-[52px] w-[52px] -translate-x-1/2 items-center justify-center rounded-full bg-accent shadow-[0_8px_24px_-6px_rgba(139,123,255,.85)] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      ) : (
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Quick actions"
          className="absolute bottom-[8px] left-1/2 flex h-[52px] w-[52px] -translate-x-1/2 items-center justify-center rounded-full bg-accent shadow-[0_8px_24px_-6px_rgba(139,123,255,.85)] transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      {/* Sheet renders outside the nav layout flow but inside the component for state management */}
      <QuickActionSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </nav>
  );
}
