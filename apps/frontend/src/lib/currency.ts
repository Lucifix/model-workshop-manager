import { useSettings } from "../api/client";

/** Keep in sync with CURRENCIES in apps/backend/src/db/schema.ts. */
export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "CNY",
  "SEK",
  "NOK",
  "DKK",
  "NZD",
  "PLN",
  "BRL",
  "MXN",
  "INR",
  "KRW",
  "SGD",
  "HKD",
  "ZAR",
] as const;

const DEFAULT_CURRENCY = "USD";

export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
}

/** Formats amounts in the user's configured display currency. Falls back to
 * USD while settings are still loading. */
export function useFormatCurrency() {
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? DEFAULT_CURRENCY;
  return (value: number) => formatCurrency(value, currency);
}
