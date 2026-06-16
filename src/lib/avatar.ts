/**
 * Deterministic member avatar colors. Same uid → same color across every
 * surface (header stack, balances rows, paid-by pills), so a person reads as
 * one identity throughout the app. Pure (no React) — returns Tailwind classes
 * referencing the design-system palette.
 */

const PALETTE = [
  { bg: "bg-accent", fg: "text-white" },
  { bg: "bg-cat-pink", fg: "text-ink" },
  { bg: "bg-cat-cyan", fg: "text-ink" },
  { bg: "bg-cat-yellow", fg: "text-ink" },
  { bg: "bg-mint", fg: "text-ink" },
  { bg: "bg-accent2", fg: "text-ink" },
] as const;

export function memberAvatar(uid: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
