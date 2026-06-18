"use client";

/**
 * Settle-up UI. UPI links open the user's payment app in a new context, then
 * the user explicitly records the payment with an optional reference.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatPaise } from "@/lib/money";
import { memberAvatar } from "@/lib/avatar";
import { cleanPhone } from "@/lib/upi";
import { disputeSettlement, settleUp } from "@/features/settlements/actions";
import type { SettlementMethod, SettlementStatus } from "@/types";

export interface SettleDebt {
  to: string;
  toName: string;
  toUpiId?: string;
  toPhone?: string;
  amount: number;
  amountRupees: string;
}

export interface SettlementRow {
  id: string;
  from: string;
  to: string;
  fromName: string;
  toName: string;
  amount: number;
  method: SettlementMethod;
  status: SettlementStatus;
  paymentRef?: string;
  canDispute: boolean;
}

interface Props {
  groupId: string;
  groupName: string;
  myDebts: SettleDebt[];
  history: SettlementRow[];
}


export function SettlePanel({ groupId, groupName, myDebts, history }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        {myDebts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/6 bg-card px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint/15 text-2xl" role="img" aria-label="celebrate">
              {"\u{1F389}"}
            </span>
            <p className="font-medium text-strong">You&apos;re all squared up</p>
            <p className="text-sm text-dim">You don&apos;t owe anyone in this group.</p>
          </div>
        ) : (
          myDebts.map((debt) => (
            <DebtCard key={debt.to} groupId={groupId} groupName={groupName} debt={debt} />
          ))
        )}
      </section>

      {history.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">History</h2>
          <ul className="flex flex-col gap-2">
            {history.map((row) => (
              <HistoryRow key={row.id} groupId={groupId} row={row} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function DebtCard({ groupId, groupName, debt }: { groupId: string; groupName: string; debt: SettleDebt }) {
  const router = useRouter();
  const [marking, setMarking] = useState(false);
  const [amountRupees, setAmountRupees] = useState(debt.amountRupees);
  const [method, setMethod] = useState<SettlementMethod>("upi");
  const [ref, setRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const avatar = memberAvatar(debt.to);

  const parsedPaise = Math.round(parseFloat(amountRupees || "0") * 100);
  const isValid = !isNaN(parsedPaise) && parsedPaise > 0;
  const amountTooHigh = isValid && parsedPaise > debt.amount;

  const payeeName = debt.toName;
  const note = `Owely - ${groupName}`;
  const amountStr = isValid ? (parsedPaise / 100).toFixed(2) : "0.00";

  // GPay target: if upiId exists, use it. Otherwise use phone@upi
  const gpayVpa = debt.toUpiId || (debt.toPhone ? `${cleanPhone(debt.toPhone)}@upi` : null);
  const gpayLink = isValid && gpayVpa
    ? `intent://upi/pay?pa=${encodeURIComponent(gpayVpa)}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=INR${note ? `&tn=${encodeURIComponent(note)}` : ""}#Intent;scheme=tez;package=com.google.android.apps.nbu.paisa.user;end`
    : null;

  // PhonePe target: if upiId exists, use it. Otherwise use phone@ybl
  const phonepeVpa = debt.toUpiId || (debt.toPhone ? `${cleanPhone(debt.toPhone)}@ybl` : null);
  const phonepeLink = isValid && phonepeVpa
    ? `intent://pay?pa=${encodeURIComponent(phonepeVpa)}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=INR${note ? `&tn=${encodeURIComponent(note)}` : ""}#Intent;scheme=phonepe;package=com.phonepe.app;end`
    : null;

  // Generic UPI: if upiId exists, use it. Otherwise use phone
  const genericVpa = debt.toUpiId || (debt.toPhone ? cleanPhone(debt.toPhone) : null);
  const genericLink = isValid && genericVpa
    ? `upi://pay?pa=${encodeURIComponent(genericVpa)}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=INR${note ? `&tn=${encodeURIComponent(note)}` : ""}`
    : null;

  function confirmPaid(): void {
    if (!isValid) {
      setError("Please enter a valid amount.");
      return;
    }
    if (amountTooHigh) {
      setError(`You can record up to ${formatPaise(debt.amount)}.`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await settleUp({
        groupId,
        to: debt.to,
        amountRupees: amountRupees,
        method,
        paymentRef: ref.trim() || undefined,
      });
      if (!res.ok) { setError(res.error); return; }
      router.refresh();
      setMarking(false);
      setRef("");
    });
  }

  return (
    <article className="relative overflow-hidden rounded-3xl border border-accent2/20 bg-card p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-accent2 opacity-15 blur-[70px]"
      />
      <div className="relative flex items-start gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-base font-semibold ${avatar.bg} ${avatar.fg}`}>
          {debt.toName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">You owe {debt.toName}</p>
          <p className="mt-1 font-display text-4xl font-bold tracking-tight text-coral">
            {formatPaise(debt.amount)}
          </p>
          {debt.toUpiId ? (
            <p className="mt-1 truncate text-xs text-dim">{debt.toUpiId}</p>
          ) : debt.toPhone ? (
            <p className="mt-1 truncate text-xs text-dim">{debt.toPhone}</p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-coral-soft">
              No registered phone or UPI ID found. Settle manually.
            </p>
          )}
        </div>
      </div>

      <div className="relative mt-5 flex flex-col gap-4">
        {/* Amount Input */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`amount-${debt.to}`} className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Amount to settle (₹)
          </label>
          <input
            id={`amount-${debt.to}`}
            type="number"
            step="0.01"
            min="0.01"
            max={debt.amountRupees}
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
            placeholder="0.00"
            disabled={pending}
            className="h-12 rounded-xl border border-white/8 bg-surface px-3 font-display text-lg text-hi outline-none focus:border-accent/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
          />
          {amountTooHigh && (
            <p role="alert" className="text-sm text-coral-soft">
              You can record up to {formatPaise(debt.amount)}.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/6 bg-surface p-1">
          {(["upi", "cash"] as const).map((option) => {
            const active = method === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setMethod(option)}
                disabled={pending}
                className={`flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${active ? "bg-accent text-ink" : "text-muted hover:bg-card hover:text-strong"}`}
              >
                {option === "upi" ? "UPI" : "Cash"}
              </button>
            );
          })}
        </div>

        {/* UPI payment links */}
        {isValid && method === "upi" && (gpayLink || phonepeLink || genericLink) && (
          <div className="flex flex-col gap-2">
            {gpayLink && (
              <a
                href={gpayLink}
                target="_blank"
                rel="noreferrer"
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0F9D58] hover:bg-[#0B8043] px-6 font-semibold text-white shadow-[0_12px_24px_-10px_#0F9D58] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Pay with Google Pay
              </a>
            )}
            {phonepeLink && (
              <a
                href={phonepeLink}
                target="_blank"
                rel="noreferrer"
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#5f259f] hover:bg-[#4a1c7d] px-6 font-semibold text-white shadow-[0_12px_24px_-10px_#5f259f] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Pay with PhonePe
              </a>
            )}
            {genericLink && (
              <a
                href={genericLink}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/8 bg-elevated px-6 text-sm font-semibold text-strong transition-colors hover:bg-segment focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Pay via other UPI App
              </a>
            )}
          </div>
        )}

        {!marking ? (
          <button
            type="button"
            onClick={() => setMarking(true)}
            className="flex h-12 items-center justify-center rounded-2xl border border-white/8 bg-elevated px-6 font-semibold text-strong transition-colors hover:bg-segment focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            I&apos;ve paid - mark as settled
          </button>
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl border border-white/6 bg-surface p-3">
            <label htmlFor={`ref-${debt.to}`} className="text-sm text-muted">
              {method === "upi" ? "UPI reference / UTR (optional)" : "Cash note (optional)"}
            </label>
            <input
              id={`ref-${debt.to}`}
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder={method === "upi" ? "e.g. 4538xxxx1234" : "e.g. paid in person"}
              maxLength={64}
              disabled={pending}
              className="h-11 rounded-xl border border-white/8 bg-card px-3 text-hi outline-none placeholder:text-faint focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
            />
            {error && <p role="alert" className="text-sm text-coral-soft">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmPaid}
                disabled={pending || !isValid || amountTooHigh}
                className="flex h-11 flex-1 items-center justify-center rounded-xl bg-accent px-4 font-semibold text-ink transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
              >
                {pending ? "Saving..." : "Confirm paid"}
              </button>
              <button
                type="button"
              onClick={() => { setMarking(false); setError(null); }}
                disabled={pending}
                className="flex h-11 items-center justify-center rounded-xl border border-white/8 px-4 font-semibold text-strong hover:bg-card"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function HistoryRow({ groupId, row }: { groupId: string; row: SettlementRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const statusClass = row.status === "disputed"
    ? "bg-coral/10 text-coral"
    : "bg-mint/10 text-mint";

  function dispute(): void {
    if (!confirm("Mark this payment as not received? The debt will be restored.")) return;
    startTransition(async () => {
      const res = await disputeSettlement({ groupId, settlementId: row.id });
      if (!res.ok) { alert(res.error); return; }
      router.refresh();
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-white/6 bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-strong">
          <span className="font-semibold text-hi">{row.fromName}</span> paid{" "}
          <span className="font-semibold text-hi">{row.toName}</span>{" "}
          {formatPaise(row.amount)}
        </p>
        <p className="truncate text-xs text-dim">
          {row.method === "upi" ? "UPI" : "Cash"}
          {row.paymentRef ? ` - Ref: ${row.paymentRef}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
          {row.status === "disputed" ? "disputed" : "settled"}
        </span>
        {row.canDispute && (
          <button
            type="button"
            onClick={dispute}
            disabled={pending}
            className="text-xs font-semibold text-dim underline-offset-2 hover:text-strong hover:underline disabled:opacity-60"
          >
            {pending ? "..." : "Dispute"}
          </button>
        )}
      </div>
    </li>
  );
}
