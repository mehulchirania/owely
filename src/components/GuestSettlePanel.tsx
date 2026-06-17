"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatPaise } from "@/lib/money";
import { memberAvatar } from "@/lib/avatar";
import { guestSettleUp } from "@/features/settlements/actions";
import type { SettlementMethod, SettlementStatus } from "@/types";

export interface GuestSettleDebt {
  to: string;
  toName: string;
  toUpiId?: string;
  toPhone?: string;
  amount: number;
  amountRupees: string;
}

export interface GuestSettlementRow {
  id: string;
  from: string;
  to: string;
  fromName: string;
  toName: string;
  amount: number;
  method: SettlementMethod;
  status: SettlementStatus;
  paymentRef?: string;
}

interface Props {
  groupId: string;
  groupName: string;

  myDebts: GuestSettleDebt[];
  history: GuestSettlementRow[];
}

function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function GuestSettlePanel({ groupId, groupName, myDebts, history }: Props) {
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
              <HistoryRow key={row.id} row={row} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function DebtCard({ groupId, groupName, debt }: { groupId: string; groupName: string; debt: GuestSettleDebt }) {
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

  const gpayVpa = debt.toUpiId || (debt.toPhone ? `${cleanPhone(debt.toPhone)}@upi` : null);
  const gpayLink = isValid && gpayVpa
    ? `intent://upi/pay?pa=${encodeURIComponent(gpayVpa)}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=INR${note ? `&tn=${encodeURIComponent(note)}` : ""}#Intent;scheme=tez;package=com.google.android.apps.nbu.paisa.user;end`
    : null;

  const phonepeVpa = debt.toUpiId || (debt.toPhone ? `${cleanPhone(debt.toPhone)}@ybl` : null);
  const phonepeLink = isValid && phonepeVpa
    ? `intent://pay?pa=${encodeURIComponent(phonepeVpa)}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=INR${note ? `&tn=${encodeURIComponent(note)}` : ""}#Intent;scheme=phonepe;package=com.phonepe.app;end`
    : null;

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
      const res = await guestSettleUp({
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
      <div className="relative flex items-start gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-base font-semibold ${avatar.bg} ${avatar.fg}`}>
          {debt.toName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted font-medium">You owe</p>
          <h4 className="font-display text-lg font-bold text-hi truncate">{debt.toName}</h4>
          <p className="font-display text-2xl font-bold text-coral mt-1">
            {formatPaise(debt.amount)}
          </p>

          {!marking ? (
            <button
              onClick={() => setMarking(true)}
              className="mt-4 flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-xs font-semibold text-ink transition-all hover:brightness-110 active:scale-95"
            >
              Settle dues
            </button>
          ) : (
            <div className="mt-5 border-t border-white/6 pt-4 flex flex-col gap-4">
              {error && <p className="text-xs text-destructive font-medium">{error}</p>}

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-dim mb-1">
                  Amount to record (₹)
                </label>
                <input
                  type="text"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  className="w-full h-10 rounded-xl border border-white/8 bg-surface px-3 text-sm text-hi placeholder-faint focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-dim mb-1.5">
                  Payment Method
                </label>
                <div className="flex gap-2">
                  {(["upi", "cash"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`flex-1 h-9 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-colors ${
                        method === m
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-white/8 bg-surface text-dim hover:bg-elevated"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {method === "upi" && (
                <div className="flex flex-col gap-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-dim">
                    Pay via UPI Apps
                  </label>
                  {(!debt.toUpiId && !debt.toPhone) ? (
                    <p className="text-[11px] text-faint bg-white/4 p-2 rounded-lg">
                      Payee has not set a UPI ID or phone number. Record cash or settle manually.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {gpayLink && (
                        <a
                          href={gpayLink}
                          className="flex h-9 items-center justify-center rounded-lg border border-white/8 bg-surface text-[11px] font-semibold hover:bg-elevated transition-colors"
                        >
                          GPay
                        </a>
                      )}
                      {phonepeLink && (
                        <a
                          href={phonepeLink}
                          className="flex h-9 items-center justify-center rounded-lg border border-white/8 bg-surface text-[11px] font-semibold hover:bg-elevated transition-colors"
                        >
                          PhonePe
                        </a>
                      )}
                      {genericLink && (
                        <a
                          href={genericLink}
                          className="flex h-9 items-center justify-center rounded-lg border border-white/8 bg-surface text-[11px] font-semibold hover:bg-elevated transition-colors"
                        >
                          Generic
                        </a>
                      )}
                    </div>
                  )}

                  <div className="mt-1">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-dim mb-1">
                      UPI Ref / UTR (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="12-digit transaction number"
                      value={ref}
                      onChange={(e) => setRef(e.target.value)}
                      className="w-full h-10 rounded-xl border border-white/8 bg-surface px-3 text-sm text-hi placeholder-faint focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {method === "cash" && (
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-dim mb-1">
                    Payment Note (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid in cash"
                    value={ref}
                    onChange={(e) => setRef(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/8 bg-surface px-3 text-sm text-hi placeholder-faint focus:border-accent focus:outline-none"
                  />
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setMarking(false)}
                  className="flex-1 h-10 rounded-xl border border-white/8 bg-surface text-xs font-semibold text-strong hover:bg-elevated transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPaid}
                  disabled={pending}
                  className="flex-1 h-10 rounded-xl bg-accent text-xs font-semibold text-ink hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {pending ? "Saving..." : "Confirm paid"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function HistoryRow({ row }: { row: GuestSettlementRow }) {
  const avatar = memberAvatar(row.from);
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-white/5 bg-card p-3">
      <span className={`flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold ${avatar.bg} ${avatar.fg}`}>
        {row.fromName.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-strong">
          <b>{row.fromName}</b> paid <b>{row.toName}</b>
        </p>
        <span className="text-[10px] text-dim capitalize">
          Via {row.method} · {row.status}
        </span>
      </div>
      <span className="font-display text-sm font-semibold text-mint">
        {formatPaise(row.amount)}
      </span>
    </li>
  );
}
