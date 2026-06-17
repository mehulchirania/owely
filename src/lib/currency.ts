import type { CurrencyCode } from "@/types";

export const SUPPORTED_CURRENCY_CODES = ["INR", "USD", "EUR", "GBP"] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCY_CODES)[number];

export function isSupportedCurrencyCode(value: string): value is SupportedCurrencyCode {
  return SUPPORTED_CURRENCY_CODES.includes(value as SupportedCurrencyCode);
}

export function currencyLabel(currency: CurrencyCode): string {
  switch (currency) {
    case "INR":
      return "Indian Rupee";
    case "USD":
      return "US Dollar";
    case "EUR":
      return "Euro";
    case "GBP":
      return "British Pound";
    default:
      return currency;
  }
}
