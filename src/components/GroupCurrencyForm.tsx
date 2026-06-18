"use client";

import { useState, useTransition } from "react";
import { setGroupBaseCurrency } from "@/features/currency/actions";
import { SUPPORTED_CURRENCY_CODES, currencyLabel } from "@/lib/currency";
import type { CurrencyCode } from "@/types";

interface Props {
  groupId: string;
  current: CurrencyCode;
  isCreator: boolean;
  isPaid: boolean;
}

export function GroupCurrencyForm({ groupId, current, isCreator, isPaid }: Props) {
  const [currency, setCurrency] = useState<CurrencyCode>(current);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canEdit = isCreator && isPaid;

  function handleChange(next: CurrencyCode) {
    setCurrency(next);
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await setGroupBaseCurrency({ groupId, currency: next });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error);
        setCurrency(current);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-[13px] border border-white/7 bg-surface px-4 py-3">
      <div>
        <p className="text-[13px] font-semibold text-hi">Base currency</p>
        <p className="text-[11px] text-dim">
          {canEdit ? "Affects all expenses in this group." : "Set by the group creator."}
        </p>
      </div>
      {canEdit ? (
        <div className="flex flex-col items-end gap-1">
          <select
            value={currency}
            onChange={(e) => handleChange(e.target.value as CurrencyCode)}
            disabled={pending}
            aria-label="Group base currency"
            className="h-8 rounded-[9px] border border-white/8 bg-card px-2.5 text-[12.5px] text-hi outline-none focus:border-accent/60 [&>option]:bg-surface"
          >
            {SUPPORTED_CURRENCY_CODES.map((c) => (
              <option key={c} value={c}>{c} — {currencyLabel(c)}</option>
            ))}
          </select>
          {saved && <span className="text-[11px] text-mint">Saved</span>}
          {error && <span className="text-[11px] text-coral-soft">{error}</span>}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-strong">{currency}</span>
          {!isPaid && (
            <span className="rounded-full bg-accent/12 px-2 py-px text-[9px] font-bold uppercase tracking-[.1em] text-accent">Pro</span>
          )}
        </div>
      )}
    </div>
  );
}
