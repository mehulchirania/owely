/**
 * Authenticated app shell. Server-guarded: `requireSession()` redirects to
 * `/login` when the session cookie is missing or invalid (defense in depth —
 * `proxy.ts` only checks cookie presence at the edge).
 */

import Link from "next/link";
import { requireSession } from "@/lib/session";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();

  const initial = (user.name ?? "Y").charAt(0).toUpperCase();

  return (
    <div className="relative flex min-h-full flex-col lg:flex-row">
      {/* ambient brand glow behind the whole app */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-[6%] h-[420px] w-[420px] rounded-full bg-accent opacity-[0.14] blur-[180px]"
      />

      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-white/6 bg-ink/40 p-5 backdrop-blur lg:flex">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <Link
            href="/groups"
            className="flex items-center gap-2.5 rounded-xl px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent text-lg"
              role="img"
              aria-label="owl"
            >
              🦉
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-hi">
              owely
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5" aria-label="Sidebar Navigation">
            <Link
              href="/groups"
              className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-strong transition-colors hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-dim">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              <span>Dashboard</span>
            </Link>
            <Link
              href="/people"
              className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-strong transition-colors hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-dim">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>People</span>
            </Link>
            <Link
              href="/own"
              className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-strong transition-colors hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-dim">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
              <span>Personal</span>
            </Link>
            <Link
              href="/settings"
              className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-strong transition-colors hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-dim">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        {/* User profile / Logout at bottom */}
        <div className="flex flex-col gap-3 border-t border-white/6 pt-4">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 rounded-xl p-1.5 text-sm font-medium text-muted transition-colors hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent font-display text-xs font-semibold text-white">
              {initial}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold text-hi">
              {user.name ?? "Settings"}
            </span>
          </Link>
          <SignOutButton />
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header (hidden on desktop) */}
        <header className="sticky top-0 z-10 border-b border-white/6 bg-ink/80 backdrop-blur lg:hidden">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 px-4 py-3">
            <Link
              href="/groups"
              className="flex items-center gap-2.5 rounded-xl px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent text-lg"
                role="img"
                aria-label="owl"
              >
                🦉
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-hi">
                owely
              </span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/settings"
                aria-label="Settings"
                className="flex h-9 items-center gap-2 rounded-full pr-3 pl-1 text-sm font-medium text-muted transition-colors hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-display text-xs font-semibold text-white">
                  {initial}
                </span>
                {user.name?.split(" ")[0] ?? "Settings"}
              </Link>
              <SignOutButton />
            </nav>
          </div>
          <nav className="mx-auto flex w-full max-w-2xl gap-2 px-4 pb-3" aria-label="Primary">
            <Link
              href="/groups"
              className="flex h-10 flex-1 items-center justify-center rounded-2xl border border-white/6 bg-card text-sm font-semibold text-strong transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Groups
            </Link>
            <Link
              href="/people"
              className="flex h-10 flex-1 items-center justify-center rounded-2xl border border-white/6 bg-card text-sm font-semibold text-strong transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              People
            </Link>
            <Link
              href="/own"
              className="flex h-10 flex-1 items-center justify-center rounded-2xl border border-white/6 bg-card text-sm font-semibold text-strong transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Personal
            </Link>
          </nav>
        </header>

        {/* Main Content Area */}
        <main className="relative mx-auto w-full max-w-2xl lg:max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
