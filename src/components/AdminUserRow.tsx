"use client";

import { useState, useTransition } from "react";
import { updateUserAdmin } from "@/features/admin/actions";

interface UserRowProps {
  user: {
    uid: string;
    displayName: string;
    phone: string | null;
    tier: "free" | "paid";
  };
}

export function AdminUserRow({ user }: UserRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.displayName);
  const [phone, setPhone] = useState(user.phone || "");
  const [tier, setTier] = useState(user.tier);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateUserAdmin({
        userId: user.uid,
        displayName: name,
        phone: phone || null,
        tier: tier,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setIsEditing(false);
    });
  }

  function handleCancel() {
    setName(user.displayName);
    setPhone(user.phone || "");
    setTier(user.tier);
    setError(null);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <tr className="border-b border-white/5 bg-white/[0.02] last:border-0">
        <td className="px-4 py-3 text-sm">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            className="w-full h-9 rounded-lg border border-white/8 bg-surface px-2 text-sm text-hi outline-none focus:border-accent"
          />
          {error && <span className="text-[10px] text-coral-soft block mt-1">{error}</span>}
        </td>
        <td className="px-4 py-3 text-sm">
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={pending}
            placeholder="e.g. +919876543210"
            className="w-full h-9 rounded-lg border border-white/8 bg-surface px-2 text-sm text-hi outline-none focus:border-accent"
          />
        </td>
        <td className="px-4 py-3 text-sm">
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as "free" | "paid")}
            disabled={pending}
            className="h-9 rounded-lg border border-white/8 bg-surface px-2 text-sm text-hi outline-none focus:border-accent"
          >
            <option value="free">free</option>
            <option value="paid">paid</option>
          </select>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex gap-1.5 justify-end">
            <button
              onClick={handleSave}
              disabled={pending}
              className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-ink transition-colors hover:bg-accent/80 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              disabled={pending}
              className="rounded-lg border border-white/10 bg-surface px-3 py-1 text-xs font-semibold text-strong transition-colors hover:bg-elevated disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/2">
      <td className="px-4 py-3 text-sm font-semibold text-hi truncate max-w-[150px]">
        {user.displayName}
      </td>
      <td className="px-4 py-3 text-sm text-strong">
        {user.phone || "No phone"}
      </td>
      <td className="px-4 py-3 text-sm">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          user.tier === "paid" ? "bg-accent/15 text-accent" : "bg-white/10 text-muted"
        }`}>
          {user.tier}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => setIsEditing(true)}
          className="rounded-lg border border-white/10 bg-surface px-3 py-1 text-xs font-semibold text-strong transition-colors hover:bg-elevated"
        >
          Edit
        </button>
      </td>
    </tr>
  );
}
