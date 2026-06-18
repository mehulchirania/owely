import type { Metadata } from "next";
import { requireSession } from "@/features/auth/session";
import { fetchUser } from "@/features/auth/queries";
import { fetchRelationshipCategories } from "@/features/groups/category-queries";
import { ProfileForm } from "@/components/ProfileForm";
import { CustomCategoriesManager } from "@/components/CustomCategoriesManager";
import { DisplayCurrencyForm } from "@/components/DisplayCurrencyForm";
import { CheckoutButton } from "@/components/CheckoutButton";

export const metadata: Metadata = { title: "Settings - Owely" };

export default async function SettingsPage() {
  const session = await requireSession();
  const [user, categories] = await Promise.all([
    fetchUser(session.uid),
    fetchRelationshipCategories(session.uid),
  ]);
  const isPaid = user?.tier === "paid";
  const initial = (user?.displayName ?? session.name ?? "Y").charAt(0).toUpperCase();
  const email = user?.email ?? user?.phone ?? "";

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-[20px] font-bold tracking-tight text-hi">Settings</h1>

      {/* Profile card */}
      <div className="flex items-center gap-[14px] rounded-[14px] border border-white/7 bg-surface p-[18px]">
        <div className="relative shrink-0">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-accent font-display text-xl font-bold text-white ${isPaid ? "shadow-[0_0_0_2.5px_rgba(139,123,255,.4)]" : ""}`}
          >
            {initial}
          </span>
          {isPaid && (
            <span className="absolute -bottom-1 -right-1 rounded-full border-[1.5px] border-surface bg-accent px-[3px] py-[1px] text-[7px] font-bold uppercase leading-none tracking-[.08em] text-white">
              PRO
            </span>
          )}
        </div>
        <div>
          <p className="flex items-center gap-2 text-[15px] font-semibold text-hi">
            {user?.displayName ?? session.name ?? ""}
            {isPaid && (
              <span className="rounded-full border border-accent/26 bg-accent/12 px-1.5 py-px text-[9px] font-bold uppercase tracking-[.1em] text-accent">
                PRO
              </span>
            )}
          </p>
          {email && <p className="text-[12.5px] text-dim">{email}</p>}
        </div>
        <div className="ml-auto">
          <a href="#edit-profile" className="flex h-8 items-center rounded-[9px] border border-white/9 bg-card px-3 text-[12.5px] font-medium text-muted transition-colors hover:bg-elevated">
            Edit
          </a>
        </div>
      </div>

      {/* Plan section */}
      {isPaid ? <ProPlanCard /> : <FreePlanCard />}

      {/* Display currency */}
      <div className="rounded-[14px] border border-white/7 bg-surface p-[18px]">
        <DisplayCurrencyForm
          current={user?.currency ?? "INR"}
          isPaid={isPaid}
        />
      </div>

      {/* Edit profile */}
      <section id="edit-profile" className="rounded-[14px] border border-white/7 bg-surface p-[18px]">
        <p className="mb-4 text-[13.5px] font-semibold text-hi">Edit profile</p>
        <ProfileForm
          displayName={user?.displayName ?? session.name ?? ""}
          upiId={user?.upiId ?? ""}
        />
      </section>

      <CustomCategoriesManager initialCategories={categories} />
    </div>
  );
}

function FreePlanCard() {
  return (
    <>
      {/* Usage */}
      <div className="rounded-[14px] border border-white/7 bg-surface p-[18px]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13.5px] font-semibold text-hi">Plan</p>
          <span className="rounded-full bg-elevated px-2.5 py-0.5 text-[10px] font-semibold text-dim">
            Free tier
          </span>
        </div>
        <p className="mb-0.5 text-[11.5px] text-dim">Monthly limit</p>
        <p className="text-[10.5px] text-faint">100 expenses per group · resets on the 1st</p>
      </div>

      {/* Upgrade CTA */}
      <div className="relative overflow-hidden rounded-[14px] border-[1.5px] border-accent/28 bg-[#13111c] p-[18px]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-5 -top-7 h-32 w-32 rounded-full bg-accent opacity-[0.16] blur-[50px]"
        />
        <div className="relative flex items-start gap-[14px]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-accent/15 text-[20px]">
            ✦
          </span>
          <div className="flex-1">
            <p className="font-display text-[15px] font-bold text-hi">Unlock Owely Pro</p>
            <p className="mt-1 mb-3 text-[12.5px] text-muted leading-relaxed">
              Unlimited expenses, AI receipt scanner, PDF export, recurring expenses, and more.
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <CheckoutButton
                plan="pro_monthly"
                label="Go Pro — ₹99/mo"
                className="flex h-[38px] items-center rounded-[10px] bg-accent px-[18px] text-[13.5px] font-bold text-white shadow-[0_6px_18px_-6px_var(--color-accent)] disabled:opacity-60"
              />
              <CheckoutButton
                plan="trip_pass"
                label="Trip Pass ₹49"
                className="flex h-[38px] items-center rounded-[10px] border border-accent2/22 bg-accent2/8 px-3.5 text-[13.5px] font-semibold text-accent2 disabled:opacity-60"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const PRO_FEATURES = [
  "Unlimited expenses",
  "AI receipt scanner",
  "PDF export",
  "Recurring expenses",
  "Split templates",
  "Multi-currency",
];

function ProPlanCard() {
  return (
    <div className="relative overflow-hidden rounded-[14px] border-[1.5px] border-accent/28 bg-[#13111c] p-[18px]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-5 -top-7 h-32 w-32 rounded-full bg-accent opacity-[0.15] blur-[50px]"
      />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-bold text-hi">Owely Pro</p>
            <span className="rounded-full bg-accent px-2 py-px text-[9.5px] font-bold text-white">
              Active
            </span>
          </div>
          <p className="text-[12px] text-dim">Renews on the 1st</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRO_FEATURES.map((feat) => (
            <div key={feat} className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/18">
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#b6abff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <span className="text-[12px] text-strong">{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
