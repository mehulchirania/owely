import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { fetchUser } from "@/lib/read-model";
import { OnboardingForm } from "@/components/OnboardingForm";

export const metadata: Metadata = {
  title: "Welcome to Owely",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/groups";

  // If the user already has a real display name, skip onboarding
  const user = await fetchUser(session.uid);
  const hasName =
    user?.displayName &&
    user.displayName !== "Owely user" &&
    user.displayName !== session.phone;
  if (hasName) redirect(next);

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12 lg:px-8">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-[10%] h-[400px] w-[400px] rounded-full bg-accent opacity-15 blur-[160px]"
      />

      <div className="w-full max-w-sm lg:max-w-4xl lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
        {/* Left side: branding, tagline, premium graphics or benefits (desktop only) */}
        <div className="hidden lg:flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-3xl shadow-[0_18px_50px_-18px_var(--color-accent)]">
              🦉
            </span>
            <span className="font-display text-3xl font-bold tracking-tight text-hi">
              owely
            </span>
          </div>

          <div className="space-y-4 mt-4">
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-hi leading-tight">
              India&apos;s easiest way to split expenses.
            </h2>
            <p className="text-base text-muted leading-relaxed">
              Keep track of shared bills, rent, trips, and direct dues. Open GPay or PhonePe directly to settle instantly with friends.
            </p>
          </div>

          <ul className="space-y-3.5 text-sm text-strong font-medium mt-2">
            <li className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mint/10 text-mint text-xs">✓</span>
              <span>100% Free splitting & instant settlements</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mint/10 text-mint text-xs">✓</span>
              <span>No fees, direct app-to-app payments</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mint/10 text-mint text-xs">✓</span>
              <span>Offline persistence for poor networks</span>
            </li>
          </ul>
        </div>

        {/* Right side: onboarding form */}
        <div className="flex flex-col">
          {/* Logo (visible on mobile only) */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-2xl shadow-[0_18px_50px_-18px_var(--color-accent)]">
              🦉
            </span>
            <span className="font-display text-2xl font-bold tracking-tight text-hi">
              owely
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-display text-3xl font-bold tracking-tight text-hi">
            One last step
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            What should your friends see when you split a bill?
          </p>

          {/* Decorative stat strip */}
          <div className="my-8 grid grid-cols-3 gap-2">
            {[
              { label: "Groups", value: "Free" },
              { label: "Splits", value: "Instant" },
              { label: "Fees", value: "₹0" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/6 bg-card px-3 py-3 text-center"
              >
                <p className="text-[11px] uppercase tracking-[0.08em] text-faint">{label}</p>
                <p className="mt-1 font-display text-base font-semibold text-hi">{value}</p>
              </div>
            ))}
          </div>

          <Suspense fallback={<div className="h-32 animate-pulse rounded-2xl bg-card" />}>
            <OnboardingForm next={next} />
          </Suspense>

          <p className="mt-6 text-center text-xs text-faint">
            You can update your name anytime in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
