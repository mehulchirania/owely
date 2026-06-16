import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { fetchUser } from "@/lib/read-model";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata: Metadata = { title: "Settings - Owely" };

export default async function SettingsPage() {
  const session = await requireSession();
  const user = await fetchUser(session.uid);

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
    </div>
  );
}
