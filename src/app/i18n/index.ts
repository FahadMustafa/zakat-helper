import type { Locale } from '../dates';
import { ar } from './ar';
import { en, type Messages } from './en';

export type { Messages };

const DICTS: Record<Locale, Messages> = { en, ar };

export function messages(locale: Locale): Messages {
  return DICTS[locale];
}

export function applyDocumentLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}
