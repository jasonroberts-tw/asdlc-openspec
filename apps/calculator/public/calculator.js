/**
 * The calculator's logic: a pure state machine from key presses to the text the display shows. It
 * touches no DOM and does no I/O, so this one file runs unchanged as a module in the browser and
 * under Node's test runner, with no build step between them.
 *
 * Every value it computes with is an exact fraction of two `BigInt`s, and only the display rounds.
 * A typed number is read from its text, the four operations are exact, and a result is carried
 * into the next operation exactly, so `1 ÷ 3 × 3` is `1`. Nothing runs on binary doubles: their
 * error would reach the display (`0.1 + 0.2`), and a tie at the tenth digit would go whichever way
 * the double fell. The values are fractions rather than exact decimals because a third has no
 * finite decimal to carry.
 *
 * What it must do is capability `calculator`'s spec under `openspec/`, which wins over this file.
 * `press` and its helpers follow the transition table in the design of the change that added it,
 * row by row.
 */

/** How many significant digits the display shows: the spec's ten. Nothing else is rounded. */
const SIGNIFICANT_DIGITS = 10

/**
 * The largest finite double, `(2^53 - 1) · 2^971`: every bit of the significand set, at the largest
 * exponent. The spec's "too large to be a finite number" is a magnitude above it, compared exactly
 * with the fraction, so a result just under it is a result however its ten-digit display reads.
 */
const LARGEST_FINITE = (2n ** 53n - 1n) * 2n ** 971n

/** Zero in the one form `fraction` gives it: the value of a fresh state and of the error state. */
const ZERO = Object.freeze({ num: 0n, den: 1n })

const DIGITS = new Set('0123456789')

/** The four operations, each exact on fractions. `divide` returns null for a zero divisor. */
const OPERATORS = {
  '+': add,
  '-': subtract,
  '*': multiply,
  '/': divide,
}

/**
 * @typedef {object} Fraction an exact rational number, `num / den`, in lowest terms
 * @property {bigint} num the numerator, which carries the sign
 * @property {bigint} den the denominator, always positive
 */

/**
 * @typedef {object} State
 * @property {string | null} entry the number being typed, exactly as typed (`0.`, `1.50`), or null
 *   when none is
 * @property {Fraction} value the last completed number or result, exact and never rounded: the left
 *   operand of `op`
 * @property {'+' | '-' | '*' | '/' | null} op the pending operator, or null
 * @property {boolean} error true while `Error` is shown
 */

/** @returns {State} */
export function initialState() {
  return { entry: null, value: ZERO, op: null, error: false }
}

/**
 * The state after one key. It never changes the state it is given, and a key that changes nothing
 * still returns a copy, so a caller can keep any state it has seen.
 *
 * @param {State} state
 * @param {string} key one of `0`-`9`, `.`, `+`, `-`, `*`, `/`, `=` and `C`
 * @returns {State}
 */
export function press(state, key) {
  if (key === 'C') return initialState()
  // A digit or the point after Error starts a new calculation, so it starts from a clean state.
  if (DIGITS.has(key)) return typeDigit(state.error ? initialState() : state, key)
  if (key === '.') return typePoint(state.error ? initialState() : state)
  if (Object.hasOwn(OPERATORS, key)) return pressOperator(state, key)
  if (key === '=') return pressEquals(state)
  // The page maps its buttons and keyboard keys onto the keys above and drops every other key. One
  // that arrives anyway is a wiring bug, and a silent no-op would hide it.
  throw new RangeError(`press: ${JSON.stringify(key)} is not a calculator key`)
}

/**
 * What the display shows: `Error`, the number being typed exactly as typed, or else `value`
 * rounded for display, which is the last result or a typed number an operator took.
 *
 * @param {State} state
 * @returns {string}
 */
export function displayText(state) {
  if (state.error) return 'Error'
  if (state.entry !== null) return state.entry
  return format(state.value)
}

