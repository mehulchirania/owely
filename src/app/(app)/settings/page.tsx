import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { fetchUser } from "@/features/auth/queries";
import { fetchRelationshipCategories } from "@/features/groups/category-queries";
import { currencyLabel } from "@/lib/currency";
import { ProfileForm } from "@/components/ProfileForm";
import { CustomCategoriesManager } from "@/components/CustomCategoriesManager";

export const metadata: Metadata = { title: "Settings - Owely" };

export default async function SettingsPage() {
  const session = await requireSession();
  const [user, categories] = await Promise.all([
    fetchUser(session.uid),
    fetchRelationshipCategories(session.uid),
  ]);
  const tier = user?.tier ?? "free";
  const currency = user?.currency ?? "INR";
  const isPaid = tier === "paid";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-dim">Profile and payments</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-hi">
          Settings
        </h1>
      </div>
      <section className="flex flex-col gap-4 rounded-2xl border border-white/6 bg-surface p-4">
        {(user?.email || user?.phone) && (
          <div className="text-sm text-dim">
            {user.email && <p>{user.email}</p>}
            {user.phone && <p>{user.phone}</p>}
          </div>
        )}
        <ProfileForm
          displayName={user?.displayName ?? session.name ?? ""}
          upiId={user?.upiId ?? ""}
        />
      </section>
      <section className="overflow-hidden rounded-2xl border border-white/6 bg-surface">
        <div className="border-b border-white/6 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-dim">Plan</p>
              <h2 className="font-display text-xl font-bold tracking-tight text-hi">
                {isPaid ? "Owely Pro" : "Owely Free"}
              </h2>
            </div>
            <span className={`inline-flex h-9 w-fit items-center rounded-full px-3 text-sm font-semibold ${isPaid ? "bg-mint/10 text-mint" : "bg-accent/10 text-accent"}`}>
              {isPaid ? "Active" : "Free tier"}
            </span>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <PlanFeature
            title="Monthly group limit"
            value={isPaid ? "Unlimited" : "100 expenses per group"}
            enabled
          />
          <PlanFeature
            title="Display currency"
            value={currencyLabel(currency)}
            enabled={isPaid || currency === "INR"}
          />
          <PlanFeature
            title="PDF exports"
            value={isPaid ? "Available in each group" : "Pro feature"}
            enabled={isPaid}
          />
          <PlanFeature
            title="Receipt OCR"
            value={isPaid ? "Backend ready" : "Pro feature"}
            enabled={isPaid}
          />
          <PlanFeature
            title="Templates"
            value={isPaid ? "Backend ready" : "Pro feature"}
            enabled={isPaid}
          />
          <PlanFeature
            title="Recurring expenses"
            value={isPaid ? "Backend ready" : "Pro feature"}
            enabled={isPaid}
          />
        </div>

        {!isPaid && (
          <div className="border-t border-white/6 bg-card/70 p-4">
            <p className="text-sm leading-6 text-muted">
              Pro unlocks unlimited expenses, PDF exports, receipt OCR, split templates,
              recurring expenses, and multi-currency metadata. Billing is not connected yet,
              so this panel reflects the stored user tier.
            </p>
          </div>
        )}
      </section>

      <CustomCategoriesManager initialCategories={categories} />
    </div>
  );
}

function PlanFeature({
  title,
  value,
  enabled,
}: {
  title: string;
  value: string;
  enabled: boolean;
}) {
  return (
    <div className="flex min-h-24 items-start gap-3 rounded-2xl border border-white/6 bg-card p-4">
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${enabled ? "bg-mint/10 text-mint" : "bg-white/5 text-dim"}`}>
        {enabled ? (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        )}
      </span>
      <div className="min-w-0">
        <h3 className="font-semibold text-hi">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-muted">{value}</p>
      </div>
    </div>
  );
}
