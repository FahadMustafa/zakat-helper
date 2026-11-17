// Exact decimal arithmetic on scaled bigints. No floats touch money, quantities or prices.

const SCALE_DIGITS = 18;
const SCALE = 10n ** BigInt(SCALE_DIGITS);
const DECIMAL = /^-?\d+(\.\d+)?$/;

/** Divide with half-away-from-zero rounding. */
function divRound(n: bigint, d: bigint): bigint {
  if (d === 0n) throw new RangeError('Division by zero');
  const negative = n < 0n !== d < 0n;
  const an = n < 0n ? -n : n;
  const ad = d < 0n ? -d : d;
  const q = (an * 2n + ad) / (ad * 2n);
  return negative ? -q : q;
}

export class Dec {
  private constructor(private readonly scaled: bigint) {}

  static readonly ZERO = new Dec(0n);

  static parse(text: string): Dec {
    if (!DECIMAL.test(text)) throw new SyntaxError(`Not a decimal number: "${text}"`);
    const negative = text.startsWith('-');
    const [whole = '0', frac = ''] = (negative ? text.slice(1) : text).split('.');
    if (frac.length > SCALE_DIGITS) throw new RangeError(`Too many decimal places: "${text}"`);
    const scaled = BigInt(whole) * SCALE + BigInt(frac.padEnd(SCALE_DIGITS, '0'));
    return new Dec(negative ? -scaled : scaled);
  }

  static fromInt(n: number): Dec {
    if (!Number.isSafeInteger(n)) throw new RangeError(`Not a safe integer: ${n}`);
    return new Dec(BigInt(n) * SCALE);
  }

  static min(a: Dec, b: Dec): Dec {
    return a.cmp(b) <= 0 ? a : b;
  }

  static sum(values: readonly Dec[]): Dec {
    return values.reduce((acc, v) => acc.add(v), Dec.ZERO);
  }

  add(o: Dec): Dec {
    return new Dec(this.scaled + o.scaled);
  }

  sub(o: Dec): Dec {
    return new Dec(this.scaled - o.scaled);
  }

  mul(o: Dec): Dec {
    return new Dec(divRound(this.scaled * o.scaled, SCALE));
  }

  div(o: Dec): Dec {
    return new Dec(divRound(this.scaled * SCALE, o.scaled));
  }

  cmp(o: Dec): -1 | 0 | 1 {
    return this.scaled < o.scaled ? -1 : this.scaled > o.scaled ? 1 : 0;
  }

  isZero(): boolean {
    return this.scaled === 0n;
  }

  isNegative(): boolean {
    return this.scaled < 0n;
  }

  /** Round half away from zero to `digits` decimal places. */
  round(digits: number): Dec {
    if (!Number.isInteger(digits) || digits < 0 || digits > SCALE_DIGITS) {
      throw new RangeError(`Bad digits: ${digits}`);
    }
    const step = 10n ** BigInt(SCALE_DIGITS - digits);
    return new Dec(divRound(this.scaled, step) * step);
  }

  /** Shortest exact decimal string, e.g. "6937.5", "-25000.5", "0". */
  toString(): string {
    const negative = this.scaled < 0n;
    const abs = negative ? -this.scaled : this.scaled;
    const whole = abs / SCALE;
    const frac = (abs % SCALE).toString().padStart(SCALE_DIGITS, '0').replace(/0+$/, '');
    return `${negative ? '-' : ''}${whole.toString()}${frac ? `.${frac}` : ''}`;
  }
}

/** Minor-unit digits for an ISO 4217 currency (SAR 2, KWD 3, JPY 0). Throws on malformed codes; validate codes at the schema boundary. */
export function minorDigits(currency: string): number {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits;
  if (digits === undefined) throw new Error(`No minor-unit digits for ${currency}`);
  return digits;
}

export function roundToMinor(value: Dec, currency: string): Dec {
  return value.round(minorDigits(currency));
}
