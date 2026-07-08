import type { Metadata } from "next";
import { requireSession } from "@/features/auth/session";
import { fetchUser } from "@/features/auth/queries";
import { fetchRelationshipCategories } from "@/features/groups/category-queries";
import { countImportedContacts } from "@/features/contacts/queries";
import { ProfileForm } from "@/components/ProfileForm";
import { CustomCategoriesManager } from "@/components/CustomCategoriesManager";
import { DisplayCurrencyForm } from "@/components/DisplayCurrencyForm";
import { CheckoutButton } from "@/components/CheckoutButton";
import { SignOutButton } from "@/components/SignOutButton";
import { ClearImportedContactsButton } from "@/components/ClearImportedContactsButton";

export const metadata: Metadata = { title: "Me — Owely" };

export default async function SettingsPage() {
  const session = await requireSession();
  const [user, categories, importedContactCount] = await Promise.all([
    fetchUser(session.uid),
    fetchRelationshipCategories(session.uid),
    countImportedContacts(session.uid),
  ]);
  const isPaid = user?.tier === "paid";
  const initial = (user?.displayName ?? session.name ?? "Y").charAt(0).toUpperCase();
  const displayName = user?.displayName ?? session.name ?? "";
  const email = user?.email ?? user?.phone ?? "";
  const upiId = user?.upiId ?? "";

  return (
    <div className="flex flex-col gap-5">
      {/* Profile hero card */}
      <div className="flex items-center gap-4 rounded-[18px] border border-white/7 bg-card px-5 py-5">
        <div className="relative shrink-0">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-accent font-display text-[22px] font-bold text-white ${
              isPaid ? "shadow-[0_0_0_3px_rgba(139,123,255,.35)]" : ""
            }`}
          >
            {initial}
          </span>
          {isPaid && (
            <span className="absolute -bottom-1 -right-1 rounded-full border-[1.5px] border-card bg-accent px-[4px] py-[1.5px] text-[7px] font-bold uppercase leading-none tracking-[.08em] text-white">
              PRO
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-display text-[16px] font-bold text-hi">
              {displayName}
            </p>
            {isPaid && (
              <span className="shrink-0 rounded-full border border-accent/26 bg-accent/12 px-1.5 py-px text-[9px] font-bold uppercase tracking-[.1em] text-accent">
                PRO
              </span>
            )}
          </div>
          {email && (
            <p className="mt-0.5 truncate text-[12px] text-dim">{email}</p>
          )}
          {upiId ? (
            <p className="mt-0.5 truncate text-[11.5px] font-medium text-accent">
              {upiId}
            </p>
          ) : (
            <a href="#edit-profile" className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent transition-colors hover:bg-accent/25">
              + Add UPI ID
            </a>
          )}
        </div>
        <a
          href="#edit-profile"
          className="shrink-0 flex h-8 items-center rounded-[9px] border border-white/9 bg-surface px-3 text-[12px] font-medium text-muted transition-colors hover:bg-elevated"
        >
          Edit
        </a>
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
      <section
        id="edit-profile"
        className="rounded-[14px] border border-white/7 bg-surface p-[18px]"
      >
        <p className="mb-4 text-[13.5px] font-semibold text-hi">Edit profile</p>
        <ProfileForm
          displayName={displayName}
          upiId={upiId}
        />
      </section>

      {/* Custom categories */}
      <CustomCategoriesManager initialCategories={categories} />

      <section className="rounded-[14px] border border-white/7 bg-surface p-[18px]">
        <p className="mb-1 text-[13.5px] font-semibold text-hi">Imported contacts</p>
        <p className="mb-4 text-[12px] leading-5 text-dim">
          Owely stores only contacts you choose through import, so matching works across groups and people.
        </p>
        <ClearImportedContactsButton count={importedContactCount} />
      </section>

      {/* Sign out */}
      <div className="flex justify-center pt-2 pb-4">
        <SignOutButton />
      </div>

      {/* Danger Zone */}
      <section className="rounded-[14px] border border-coral/10 bg-coral/5 p-[18px]">
        <p className="mb-1 text-[13.5px] font-semibold text-coral">Danger Zone</p>
        <p className="mb-4 text-[12px] text-coral-soft">
          Deleting your account is permanent. All personal data will be removed.
        </p>
        <button
          type="button"
          onClick={() => {}}
          className="flex h-[38px] items-center justify-center rounded-[10px] border border-coral/20 bg-coral/10 px-4 text-[13px] font-bold text-coral transition-colors hover:bg-coral/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
        >
          Delete account
        </button>
      </section>
    </div>
  );
}

function FreePlanCard() {
  return (
    <>
      {/* Usage card */}
      <div className="rounded-[14px] border border-white/7 bg-surface p-[18px]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13.5px] font-semibold text-hi">Free plan</p>
          <span className="rounded-full border border-white/10 bg-elevated px-2.5 py-0.5 text-[10px] font-semibold text-dim">
            100 expenses / mo
          </span>
        </div>
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
          <div className="h-full w-[0%] rounded-full bg-accent" />
        </div>
        <p className="text-[11px] text-faint">Resets on the 1st of each month</p>
      </div>

      {/* Upgrade CTA */}
      <div className="relative overflow-hidden rounded-[14px] border-[1.5px] border-accent/28 bg-[#13111c] p-[18px]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-5 -top-7 h-36 w-36 rounded-full bg-accent opacity-[0.14] blur-[60px]"
        />
        <div className="relative flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-accent/15 text-[20px] text-accent">
            ✦
          </span>
          <div className="flex-1">
            <p className="font-display text-[15px] font-bold text-hi">
              Unlock Owely Pro
            </p>
            <p className="mb-4 mt-1 text-[12.5px] leading-relaxed text-muted">
              Unlimited expenses · AI receipt scanner · PDF export · recurring splits · display currency
            </p>
            <div className="flex flex-wrap gap-2.5">
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
  "Display currency",
];

function ProPlanCard() {
  return (
    <div className="relative overflow-hidden rounded-[14px] border-[1.5px] border-accent/28 bg-[#13111c] p-[18px]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-5 -top-7 h-36 w-36 rounded-full bg-accent opacity-[0.13] blur-[60px]"
      />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="font-display text-[15px] font-bold text-hi">
              Owely Pro
            </p>
            <span className="rounded-full bg-accent px-2 py-px text-[9px] font-bold uppercase tracking-[.06em] text-white">
              Active
            </span>
          </div>
          <p className="text-[11.5px] text-dim">Renews on the 1st</p>
        </div>
        <div className="grid grid-cols-2 gap-y-2 gap-x-3">
          {PRO_FEATURES.map((feat) => (
            <div key={feat} className="flex items-center gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/18">
                <svg
                  width="7"
                  height="7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#b6abff"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
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
