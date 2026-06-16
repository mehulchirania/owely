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
    <div className="relative flex min-h-full flex-col">
      {/* ambient brand glow behind the whole app */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-[6%] h-[420px] w-[420px] rounded-full bg-accent opacity-[0.14] blur-[180px]"
      />
      <header className="sticky top-0 z-10 border-b border-white/6 bg-ink/80 backdrop-blur">
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
      </header>
      <main className="relative mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
