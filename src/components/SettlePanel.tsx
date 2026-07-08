"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as QRCode from "qrcode";
import { memberAvatar } from "@/lib/avatar";
import { formatPaise } from "@/lib/money";
import { parseRupees } from "@/lib/parse-rupees";
import {
  buildDesktopQrPayload,
  buildSettlementReminderMessage,
  buildUpiIdNudgeMessage,
  buildWhatsAppShareUrl,
} from "@/lib/settlement-flow";
import { buildSettleLinks } from "@/lib/upi-links";
import { useReducedMotion } from "@/hooks/useReducedMotion";
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

export interface ReminderDebt {
  from: string;
  fromName: string;
  amount: number;
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
  owedToMe: ReminderDebt[];
  history: SettlementRow[];
}

type SheetPhase = "ready" | "awaiting" | "confirm" | "success";
type UpiApp = "GPay" | "PhonePe" | "Other UPI app";

export function SettlePanel({ groupId, groupName, myDebts, owedToMe, history }: Props) {
  const [activeDebt, setActiveDebt] = useState<SettleDebt | null>(null);
  const [optimisticHistory, setOptimisticHistory] = useState<SettlementRow[]>([]);
  const visibleHistory = useMemo(() => {
    const persistedIds = new Set(history.map((row) => row.id));
    return [...optimisticHistory.filter((row) => !persistedIds.has(row.id)), ...history];
  }, [history, optimisticHistory]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">Pay</p>
          <h2 className="font-display text-lg font-bold text-hi">Your outstanding dues</h2>
        </div>
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
            <DebtRow key={debt.to} debt={debt} onPay={() => setActiveDebt(debt)} />
          ))
        )}
      </section>

      {owedToMe.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">Remind</p>
            <h2 className="font-display text-lg font-bold text-hi">Owed to you</h2>
          </div>
          <ul className="flex flex-col gap-2">
            {owedToMe.map((debt) => (
              <ReminderRow key={debt.from} groupId={groupId} groupName={groupName} debt={debt} />
            ))}
          </ul>
        </section>
      )}

      {visibleHistory.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">History</h2>
          <ul className="flex flex-col gap-2">
            {visibleHistory.map((row) => (
              <HistoryRow key={row.id} groupId={groupId} row={row} />
            ))}
          </ul>
        </section>
      )}

      {activeDebt && (
        <PaymentSheet
          groupId={groupId}
          groupName={groupName}
          debt={activeDebt}
          onClose={() => setActiveDebt(null)}
          onSettled={(row) => setOptimisticHistory((current) => [row, ...current])}
        />
      )}
    </div>
  );
}

