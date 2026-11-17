import { describe, expect, it } from 'vitest';
import { formatAmount, parseAmountInput, percent } from './numbers';

describe('parseAmountInput', () => {
  it('reads Arabic-Indic digits with Arabic separators', () => {
    expect(parseAmountInput('١٢٬٣٤٥٫٥٠')).toEqual({ ok: true, value: '12345.50' });
  });

  it('treats a comma as grouping, never as a decimal point', () => {
    expect(parseAmountInput('12,345.50')).toEqual({ ok: true, value: '12345.50' });
    expect(parseAmountInput('1,234')).toEqual({ ok: true, value: '1234' });
  });

  it('reads plain and Persian digits', () => {
    expect(parseAmountInput(' 95000 ')).toEqual({ ok: true, value: '95000' });
    expect(parseAmountInput('۱۲۳')).toEqual({ ok: true, value: '123' });
  });

  it('rejects ambiguous or malformed input', () => {
    for (const bad of [
      '1,2.3,4',
      '1.2.3',
      '12,34',
      '',
      '-5',
      '1e5',
      'abc',
      '1,234,56',
      '.5',
      '5.',
    ]) {
      expect(parseAmountInput(bad), bad).toEqual({ ok: false });
    }
  });
});

describe('formatAmount', () => {
  it('formats exactly from the decimal string, with grouping', () => {
    expect(formatAmount('6937.5', 'SAR', 'en')).toBe('6,937.50');
    expect(formatAmount('1234567.891', 'KWD', 'en')).toBe('1,234,567.891');
  });

  it('uses Western digits in Arabic', () => {
    expect(formatAmount('6937.5', 'SAR', 'ar')).toMatch(/6.937.50/);
  });
});

describe('percent', () => {
  it('shows rates exactly', () => {
    expect(percent('0.025')).toBe('2.5%');
    expect(percent('0.025775')).toBe('2.5775%');
  });
});
