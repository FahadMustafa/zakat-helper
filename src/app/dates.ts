// Stored dates are ISO Gregorian (YYYY-MM-DD). Hijri (Umm al-Qura) is for display and input only.
// Everything runs in UTC so a date never slips a day with the viewer's timezone.

export type Locale = 'en' | 'ar';
export type DateDisplay = 'hijri' | 'gregorian' | 'both';

const DAY_MS = 86_400_000;
const OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
};
const HIJRI = {
  en: 'en-GB-u-ca-islamic-umalqura-nu-latn',
  ar: 'ar-SA-u-ca-islamic-umalqura-nu-latn',
} as const;
const GREGORIAN = { en: 'en-GB', ar: 'ar-u-ca-gregory-nu-latn' } as const;
const PARTS = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});
/** 1 Muharram 1447 = 2025-06-26, the anchor for estimating before the exact search. */
const ANCHOR = { year: 1447, ms: Date.UTC(2025, 5, 26) };

function toDate(iso: string): Date {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new RangeError(`Not an ISO date: ${iso}`);
  return d;
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function formatDate(iso: string, display: DateDisplay, locale: Locale): string {
  const d = toDate(iso);
  const hijri = new Intl.DateTimeFormat(HIJRI[locale], OPTIONS).format(d);
  const gregorian = new Intl.DateTimeFormat(GREGORIAN[locale], OPTIONS).format(d);
  switch (display) {
    case 'hijri':
      return hijri;
    case 'gregorian':
      return gregorian;
    case 'both':
      return `${hijri} (${gregorian})`;
  }
}

export type HijriDate = { year: number; month: number; day: number };

export function hijriParts(iso: string): HijriDate {
  const parts = PARTS.formatToParts(toDate(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** Gregorian ISO date for a Hijri date, or null when that day does not exist. */
export function hijriToIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 30) return null;
  const estimate =
    ANCHOR.ms +
    Math.round(((year - ANCHOR.year) * 354.367 + (month - 1) * 29.53 + (day - 1)) * DAY_MS);
  for (let offset = 0; offset <= 40; offset++) {
    for (const sign of [1, -1]) {
      const iso = toIso(estimate + sign * offset * DAY_MS);
      const h = hijriParts(iso);
      if (h.year === year && h.month === month && h.day === day) return iso;
    }
  }
  return null;
}
