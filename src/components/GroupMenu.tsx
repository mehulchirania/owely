"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteGroup, leaveGroup, renameGroup } from "@/actions/groups";

interface Props {
  groupId: string;
  groupName: string;
  isCreator: boolean;
}

export function GroupMenu({ groupId, groupName, isCreator }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(groupName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function doRename(e: React.FormEvent): void {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await renameGroup({ groupId, name });
      if (!res.ok) { setError(res.error); return; }
      setRenaming(false);
      setOpen(false);
      router.refresh();
    });
  }

  function doLeave(): void {
    if (!confirm("Leave this group? Your balances stay recorded for others.")) return;
    setError(null);
    startTransition(async () => {
      const res = await leaveGroup({ groupId });
      if (!res.ok) { setError(res.error); return; }
      router.replace("/groups");
      router.refresh();
    });
  }

  function doDelete(): void {
    if (!confirm(`Delete "${groupName}" for everyone? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteGroup({ groupId });
      if (!res.ok) { setError(res.error); return; }
      router.replace("/groups");
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Group options"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/8 bg-card text-strong transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span aria-hidden className="text-xl leading-none">...</span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-white/8 bg-surface p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,.9)]">
          {renaming ? (
            <form onSubmit={doRename} className="flex flex-col gap-2 p-1">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                disabled={pending}
                className="h-11 rounded-xl border border-white/8 bg-card px-3 text-hi outline-none focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={pending} className="h-10 flex-1 rounded-xl bg-accent text-sm font-semibold text-white disabled:opacity-60">Save</button>
                <button type="button" onClick={() => setRenaming(false)} className="h-10 rounded-xl border border-white/8 px-3 text-sm font-semibold text-strong">Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <button type="button" onClick={() => setRenaming(true)} disabled={pending} className="flex h-11 w-full items-center rounded-xl px-3 text-left text-sm text-strong hover:bg-card disabled:opacity-60">Rename group</button>
              <button type="button" onClick={doLeave} disabled={pending} className="flex h-11 w-full items-center rounded-xl px-3 text-left text-sm text-strong hover:bg-card disabled:opacity-60">Leave group</button>
              {isCreator && (
                <button type="button" onClick={doDelete} disabled={pending} className="flex h-11 w-full items-center rounded-xl px-3 text-left text-sm text-coral hover:bg-coral/10 disabled:opacity-60">Delete group</button>
              )}
            </>
          )}
          {error && <p role="alert" className="px-3 py-1 text-sm text-coral-soft">{error}</p>}
        </div>
      )}
    </div>
  );
}