function DebtRow({ debt, onPay }: { debt: SettleDebt; onPay: () => void }) {
  const avatar = memberAvatar(debt.to);

  return (
    <article className="relative overflow-hidden rounded-3xl border border-accent2/20 bg-card p-5">
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-accent2 opacity-15 blur-[70px]" />
      <div className="relative flex items-center gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-base font-semibold ${avatar.bg} ${avatar.fg}`}>
          {debt.toName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">You owe {debt.toName}</p>
          <p className="mt-1 font-display text-3xl font-bold tracking-tight text-coral">{formatPaise(debt.amount)}</p>
          {debt.toUpiId ? (
            <p className="mt-1 truncate text-xs text-dim">{debt.toUpiId}</p>
          ) : debt.toPhone ? (
            <p className="mt-1 truncate text-xs text-dim">{debt.toPhone}</p>
          ) : (
            <p className="mt-1 text-xs text-coral-soft">Needs UPI ID or phone</p>
          )}
        </div>
        <button
          type="button"
          onClick={onPay}
          className="flex h-12 shrink-0 items-center justify-center rounded-2xl bg-accent px-5 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Pay
        </button>
      </div>
    </article>
  );
}

function PaymentSheet({
  groupId,
  groupName,
  debt,
  onClose,
  onSettled,
}: {
  groupId: string;
  groupName: string;
  debt: SettleDebt;
  onClose: () => void;
  onSettled: (row: SettlementRow) => void;
}) {
  const router = useRouter();
  const [amountRupees, setAmountRupees] = useState(debt.amountRupees);
  const [method, setMethod] = useState<SettlementMethod>("upi");
  const [ref, setRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SheetPhase>("ready");
  const [selectedApp, setSelectedApp] = useState<UpiApp | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<{ payload: string; url: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const avatar = memberAvatar(debt.to);

  const parsedPaise = parseRupees(amountRupees);
  const isValid = parsedPaise !== null;
  const amountTooHigh = isValid && parsedPaise > debt.amount;
  const linkPaise = isValid && !amountTooHigh ? parsedPaise : null;
  const links = linkPaise
    ? buildSettleLinks({
        upiId: debt.toUpiId,
        phone: debt.toPhone,
        payeeName: debt.toName,
        paise: linkPaise,
        note: `Owely - ${groupName}`,
      })
    : { gpay: null, phonepe: null, generic: null, hasAny: false };
  const qrPayload = buildDesktopQrPayload(links.generic);
  const qrImageUrl = qrDataUrl?.payload === qrPayload ? qrDataUrl.url : null;

  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !pending) onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, pending]);

  useEffect(() => {
    function onVisibilityChange(): void {
      if (document.visibilityState === "visible" && phase === "awaiting") {
        sheetRef.current?.focus();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [phase]);

  useEffect(() => {
    let cancelled = false;
    if (!qrPayload) {
      return;
    }

    QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 176,
      color: { dark: "#0B0A0E", light: "#FFFFFF" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl({ payload: qrPayload, url });
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl((current) => (current?.payload === qrPayload ? null : current));
      });

    return () => {
      cancelled = true;
    };
  }, [qrPayload]);

  function resetPaymentAttempt(): void {
    setPhase("ready");
    setSelectedApp(null);
    setError(null);
  }

  function startExternalPayment(app: UpiApp): void {
    setSelectedApp(app);
    setPhase("awaiting");
    setError(null);
  }

  async function shareUpiNudge(): Promise<void> {
    const message = buildUpiIdNudgeMessage(debt.toName, groupName);
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      }
    }
    window.open(buildWhatsAppShareUrl(message), "_blank", "noopener,noreferrer");
  }

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
        amountRupees,
        method,
        paymentRef: ref.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSettled({
        id: res.data.settlementId,
        from: "me",
        to: debt.to,
        fromName: "You",
        toName: debt.toName,
        amount: parsedPaise,
        method,
        status: "completed",
        paymentRef: ref.trim() || undefined,
        canDispute: false,
      });
      router.refresh();
      setPhase("success");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/75 px-0 backdrop-blur-sm sm:px-6" role="presentation" onMouseDown={onClose}>
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settle-sheet-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        className={`max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border-t border-white/8 bg-card px-5 pb-8 pt-4 shadow-[0_-28px_80px_-40px_rgba(0,0,0,.95)] sm:mb-6 sm:rounded-[28px] sm:border sm:px-6 ${reducedMotion ? "" : "transition-transform duration-200 ease-out"}`}
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
        <header className="flex items-start gap-3">
          <span className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold ${avatar.bg} ${avatar.fg}`}>
            {debt.toName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Paying</p>
            <h2 id="settle-sheet-title" className="truncate font-display text-2xl font-bold text-hi">{debt.toName}</h2>
            <p className="mt-1 text-sm text-dim">Active debt: {formatPaise(debt.amount)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/8 text-strong hover:bg-surface disabled:opacity-60"
          >
            X
          </button>
        </header>

        {phase === "success" ? (
          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mint/15 text-3xl text-mint">✓</span>
            <div>
              <p className="font-display text-2xl font-bold text-hi">Payment recorded</p>
              <p className="mt-1 text-sm text-dim">Your history is updated while Owely refreshes the balance.</p>
            </div>
            <button type="button" onClick={onClose} className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl bg-accent px-5 font-semibold text-ink">
              Done
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`amount-${debt.to}`} className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Amount to settle (Rs)
              </label>
              <input
                id={`amount-${debt.to}`}
                type="text"
                inputMode="decimal"
                value={amountRupees}
                onChange={(event) => {
                  setAmountRupees(event.target.value);
                  setError(null);
                }}
                placeholder="0.00"
                disabled={pending || phase === "awaiting"}
                className="h-13 rounded-2xl border border-white/8 bg-surface px-4 font-display text-xl text-hi outline-none placeholder:text-faint focus:border-accent/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:opacity-70"
              />
              {!isValid && amountRupees.trim() !== "" && <p role="alert" className="text-sm text-coral-soft">Enter a valid rupee amount.</p>}
              {amountTooHigh && <p role="alert" className="text-sm text-coral-soft">You can record up to {formatPaise(debt.amount)}.</p>}
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/6 bg-surface p-1">
              {(["upi", "cash"] as const).map((option) => {
                const active = method === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setMethod(option);
                      resetPaymentAttempt();
                    }}
                    disabled={pending || phase === "awaiting"}
                    className={`flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${active ? "bg-accent text-ink" : "text-muted hover:bg-card hover:text-strong"}`}
                  >
                    {option === "upi" ? "UPI" : "Cash"}
                  </button>
                );
              })}
            </div>

            {method === "upi" && phase === "ready" && (
              links.hasAny ? (
                <div className="flex flex-col gap-3">
                  <UpiAppLink app="GPay" href={links.gpay} onStart={startExternalPayment} />
                  <UpiAppLink app="PhonePe" href={links.phonepe} onStart={startExternalPayment} />
                  <UpiAppLink app="Other UPI app" href={links.generic} onStart={startExternalPayment} />
                  {qrImageUrl && (
                    <div className="hidden items-center gap-4 rounded-2xl border border-white/8 bg-surface p-3 sm:flex">
                      {/* eslint-disable-next-line @next/next/no-img-element -- qrcode returns a generated data URL, not a static asset. */}
                      <img src={qrImageUrl} alt="UPI payment QR code" className="h-32 w-32 rounded-xl bg-white p-1" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-hi">Scan with any UPI app</p>
                        <p className="mt-1 text-xs leading-5 text-dim">Desktop browsers cannot open UPI intents reliably.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-coral/20 bg-coral/10 p-4">
                  <p className="text-sm font-semibold text-coral">Ask {debt.toName} to add a UPI ID</p>
                  <p className="mt-1 text-sm leading-6 text-coral-soft">No UPI ID or phone is available for this member.</p>
                  <button type="button" onClick={shareUpiNudge} className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-coral/30 px-4 text-sm font-semibold text-coral hover:bg-coral/10">
                    Share nudge
                  </button>
                </div>
              )
            )}

            {method === "upi" && phase === "awaiting" && (
              <div className="rounded-2xl border border-accent/20 bg-accent/10 p-4">
                <p className="font-semibold text-hi">Complete the payment in {selectedApp}, then come back.</p>
                <p className="mt-1 text-sm leading-6 text-muted">Owely will wait here until you confirm whether the payment actually happened.</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => setPhase("confirm")} className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-accent px-4 font-semibold text-ink">
                    I&apos;ve paid
                  </button>
                  <button type="button" onClick={resetPaymentAttempt} className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-white/8 px-4 font-semibold text-strong hover:bg-surface">
                    I didn&apos;t pay
                  </button>
                </div>
              </div>
            )}

            {method === "cash" && phase === "ready" && (
              <button type="button" onClick={() => setPhase("confirm")} disabled={!isValid || amountTooHigh} className="flex h-14 items-center justify-center rounded-2xl bg-accent px-5 font-semibold text-ink disabled:opacity-60">
                Continue
              </button>
            )}

            {phase === "confirm" && (
              <div className="flex flex-col gap-3 rounded-2xl border border-white/6 bg-surface p-3">
                <label htmlFor={`ref-${debt.to}`} className="text-sm text-muted">
                  {method === "upi" ? "UPI reference / UTR (optional)" : "Cash note (optional)"}
                </label>
                <input
                  id={`ref-${debt.to}`}
                  value={ref}
                  onChange={(event) => setRef(event.target.value)}
                  placeholder={method === "upi" ? "e.g. 4538xxxx1234" : "e.g. paid in person"}
                  maxLength={64}
                  disabled={pending}
                  className="h-11 rounded-xl border border-white/8 bg-card px-3 text-hi outline-none placeholder:text-faint focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
                />
                {error && <p role="alert" className="text-sm text-coral-soft">{error}</p>}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={confirmPaid} disabled={pending || !isValid || amountTooHigh} className="flex h-12 flex-1 items-center justify-center rounded-xl bg-accent px-4 font-semibold text-ink transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60">
                    {pending ? "Saving..." : "Confirm paid"}
                  </button>
                  <button type="button" onClick={resetPaymentAttempt} disabled={pending} className="flex h-12 flex-1 items-center justify-center rounded-xl border border-white/8 px-4 font-semibold text-strong hover:bg-card disabled:opacity-60">
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UpiAppLink({ app, href, onStart }: { app: UpiApp; href: string | null; onStart: (app: UpiApp) => void }) {
  if (!href) return null;
  const iconClass = app === "GPay" ? "bg-[#0F9D58] text-white" : app === "PhonePe" ? "bg-[#5f259f] text-white" : "bg-elevated text-accent2";
  const iconText = app === "Other UPI app" ? "UPI" : app.charAt(0);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => onStart(app)}
      className="flex h-14 items-center gap-4 rounded-2xl border border-white/8 bg-surface px-4 font-semibold text-hi transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${iconClass}`}>{iconText}</span>
      <span>{app}</span>
    </a>
  );
}

function ReminderRow({ groupId, groupName, debt }: { groupId: string; groupName: string; debt: ReminderDebt }) {
  const avatar = memberAvatar(debt.from);

  async function remind(): Promise<void> {
    const settleUrl = `${window.location.origin}/groups/${groupId}/settle`;
    const message = buildSettlementReminderMessage({
      payerName: debt.fromName,
      payeeName: "you",
      amount: debt.amount,
      groupName,
      settleUrl,
    });

    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      }
    }

    window.open(buildWhatsAppShareUrl(message), "_blank", "noopener,noreferrer");
  }

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-white/6 bg-card px-4 py-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold ${avatar.bg} ${avatar.fg}`}>
        {debt.fromName.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-hi">{debt.fromName}</p>
        <p className="text-xs text-mint">Owes you {formatPaise(debt.amount)}</p>
      </div>
      <button type="button" onClick={remind} className="flex h-11 shrink-0 items-center justify-center rounded-xl border border-white/8 px-4 text-sm font-semibold text-strong hover:bg-surface">
        Remind
      </button>
    </li>
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
      if (!res.ok) {
        alert(res.error);
        return;
      }
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
