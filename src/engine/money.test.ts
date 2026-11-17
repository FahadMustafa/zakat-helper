import { describe, expect, it } from 'vitest';
import { Dec, minorDigits, roundToMinor } from './money';

describe('Dec', () => {
  it('adds without float error', () => {
    expect(Dec.parse('0.1').add(Dec.parse('0.2')).toString()).toBe('0.3');
  });

  it('multiplies and subtracts exactly', () => {
    expect(Dec.parse('18000').mul(Dec.parse('3.75')).toString()).toBe('67500');
    expect(Dec.parse('95000').sub(Dec.parse('120000.5')).toString()).toBe('-25000.5');
  });

  it('divides with half-up rounding at the internal scale', () => {
    // 100 g of 22k gold at 400/g pure: 100 * 22 * 400 / 24 = 36666.666...
    const v = Dec.parse('100').mul(Dec.parse('22')).mul(Dec.parse('400')).div(Dec.parse('24'));
    expect(roundToMinor(v, 'SAR').toString()).toBe('36666.67');
  });

  it('rejects malformed input loudly', () => {
    expect(() => Dec.parse('1,000')).toThrow();
    expect(() => Dec.parse('')).toThrow();
    expect(() => Dec.parse('1e5')).toThrow();
  });

  it('refuses division by zero', () => {
    expect(() => Dec.parse('1').div(Dec.parse('0'))).toThrow();
  });

  it('compares and takes the minimum', () => {
    expect(Dec.min(Dec.parse('2'), Dec.parse('1.5')).toString()).toBe('1.5');
    expect(Dec.parse('2').cmp(Dec.parse('2.0'))).toBe(0);
  });
});

describe('roundToMinor', () => {
  it('rounds SAR to 2 places half-up', () => {
    expect(roundToMinor(Dec.parse('6937.505'), 'SAR').toString()).toBe('6937.51');
    expect(roundToMinor(Dec.parse('6937.504'), 'SAR').toString()).toBe('6937.5');
  });

  it('rounds KWD to 3 places', () => {
    expect(minorDigits('KWD')).toBe(3);
    expect(roundToMinor(Dec.parse('1.23456'), 'KWD').toString()).toBe('1.235');
  });

  it('rounds negative values half away from zero', () => {
    expect(roundToMinor(Dec.parse('-1.005'), 'SAR').toString()).toBe('-1.01');
  });
});
