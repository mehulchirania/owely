"use client";

import { useState } from "react";
import { formatPaise } from "@/lib/money";
import { memberAvatar } from "@/lib/avatar";
import {
  buildGpayLink,
  buildPhonepeLink,
  buildPhoneUpiLink,
  buildUpiLink,
} from "@/lib/upi";
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
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<SettlementMethod>("upi");
  const [ref, setRef] = useState("");
  const avatar = memberAvatar(debt.to);

  /** Parse a rupee string the same way rupeesToPaise does on the server:
   *  - Split on ".", take up to 2 decimal places
   *  - Reject sub-paise (more than 2 decimal places)
   *  - Returns null for non-numeric or empty input
   */
  function parseRupees(raw: string): number | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(".");
    if (parts.length > 2) return null;
    if (parts[1] !== undefined && parts[1].length > 2) return null; // sub-paise
    const rupees = parseFloat(trimmed);
    if (!isFinite(rupees) || rupees <= 0) return null;
    return Math.round(rupees * 100);
  }

  const [amountRupees, setAmountRupees] = useState(debt.amountRupees);
  const parsedPaise = parseRupees(amountRupees);
  const isValid = parsedPaise !== null;
  const amountTooHigh = isValid && parsedPaise! > debt.amount;

  const payeeName = debt.toName;
  const note = `Owely - ${groupName}`;

  // Build UPI links via upi.ts (single source of truth)
  const linkPaise = isValid && !amountTooHigh ? parsedPaise! : null;

  const gpayLink = linkPaise
    ? debt.toUpiId
      ? buildGpayLink({ phone: debt.toUpiId.split("@")[0], payeeName, paise: linkPaise, note })
      : debt.toPhone
        ? buildGpayLink({ phone: debt.toPhone, payeeName, paise: linkPaise, note })
        : null
    : null;

  const phonepeLink = linkPaise
    ? debt.toUpiId
      ? buildPhonepeLink({ phone: debt.toUpiId.split("@")[0], payeeName, paise: linkPaise, note })
      : debt.toPhone
        ? buildPhonepeLink({ phone: debt.toPhone, payeeName, paise: linkPaise, note })
        : null
    : null;

  const genericLink = linkPaise
    ? debt.toUpiId
      ? buildUpiLink({ upiId: debt.toUpiId, payeeName, paise: linkPaise, note })
      : debt.toPhone
        ? buildPhoneUpiLink({ phone: debt.toPhone, payeeName, paise: linkPaise, note })
        : null
    : null;

  const hasUpiOption = !!(debt.toUpiId || debt.toPhone);

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

          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="mt-4 flex h-11 items-center justify-center rounded-xl bg-accent px-4 text-xs font-semibold text-ink transition-all hover:brightness-110 active:scale-95"
            >
              Pay via UPI
            </button>
          ) : (
            <div className="mt-5 border-t border-white/6 pt-4 flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-dim mb-1">
                  Amount (₹)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  className="w-full h-11 rounded-xl border border-white/8 bg-surface px-3 text-sm text-hi placeholder-faint focus:border-accent focus:outline-none"
                />
                {amountTooHigh && (
                  <p className="mt-1 text-xs text-destructive font-medium">
                    Max {formatPaise(debt.amount)}
                  </p>
                )}
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
                      className={`flex-1 h-11 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-colors ${
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
                    Open UPI App
                  </label>
                  {!hasUpiOption ? (
                    <p className="text-[11px] text-faint bg-white/4 p-2 rounded-lg">
                      Payee has not set a UPI ID or phone number. Record cash or settle manually.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {gpayLink && (
                        <a
                          href={gpayLink}
                          className="flex h-11 items-center justify-center rounded-lg border border-white/8 bg-surface text-[11px] font-semibold hover:bg-elevated transition-colors"
                        >
                          GPay
                        </a>
                      )}
                      {phonepeLink && (
                        <a
                          href={phonepeLink}
                          className="flex h-11 items-center justify-center rounded-lg border border-white/8 bg-surface text-[11px] font-semibold hover:bg-elevated transition-colors"
                        >
                          PhonePe
                        </a>
                      )}
                      {genericLink && (
                        <a
                          href={genericLink}
                          className="flex h-11 items-center justify-center rounded-lg border border-white/8 bg-surface text-[11px] font-semibold hover:bg-elevated transition-colors"
                        >
                          Generic
                        </a>
                      )}
                    </div>
                  )}
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
                    className="w-full h-11 rounded-xl border border-white/8 bg-surface px-3 text-sm text-hi placeholder-faint focus:border-accent focus:outline-none"
                  />
                </div>
              )}

              <p className="text-[11px] text-dim bg-white/4 rounded-xl p-3 leading-relaxed">
                Once you&apos;ve paid, ask a group member to confirm the settlement in their Owely app. Or
                <strong> sign up to claim your account</strong> and confirm it yourself.
              </p>

              <button
                onClick={() => setOpen(false)}
                className="h-11 rounded-xl border border-white/8 bg-surface text-xs font-semibold text-strong hover:bg-elevated transition-colors"
              >
                Close
              </button>
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
