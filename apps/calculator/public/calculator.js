/**
 * The calculator's logic: a pure state machine from key presses to the text the display shows. It
 * touches no DOM and does no I/O, so this one file runs unchanged as a module in the browser and
 * under Node's test runner, with no build step between them.
 *
 * What it must do is capability `calculator`'s spec under `openspec/`, which wins over this file.
 * `press` and its helpers follow the transition table in the design of the change that added it,
 * row by row.
 */

/** How many significant digits a result keeps, and the display shows: the spec's ten. */
const SIGNIFICANT_DIGITS = 10

const DIGITS = new Set('0123456789')

/**
 * The four operations on the operands' decimal forms: exact, or for `÷` a truncated quotient with a
 * digit to spare, so that `calculate` can round the result once and get the exact result's rounding.
 * None of them runs on binary doubles. A binary operation rounds to a double
 * before the ten-digit rounding sees it: a tie at the tenth digit then went whichever way the
 * double fell (`3.000000003 × 0.5` showed `1.500000001`), and a sum was rounded twice. A
 * difference is the sum with its second operand negated, which is exact.
 */
const OPERATORS = {
  '+': add,
  '-': (a, b) => add(a, negate(b)),
  '*': multiply,
  '/': divide,
}

/**
 * @typedef {object} State
 * @property {string | null} entry the number being typed, exactly as typed (`0.`, `1.50`), or null
 *   when none is
 * @property {number} value the last completed number or result: the left operand of `op`
 * @property {'+' | '-' | '*' | '/' | null} op the pending operator, or null
 * @property {boolean} error true while `Error` is shown
 */

/**
 * @typedef {object} Decimal an exact decimal, `sign × magnitude × 10^-scale`
 * @property {1n | -1n} sign
 * @property {bigint} magnitude the digits, never negative
 * @property {number} scale how far the point sits left of the magnitude's last digit, negative when
 *   the number has zeros past its digits: `1.5e-7` is `15n` at scale 8, `1.5e+21` is `15n` at -20
 */

/** @returns {State} */
export function initialState() {
  return { entry: null, value: 0, op: null, error: false }
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
 * formatted, which is the last result or a typed number an operator took.
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
  const typed = Number(state.entry)
  // Entry has no digit limit, so `1` and 309 zeros is typed as a string and only becomes Infinity
  // here. It is refused at once, before `calculate` or `format` reads it: neither can take Infinity
  // (`BigInt` throws on it), and the spec wants `Error`, not a thrown key.
  if (!Number.isFinite(typed)) return errorState()
  if (state.op === null) return { entry: null, value: typed, op: next, error: false }
  const result = calculate(state.value, state.op, typed)
  // Checked last, after the rounding: a finite exact result just under the largest double rounds
  // up past it at ten digits, and reads back as Infinity. A division by zero arrives as NaN.
  if (!Number.isFinite(result)) return errorState()
  return { entry: null, value: result, op: next, error: false }
}

/** The one error state. It holds nothing else: every key that leaves it starts from a reset. */
function errorState() {
  return { entry: null, value: 0, op: null, error: true }
}

/**
 * `a op b` on the operands' decimal forms, rounded once and read back as a double. The
 * rounded value is what is carried forward, so the value used next is the value shown: `1 ÷ 3 × 3`
 * is `0.3333333333 × 3`.
 */
function calculate(a, op, b) {
  const exact = OPERATORS[op](toDecimal(a), toDecimal(b))
  // `divide` has no result for a zero divisor. NaN is not finite, so the caller's one check turns
  // it into Error, as it does an overflow.
  return exact === null ? NaN : toNumber(round(exact))
}

/**
 * A finite `n` as an exact decimal, read from `String(n)`: the shortest decimal that reads back as
 * the same double, so it is what a person typed or saw, not the double's binary expansion. Every
 * `n` here is finite: `takeEntry` refuses a typed Infinity first, and no state stores one.
 * `BigInt` throws on `Infinity`, which would surface a break in that rule rather than hide it.
 *
 * @returns {Decimal}
 */
function toDecimal(n) {
  const text = String(n)
  // Only a leading `-` is a sign. The `-` of a negative exponent is not: read as one, `1e-7` would
  // lose its digits and add as zero.
  const negative = text.startsWith('-')
  const [mantissa, exponent = '0'] = (negative ? text.slice(1) : text).split('e')
  const [whole, fraction = ''] = mantissa.split('.')
  return {
    sign: negative ? -1n : 1n,
    magnitude: BigInt(whole + fraction),
    scale: fraction.length - Number(exponent),
  }
}

/**
 * A decimal read back as the nearest double: `Number` rounds a decimal string correctly, to
 * Infinity past the largest double and to zero below about half the smallest.
 */