function typeDigit(state, digit) {
  // A lone leading zero is replaced rather than kept, so `0`, `7` shows `7` and never `07`.
  const entry = state.entry === null || state.entry === '0' ? digit : state.entry + digit
  return { ...state, entry }
}

function typePoint(state) {
  if (state.entry === null) return { ...state, entry: '0.' }
  if (state.entry.includes('.')) return { ...state }
  return { ...state, entry: `${state.entry}.` }
}

function pressOperator(state, op) {
  if (state.error) return { ...state }
  // No second number yet: the operator replaces a pending one, or continues from a result.
  if (state.entry === null) return { ...state, op }
  return takeEntry(state, op)
}

function pressEquals(state) {
  if (state.error || state.op === null || state.entry === null) return { ...state }
  return takeEntry(state, null)
}

/**
 * An operator or equals taking the typed entry, with `next` left pending: the entry becomes the
 * value, or, with an operation pending, completes it first (left to right, no precedence). The
 * three rows of the transition table that take an entry all come through here, so the check on the
 * typed number is written once and none of them can skip it.
 */
function takeEntry(state, next) {
  const typed = fromEntry(state.entry)
  // Entry has no digit limit, so `1` and 309 zeros can be typed. It is refused here, where it is
  // first taken as a number, and before any operation runs: as the divisor in `5 ÷`, it would make a
  // tiny result rather than an error.
  if (tooLarge(typed)) return errorState()
  if (state.op === null) return { entry: null, value: typed, op: next, error: false }
  const result = OPERATORS[state.op](state.value, typed)
  // A division by zero has no result. Overflow is judged on the exact result, never on the rounded
  // display, so a result just under the largest double is shown although its display reads above.
  if (result === null || tooLarge(result)) return errorState()
  return { entry: null, value: result, op: next, error: false }
}

/** The one error state. It holds nothing else: every key that leaves it starts from a reset. */
function errorState() {
  return { entry: null, value: ZERO, op: null, error: true }
}

/**
 * The typed entry as an exact fraction, read from its text: its digits with the point removed, over
 * ten to the number of digits after the point, so `1.50` is `150/100`, that is `3/2`. No digit is
 * lost, whatever the entry's length; a double keeps about sixteen.
 *
 * @param {string} entry digits with at most one point, never leading (`typePoint` writes `0.`)
 * @returns {Fraction}
 */
function fromEntry(entry) {
  const [whole, decimals = ''] = entry.split('.')
  return fraction(BigInt(whole + decimals), 10n ** BigInt(decimals.length))
}

/**
 * `num / den` in lowest terms with a positive denominator. The positive denominator lets the sign
 * be read from the numerator alone and a magnitude be compared by cross-multiplying; lowest terms
 * keep a chain's numbers no longer than its value needs, and make zero `0/1`. `BigInt` has no
 * negative zero, so no state can hold one. Frozen, because a copy of a state is shallow and the
 * copies share their fractions. `den` is never zero: `divide` refuses a zero divisor first.
 *
 * @param {bigint} num
 * @param {bigint} den
 * @returns {Fraction}
 */
function fraction(num, den) {
  const divisor = den < 0n ? -gcd(num, den) : gcd(num, den)
  return Object.freeze({ num: num / divisor, den: den / divisor })
}

/** The greatest common divisor, never negative, by Euclid's algorithm. */
function gcd(a, b) {
  let [x, y] = [abs(a), abs(b)]
  while (y !== 0n) [x, y] = [y, x % y]
  return x
}

function abs(n) {
  return n < 0n ? -n : n
}

/** `a + b`, over the common denominator `a.den · b.den`. */
function add(a, b) {
  return fraction(a.num * b.den + b.num * a.den, a.den * b.den)
}

/** `a - b`, over the common denominator `a.den · b.den`. */
function subtract(a, b) {
  return fraction(a.num * b.den - b.num * a.den, a.den * b.den)
}

/** `a × b`: numerators times numerators, denominators times denominators. */
function multiply(a, b) {
  return fraction(a.num * b.num, a.den * b.den)
}

