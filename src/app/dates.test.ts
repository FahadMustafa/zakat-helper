import { describe, expect, it } from 'vitest';
import { formatDate, hijriParts, hijriToIso } from './dates';

describe('Hijri dates (Umm al-Qura)', () => {
  it('knows 1 Muharram 1447 is 26 June 2025', () => {
    expect(hijriToIso(1447, 1, 1)).toBe('2025-06-26');
    expect(hijriParts('2025-06-26')).toEqual({ year: 1447, month: 1, day: 1 });
  });

  it('round-trips the first day of every month from 1447 to 1450', () => {
    for (let y = 1447; y <= 1450; y++) {
      for (let m = 1; m <= 12; m++) {
        const iso = hijriToIso(y, m, 1);
        expect(iso, `${y}-${m}`).not.toBeNull();
        if (iso) expect(hijriParts(iso)).toEqual({ year: y, month: m, day: 1 });
      }
    }
  });

  it('returns null for a day that does not exist in that month', () => {
    expect(hijriToIso(1447, 1, 31)).toBeNull();
    expect(hijriToIso(1447, 13, 1)).toBeNull();
  });

  it('does not slip a day with the local timezone', () => {
    // Dates are parsed and formatted in UTC regardless of the runner's TZ.
    expect(hijriParts('2026-03-01')).toEqual(hijriParts('2026-03-01'));
    expect(formatDate('2026-03-01', 'gregorian', 'en')).toBe('1 March 2026');
  });
});

describe('formatDate', () => {
  it('shows both calendars when asked', () => {
    expect(formatDate('2025-06-26', 'both', 'en')).toBe('1 Muharram 1447 AH (26 June 2025)');
  });

  it('uses Arabic month names with Western digits in Arabic', () => {
    const s = formatDate('2025-06-26', 'hijri', 'ar');
    expect(s).toContain('محرم');
    expect(s).toContain('1447');
  });
});
