/**
 * Lightweight mantissa-exponent decimal for incremental games.
 *
 * Value = mantissa × 10^exponent, where 1 <= |mantissa| < 10 (or mantissa === 0).
 * All arithmetic and comparison methods accept either a Decimal instance or a plain number.
 * All operations return new Decimal instances (immutable value objects).
 */
export class Decimal {
  readonly mantissa: number;
  readonly exponent: number;

  // ─── Construction ────────────────────────────────────────────
  constructor(mantissa: number, exponent: number = 0) {
    if (mantissa === 0 || !Number.isFinite(mantissa) || !Number.isFinite(exponent)) {
      this.mantissa = 0;
      this.exponent = 0;
      return;
    }
    // Fold a fractional exponent into the mantissa so the exponent stays an integer.
    const intExponent = Math.floor(exponent);
    let m = intExponent === exponent ? mantissa : mantissa * 10 ** (exponent - intExponent);
    // normalize so that 1 <= |mantissa| < 10
    let log = Math.floor(Math.log10(Math.abs(m)));
    // 10 ** log can be imprecise for very small/large magnitudes; divide in two steps.
    m = log > 300 || log < -300 ? m / 10 ** Math.trunc(log / 2) / 10 ** (log - Math.trunc(log / 2)) : m / 10 ** log;
    // Guard against float drift leaving the mantissa at 10 or just under 1.
    if (Math.abs(m) >= 10) {
      m /= 10;
      log += 1;
    } else if (Math.abs(m) < 1) {
      m *= 10;
      log -= 1;
    }
    this.mantissa = m;
    this.exponent = intExponent + log;
  }

  /** Build 10^log10Value without overflowing JS numbers. */
  static fromLog10(log10Value: number): Decimal {
    if (!Number.isFinite(log10Value)) return Decimal.ZERO;
    const exponent = Math.floor(log10Value);
    return new Decimal(10 ** (log10Value - exponent), exponent);
  }

  static ZERO = new Decimal(0, 0);
  static ONE = new Decimal(1, 0);

  static from(value: number | Decimal): Decimal {
    if (value instanceof Decimal) return value;
    if (value === 0 || !Number.isFinite(value)) return Decimal.ZERO;
    return new Decimal(value, 0);
  }

  private static toDecimal(val: Decimal | number): Decimal {
    if (val instanceof Decimal) return val;
    return Decimal.from(val);
  }

  // ─── Serialization ──────────────────────────────────────────
  toJSON(): { m: number; e: number } {
    return { m: this.mantissa, e: this.exponent };
  }

  static fromJSON(json: unknown): Decimal {
    if (!json || typeof json !== 'object') return Decimal.ZERO;
    const { m, e } = json as { m?: unknown; e?: unknown };
    if (typeof m !== 'number' || typeof e !== 'number' || !Number.isFinite(m) || !Number.isFinite(e)) {
      return Decimal.ZERO;
    }
    return new Decimal(m, e);
  }

  // ─── Helpers ─────────────────────────────────────────────────
  isZero(): boolean {
    return this.mantissa === 0;
  }

  isPositive(): boolean {
    return this.mantissa > 0;
  }

  isNegative(): boolean {
    return this.mantissa < 0;
  }

  toNumber(): number {
    if (this.isZero()) return 0;
    if (this.exponent > 308) return Infinity;
    if (this.exponent < -324) return 0;
    return this.mantissa * 10 ** this.exponent;
  }

  /** Align two Decimals to the larger exponent, return [aM, bM, exp]. */
  private static align(a: Decimal, b: Decimal): [number, number, number] {
    if (a.isZero()) return [0, b.mantissa, b.exponent];
    if (b.isZero()) return [a.mantissa, 0, a.exponent];
    const expDiff = a.exponent - b.exponent;
    if (expDiff >= 0) {
      return [a.mantissa, b.mantissa / 10 ** expDiff, a.exponent];
    }
    return [a.mantissa / 10 ** -expDiff, b.mantissa, b.exponent];
  }

  // ─── Arithmetic ──────────────────────────────────────────────
  add(other: Decimal | number): Decimal {
    const o = Decimal.toDecimal(other);
    if (this.isZero()) return o;
    if (o.isZero()) return this;
    const expDiff = this.exponent - o.exponent;
    if (expDiff > 17) return this;
    if (expDiff < -17) return o;
    const [aM, bM, exp] = Decimal.align(this, o);
    return new Decimal(aM + bM, exp);
  }

  subtract(other: Decimal | number): Decimal {
    const o = Decimal.toDecimal(other);
    if (o.isZero()) return this;
    const expDiff = this.exponent - o.exponent;
    if (expDiff > 17) return this;
    if (expDiff < -17) return new Decimal(-o.mantissa, o.exponent);
    const [aM, bM, exp] = Decimal.align(this, o);
    return new Decimal(aM - bM, exp);
  }

  multiply(other: Decimal | number): Decimal {
    const o = Decimal.toDecimal(other);
    if (this.isZero() || o.isZero()) return Decimal.ZERO;
    return new Decimal(
      this.mantissa * o.mantissa,
      this.exponent + o.exponent,
    );
  }

  multiplyScalar(n: number): Decimal {
    if (n === 0 || this.isZero() || !Number.isFinite(n)) return Decimal.ZERO;
    return new Decimal(this.mantissa * n, this.exponent);
  }

  divide(other: Decimal | number): Decimal {
    const o = Decimal.toDecimal(other);
    if (o.isZero() || this.isZero()) return Decimal.ZERO;
    return new Decimal(
      this.mantissa / o.mantissa,
      this.exponent - o.exponent,
    );
  }

  pow(n: number): Decimal {
    if (n === 0) return Decimal.ONE;
    if (this.isZero() || !Number.isFinite(n)) return Decimal.ZERO;
    // Work in log space: Math.pow(mantissa, n) overflows to Infinity for large n.
    const log10Value = n * (Math.log10(Math.abs(this.mantissa)) + this.exponent);
    const magnitude = Decimal.fromLog10(log10Value);
    return this.mantissa < 0 && n % 2 !== 0 ? magnitude.multiplyScalar(-1) : magnitude;
  }

  // ─── Comparison ──────────────────────────────────────────────
  compareTo(other: Decimal | number): number {
    const o = Decimal.toDecimal(other);
    if (this.isZero() && o.isZero()) return 0;
    if (this.isZero()) return o.mantissa > 0 ? -1 : 1;
    if (o.isZero()) return this.mantissa > 0 ? 1 : -1;

    // Different signs
    if (this.mantissa > 0 && o.mantissa < 0) return 1;
    if (this.mantissa < 0 && o.mantissa > 0) return -1;

    const sign = this.mantissa > 0 ? 1 : -1;
    if (this.exponent !== o.exponent) {
      return (this.exponent > o.exponent ? 1 : -1) * sign;
    }
    if (this.mantissa === o.mantissa) return 0;
    return (this.mantissa > o.mantissa ? 1 : -1);
  }

  gte(other: Decimal | number): boolean {
    return this.compareTo(other) >= 0;
  }
  gt(other: Decimal | number): boolean {
    return this.compareTo(other) > 0;
  }
  lte(other: Decimal | number): boolean {
    return this.compareTo(other) <= 0;
  }
  lt(other: Decimal | number): boolean {
    return this.compareTo(other) < 0;
  }
  eq(other: Decimal | number): boolean {
    return this.compareTo(other) === 0;
  }
}
