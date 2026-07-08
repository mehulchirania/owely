"use client";

import { useState, useTransition } from "react";
import { updateDisplayCurrency } from "@/features/currency/actions";
import { SUPPORTED_CURRENCY_CODES, currencyLabel } from "@/lib/currency";
import type { CurrencyCode } from "@/types";

interface Props {
  current: CurrencyCode;
  isPaid: boolean;
}

export function DisplayCurrencyForm({ current, isPaid }: Props) {
  const [currency, setCurrency] = useState<CurrencyCode>(current);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(next: CurrencyCode) {
    setCurrency(next);
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await updateDisplayCurrency({ currency: next });
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
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[13.5px] font-semibold text-hi">Display currency</p>
        <p className="text-[11.5px] text-dim">Changes how amounts are shown across all groups.</p>
      </div>
      {isPaid ? (
        <div className="flex flex-col items-end gap-1">
          <select
            value={currency}
            onChange={(e) => handleChange(e.target.value as CurrencyCode)}
            disabled={pending}
            aria-label="Display currency"
            className="min-h-[44px] rounded-[10px] border border-white/8 bg-card px-3 text-[13px] text-hi outline-none focus:border-accent/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent [&>option]:bg-surface"
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
          <span className="text-[13.5px] font-semibold text-strong">{currency}</span>
          <span className="rounded-full bg-accent/12 px-2 py-px text-[9px] font-bold uppercase tracking-[.1em] text-accent">Pro</span>
        </div>
      )}
    </div>
  );
}
