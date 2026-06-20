/**
 * Authenticated app shell. Server-guarded: `requireSession()` redirects to
 * `/login` when the session cookie is missing or invalid (defense in depth —
 * `proxy.ts` only checks cookie presence at the edge).
 */

import Link from "next/link";
import { requireSession } from "@/features/auth/session";
import { fetchUser } from "@/features/auth/queries";
import { SignOutButton } from "@/components/SignOutButton";
import { SidebarNav } from "@/components/SidebarNav";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();
  const profile = await fetchUser(user.uid);
  const isPaid = profile?.tier === "paid";

  const initial = (user.name ?? "Y").charAt(0).toUpperCase();
  const displayName = user.name ?? "Settings";
  const email = profile?.email ?? profile?.phone ?? "";

  return (
    <div className="relative flex min-h-full flex-col lg:flex-row">
      {/* ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-[6%] h-[420px] w-[420px] rounded-full bg-accent opacity-[0.1] blur-[180px]"
      />

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col justify-between border-r border-white/6 bg-ink/50 px-4 py-[18px] backdrop-blur lg:flex">
        <div className="flex flex-col gap-[26px]">
          {/* Logo */}
          <Link
            href="/home"
            className="flex items-center gap-2 rounded-[10px] px-1 py-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-accent text-base shadow-[0_4px_12px_-4px_rgba(139,123,255,.6)]"
              role="img"
              aria-label="owl"
            >
              🦉
            </span>
            <span className="font-display text-[17px] font-bold tracking-tight text-hi">
              owely
            </span>
            {isPaid && (
              <span className="rounded-full border border-accent/24 bg-accent/12 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[.1em] text-accent">
                PRO
              </span>
            )}
          </Link>

          <SidebarNav />
        </div>

        {/* User profile + logout */}
        <div className="flex flex-col gap-3 border-t border-white/6 pt-3">
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-accent font-display text-xs font-semibold text-white">
              {initial}
              {isPaid && (
                <span className="absolute -bottom-0.5 -right-0.5 rounded-full border-[1.5px] border-ink bg-accent px-[3px] py-[1px] text-[6px] font-bold uppercase leading-none tracking-[.08em] text-white">
                  PRO
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-[12.5px] font-semibold text-hi leading-tight">
                {displayName}
                {isPaid && (
                  <span className="rounded-full border border-accent/24 bg-accent/12 px-1 py-px text-[7.5px] font-bold uppercase tracking-[.1em] text-accent">
                    PRO
                  </span>
                )}
              </p>
              {email && (
                <p className="truncate text-[10.5px] text-dim leading-tight">{email}</p>
              )}
            </div>
          </Link>
          <SignOutButton />
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header */}
        <header className="sticky top-0 z-10 border-b border-white/6 bg-ink/80 backdrop-blur lg:hidden">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 px-4 py-3">
            <Link
              href="/home"
              className="flex items-center gap-2 rounded-xl px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span
                className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-accent text-sm"
                role="img"
                aria-label="owl"
              >
                🦉
              </span>
              <span className="font-display text-[17px] font-bold tracking-tight text-hi">
                owely
              </span>
              {isPaid && (
                <span className="rounded-full border border-accent/24 bg-accent/12 px-1.5 py-[1.5px] text-[7.5px] font-bold uppercase tracking-[.1em] text-accent">
                  PRO
                </span>
              )}
            </Link>
            <nav className="flex items-center gap-1.5">
              <Link
                href="/settings"
                aria-label="Settings"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-display text-[13px] font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {initial}
              </Link>
              <SignOutButton />
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="relative mx-auto w-full max-w-2xl lg:max-w-5xl flex-1 px-4 py-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
