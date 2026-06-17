"use client";

import { useState, useTransition } from "react";
import { loginAdmin } from "@/actions/admin";

export function AdminLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await loginAdmin({ username, password });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/6 bg-card p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-2xl">
            🔒
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-hi">
            Admin Panel
          </h1>
          <p className="text-sm text-dim">Please sign in to continue</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={pending}
              placeholder="admin"
              className="h-12 rounded-xl border border-white/8 bg-surface px-3 text-hi outline-none placeholder:text-faint focus:border-accent/60 focus:outline focus:outline-2 focus:outline-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
              placeholder="••••••••"
              className="h-12 rounded-xl border border-white/8 bg-surface px-3 text-hi outline-none placeholder:text-faint focus:border-accent/60 focus:outline focus:outline-2 focus:outline-accent"
            />
          </div>

          {error && <p role="alert" className="text-sm text-coral-soft">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="flex h-12 items-center justify-center rounded-xl bg-accent font-semibold text-white shadow-[0_12px_26px_-10px_var(--color-accent)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