function toNumber(decimal) {
  const n = Number(`${decimal.sign < 0n ? '-' : ''}${decimal.magnitude}e${-decimal.scale}`)
  // The sign is kept apart from the magnitude, so a zero product of a negative (`-3 × 0`) reads
  // back as -0. It becomes 0, so no state ever holds one.
  return n === 0 ? 0 : n
}

/** `a + b`, both brought to the larger scale and added as integers. */
function add(a, b) {
  const scale = Math.max(a.scale, b.scale)
  const aligned = (d) => d.sign * d.magnitude * 10n ** BigInt(scale - d.scale)
  const sum = aligned(a) + aligned(b)
  return { sign: sum < 0n ? -1n : 1n, magnitude: sum < 0n ? -sum : sum, scale }
}

function negate(d) {
  return { ...d, sign: -d.sign }
}

/** `a × b`: the magnitudes multiply and the scales add. */
function multiply(a, b) {
  return { sign: a.sign * b.sign, magnitude: a.magnitude * b.magnitude, scale: a.scale + b.scale }
}

/**
 * `a ÷ b`, or null when `b` is zero. The magnitudes divide as integers, which truncates, so the
 * dividend is first scaled until the quotient has at least eleven significant digits: the ten a
 * result keeps and the first dropped one that `round` reads. The remainder the division drops is
 * less than one in that eleventh digit, so it cannot move the quotient across a tie.
 */
function divide(a, b) {
  if (b.magnitude === 0n) return null
  // With `shift` at 11 + digitCount(b) - digitCount(a), the scaled dividend is at least
  // 10^(digitCount(b) + 10) and the divisor below 10^digitCount(b), so the quotient is more than
  // 10^10: eleven digits. A dividend already longer is never scaled down, which would drop digits
  // before the division.
  const shift = Math.max(
    0,
    SIGNIFICANT_DIGITS + 1 + digitCount(b.magnitude) - digitCount(a.magnitude),
  )
  return {
    sign: a.sign * b.sign,
    magnitude: (a.magnitude * 10n ** BigInt(shift)) / b.magnitude,
    scale: a.scale - b.scale + shift,
  }
}

function digitCount(magnitude) {
  return magnitude.toString().length
}

/**
 * `decimal` rounded once to ten significant digits, a tie away from zero. Its digits are exact, or
 * a truncated quotient with at least one digit to spare, so the first dropped digit decides: 5 or
 * more rounds the magnitude up, whatever follows. A carry can give the magnitude an eleventh digit
 * (`99999999995` at scale 1 becomes `10000000000` at scale 0), which is still the same number.
 *
 * @param {Decimal} decimal
 * @returns {Decimal}
 */
function round(decimal) {
  const dropped = digitCount(decimal.magnitude) - SIGNIFICANT_DIGITS
  if (dropped <= 0) return decimal
  const kept = decimal.magnitude / 10n ** BigInt(dropped)
  const firstDropped = (decimal.magnitude / 10n ** BigInt(dropped - 1)) % 10n
  return {
    sign: decimal.sign,
    magnitude: firstDropped >= 5n ? kept + 1n : kept,
    scale: decimal.scale - dropped,
  }
}

/**
 * A number as the display shows it, worked from its decimal form rather than the double's binary
 * digits, so a double as small as `1e-320` still shows `1e-320`. It is rounded by the same rule as
 * a result: that changes nothing for a result, which is stored rounded, and cuts a typed number an
 * operator took, which is stored as typed. The power of ten of the leading digit picks the
 * notation, at the magnitudes the spec names: exponent notation at 10 or more, or below -6.
 */
function format(n) {
  // `-0 === 0`, so a -0 that ever reached here would still show `0`.
  if (n === 0) return '0'
  const { sign, magnitude, scale } = round(toDecimal(n))
  const digits = magnitude.toString()
  // The power of ten of the leading digit, which a carry in `round` has already moved if it had to.
  const exponent = digits.length - 1 - scale
  // Trailing zeros of the digits are padding in a fraction and in a mantissa; in a whole number
  // they come back below, from the exponent, so `1000000000` keeps its zeros.
  const significant = digits.replace(/0+$/, '')
  const minus = sign < 0n ? '-' : ''
  if (exponent >= 10 || exponent < -6) {
    const mantissa =
      significant.length > 1 ? `${significant[0]}.${significant.slice(1)}` : significant
    return `${minus}${mantissa}e${exponent < 0 ? '-' : '+'}${Math.abs(exponent)}`
  }
  if (exponent < 0) return `${minus}0.${'0'.repeat(-exponent - 1)}${significant}`
  const padded = significant.padEnd(exponent + 1, '0')
  const whole = padded.slice(0, exponent + 1)
  const fraction = padded.slice(exponent + 1)
  return fraction === '' ? `${minus}${whole}` : `${minus}${whole}.${fraction}`
}
