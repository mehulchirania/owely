"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncContacts } from "@/features/contacts/actions";
import type { SyncedContactResult } from "@/features/contacts/types";
import { addMembersByPhone, createDirectRelationship } from "@/features/groups/actions";
import { useToast } from "@/components/ToastProvider";

interface ContactPickerContact {
  name?: string[];
  tel?: string[];
}

interface ContactPickerNavigator extends Navigator {
  contacts?: {
    select: (
      properties: Array<"name" | "tel">,
      options?: { multiple?: boolean },
    ) => Promise<ContactPickerContact[]>;
  };
}

interface ManualRow {
  name: string;
  phone: string;
}

type Mode =
  | { kind: "group"; groupId: string }
  | { kind: "people" };

const EMPTY_ROW: ManualRow = { name: "", phone: "" };

export function ContactImportPanel(props: Mode & { compact?: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ManualRow[]>([{ ...EMPTY_ROW }]);
  const [synced, setSynced] = useState<SyncedContactResult[]>([]);
  const [summary, setSummary] = useState<{ added: number; matched: number; invalid: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyPhone, setBusyPhone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const buttonLabel = props.kind === "group" ? "Add from contacts" : "Import contacts";

  function setRow(index: number, field: keyof ManualRow, value: string): void {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function sync(rawContacts: ManualRow[]): void {
    const contacts = rawContacts
      .map((contact) => ({ name: contact.name.trim(), phone: contact.phone.trim() }))
      .filter((contact) => contact.name && contact.phone);
    if (contacts.length === 0) {
      setError("Pick or enter at least one contact.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await syncContacts({ contacts });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSynced(result.data.contacts);
      setSummary({
        added: result.data.added,
        matched: result.data.matched,
        invalid: result.data.invalid,
      });
      showToast(`${result.data.contacts.length} contacts synced`, "success");
      router.refresh();
    });
  }

  async function pickContacts(): Promise<void> {
    const picker = (navigator as ContactPickerNavigator).contacts;
    if (!picker) {
      setError("Contact picker is not available in this browser.");
      return;
    }
    try {
      const picked = await picker.select(["name", "tel"], { multiple: true });
      sync(
        picked.map((contact) => ({
          name: contact.name?.[0] ?? "Contact",
          phone: contact.tel?.[0] ?? "",
        })),
      );
    } catch (pickError) {
      if (pickError instanceof DOMException && pickError.name === "AbortError") return;
      setError("Could not open contacts. You can add them manually below.");
    }
  }

  function submitManual(event: React.FormEvent): void {
    event.preventDefault();
    sync(rows);
  }

  function reset(): void {
    setOpen(false);
    setRows([{ ...EMPTY_ROW }]);
    setSynced([]);
    setSummary(null);
    setError(null);
  }

  function actOnContact(contact: SyncedContactResult): void {
    setBusyPhone(contact.phone);
    startTransition(async () => {
      const result = props.kind === "group"
        ? await addMembersByPhone({
            groupId: props.groupId,
            people: [{ name: contact.matchedName ?? contact.name, phone: contact.phone }],
          })
        : await createDirectRelationship({
            name: contact.matchedName ?? contact.name,
            phone: contact.phone,
          });
      setBusyPhone(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showToast(contact.onOwely ? "Added on Owely" : "Invite saved", "success");
      if (props.kind === "people" && "groupId" in result.data && result.data.groupId) {
        router.push(`/groups/${result.data.groupId}`);
        return;
      }
      router.refresh();
    });
  }

  const sortedContacts = useMemo(
    () => [...synced].sort((a, b) => Number(b.onOwely) - Number(a.onOwely) || a.name.localeCompare(b.name)),
    [synced],
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${props.compact ? "h-11 px-3 text-[12.5px]" : "h-12 w-full px-6 text-sm"} flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-card font-semibold text-strong transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
      >
        <span aria-hidden="true">+</span>
        {buttonLabel}
      </button>
    );
  }

  return (
    <section className="rounded-2xl border border-white/6 bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-hi">{buttonLabel}</p>
          <p className="mt-1 text-xs leading-5 text-dim">
            Owely stores only contacts you choose, so it can show who is already here.
          </p>
        </div>
        <button type="button" onClick={reset} className="flex h-9 items-center rounded-lg px-2 text-xs text-dim hover:bg-surface hover:text-strong">
          Close
        </button>
      </div>

      <button
        type="button"
        onClick={pickContacts}
        disabled={pending}
        className="mb-3 flex h-12 w-full items-center justify-center rounded-xl bg-accent px-4 font-semibold text-ink disabled:opacity-60"
      >
        {pending ? "Syncing..." : "Pick contacts"}
      </button>

      <form onSubmit={submitManual} className="flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_1fr_34px] gap-1.5 px-0.5 text-[11px] text-dim">
          <span>Name</span>
          <span>Mobile</span>
          <span />
        </div>
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_34px] items-center gap-1.5">
            <input
              value={row.name}
              onChange={(event) => setRow(index, "name", event.target.value)}
              placeholder="Priya"
              maxLength={60}
              disabled={pending}
              aria-label={`Contact name ${index + 1}`}
              className="h-11 rounded-xl border border-white/8 bg-surface px-3 text-sm text-hi outline-none placeholder:text-faint focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
            />
            <input
              value={row.phone}
              onChange={(event) => setRow(index, "phone", event.target.value)}
              placeholder="98765 43210"
              inputMode="tel"
              disabled={pending}
              aria-label={`Contact phone ${index + 1}`}
              className="h-11 rounded-xl border border-white/8 bg-surface px-3 text-sm text-hi outline-none placeholder:text-faint focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
            />
            <button
              type="button"
              onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
              disabled={rows.length === 1 || pending}
              aria-label="Remove contact row"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-faint hover:bg-elevated hover:text-coral disabled:opacity-30"
            >
              X
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => setRows((current) => [...current, { ...EMPTY_ROW }])}
            disabled={pending || rows.length >= 50}
            className="flex h-10 items-center rounded-xl border border-white/8 px-3 text-xs font-semibold text-strong hover:bg-elevated disabled:opacity-60"
          >
            Add row
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex h-10 items-center rounded-xl bg-accent px-4 text-xs font-semibold text-ink disabled:opacity-60"
          >
            {pending ? "Syncing..." : "Sync manual"}
          </button>
        </div>
      </form>

      {error && <p role="alert" className="mt-3 text-sm text-coral-soft">{error}</p>}
      {summary && (
        <p className="mt-3 text-xs text-dim">
          {summary.added} new, {summary.matched} on Owely, {summary.invalid} skipped.
        </p>
      )}

      {sortedContacts.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {sortedContacts.map((contact) => (
            <li key={contact.phone} className="flex items-center gap-3 rounded-xl border border-white/6 bg-surface px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-hi">{contact.matchedName ?? contact.name}</p>
                  {contact.onOwely && (
                    <span className="shrink-0 rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-mint">
                      On Owely
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-dim">{contact.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => actOnContact(contact)}
                disabled={pending || busyPhone === contact.phone}
                className="flex h-10 shrink-0 items-center rounded-xl border border-white/8 px-3 text-xs font-semibold text-strong hover:bg-elevated disabled:opacity-60"
              >
                {busyPhone === contact.phone ? "..." : props.kind === "group" ? contact.onOwely ? "Add" : "Invite" : "Add"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
