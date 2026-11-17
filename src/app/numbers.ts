import type { Locale } from './dates';

const DIGIT_MAP: Record<string, string> = {};
for (let i = 0; i < 10; i++) {
  DIGIT_MAP[String.fromCharCode(0x0660 + i)] = String(i); // Arabic-Indic
  DIGIT_MAP[String.fromCharCode(0x06f0 + i)] = String(i); // Extended Arabic-Indic (Persian/Urdu)
}

const GROUPED = /^\d{1,3}(,\d{3})+$/;
const PLAIN = /^\d+$/;

/**
 * Parse what someone typed into an amount field into a decimal string.
 * "." and "٫" are decimal points; "," and "٬" are thousands separators and must be well placed.
 * Anything ambiguous is rejected rather than guessed.
 */
export function parseAmountInput(text: string): { ok: true; value: string } | { ok: false } {
  const normalised = text
    .trim()
    .replace(/[٠-٩۰-۹]/g, (c) => DIGIT_MAP[c] ?? c)
    .replace(/٫/g, '.')
    .replace(/٬/g, ',');
  const parts = normalised.split('.');
  if (parts.length > 2) return { ok: false };
  const [whole = '', frac] = parts;
  if (frac !== undefined && !PLAIN.test(frac)) return { ok: false };
  if (!PLAIN.test(whole) && !GROUPED.test(whole)) return { ok: false };
  const digits = whole.replace(/,/g, '');
  return { ok: true, value: frac === undefined ? digits : `${digits}.${frac}` };
}

const NUMBER_LOCALE = { en: 'en', ar: 'ar-SA-u-nu-latn' } as const;

/** Format a decimal string exactly (Intl accepts numeric strings), with the currency's minor digits. */
export function formatAmount(value: string, currency: string, locale: Locale): string {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits;
  return new Intl.NumberFormat(NUMBER_LOCALE[locale], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value as Intl.StringNumericLiteral);
}