/**
 * `a ÷ b`, that is `a` times `b` turned over, or null when `b` is zero: a division by zero has no
 * result, and the caller turns the null into Error. `fraction` moves the sign of a negative `b.num`,
 * now in the denominator, back to the numerator.
 */
function divide(a, b) {
  if (b.num === 0n) return null
  return fraction(a.num * b.den, a.den * b.num)
}

/**
 * Whether `value` is too large to be a finite number: `|num / den|` above the largest finite
 * double, as `|num| > LARGEST_FINITE · den`, which needs no division since `den` is positive.
 */
function tooLarge(value) {
  return abs(value.num) > LARGEST_FINITE * value.den
}

/**
 * A number as the display shows it: rounded once, from its exact value, to ten significant digits,
 * then written out. The power of ten of the rounded value's leading digit picks the notation, at the
 * magnitudes the spec names for the value the display shows: exponent notation at 10 or more, or
 * below -6.
 *
 * @param {Fraction} value
 * @returns {string}
 */
function format(value) {
  if (value.num === 0n) return '0'
  const { digits, exponent } = roundToSignificant(abs(value.num), value.den)
  // Trailing zeros of the digits are padding after a decimal point and in a mantissa; in a whole number
  // they come back below, from the exponent, so `1000000000` keeps its zeros.
  const significant = digits.replace(/0+$/, '')
  const minus = value.num < 0n ? '-' : ''
  if (exponent >= 10 || exponent < -6) {
    const mantissa =
      significant.length > 1 ? `${significant[0]}.${significant.slice(1)}` : significant
    return `${minus}${mantissa}e${exponent < 0 ? '-' : '+'}${Math.abs(exponent)}`
  }
  if (exponent < 0) return `${minus}0.${'0'.repeat(-exponent - 1)}${significant}`
  const padded = significant.padEnd(exponent + 1, '0')
  const whole = padded.slice(0, exponent + 1)
  const decimals = padded.slice(exponent + 1)
  return decimals === '' ? `${minus}${whole}` : `${minus}${whole}.${decimals}`
}

/**
 * The positive `n / d` rounded once to ten significant digits, a tie away from zero: the ten
 * digits, and the power of ten of the leading one.
 *
 * With `n` of p digits and `d` of q, `n / d` lies strictly between 10^(p-q-1) and 10^(p-q+1), so
 * the leading power is p - q or one less, and one exact comparison says which. Scaled by 10^(9 -
 * that power), the quotient has exactly ten digits before the point, and the integer division
 * keeps them. Its remainder decides the rounding, once and exactly: twice the remainder at or
 * above the divisor is at or past the half, so the digits go up. That can carry them to 10^10,
 * which is 10^9 at the next power up (`9999999999.5` shows `1e+10`).
 *
 * @param {bigint} n the magnitude's numerator, positive
 * @param {bigint} d the denominator, positive
 * @returns {{ digits: string, exponent: number }}
 */
function roundToSignificant(n, d) {
  let exponent = digitCount(n) - digitCount(d)
  if (!atLeastPowerOfTen(n, d, exponent)) exponent -= 1
  const shift = SIGNIFICANT_DIGITS - 1 - exponent
  const dividend = shift >= 0 ? n * 10n ** BigInt(shift) : n
  const divisor = shift >= 0 ? d : d * 10n ** BigInt(-shift)
  let kept = dividend / divisor
  if (2n * (dividend % divisor) >= divisor) kept += 1n
  if (kept === 10n ** BigInt(SIGNIFICANT_DIGITS)) {
    return { digits: (kept / 10n).toString(), exponent: exponent + 1 }
  }
  return { digits: kept.toString(), exponent }
}

/** Whether `n / d` is at least 10^k, both sides kept as integers. */
function atLeastPowerOfTen(n, d, k) {
  return k >= 0 ? n >= d * 10n ** BigInt(k) : n * 10n ** BigInt(-k) >= d
}

function digitCount(magnitude) {
  return magnitude.toString().length
}
