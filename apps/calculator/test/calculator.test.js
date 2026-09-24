/**
 * The calculator's arithmetic scenarios, driven through the pure logic in `public/calculator.js`.
 *
 * Each `describe` is a requirement's name and each `test` a scenario's name, both verbatim from
 * capability `calculator`'s spec, so a scenario traces to its test by exact string. A test presses
 * the scenario's buttons in order and asserts what its THEN, and each AND, says the display shows.
 * Every expected value is a literal copied from the spec, never computed with the code under test.
 */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { displayText, initialState, press } from '../public/calculator.js'

/** The spec names three operators by the symbol on the button; the logic takes the ASCII key. */
const KEY_OF_BUTTON = { '−': '-', '×': '*', '÷': '/' }

/**
 * Press each button in turn from `state` and return the state it ends in. Each state is frozen
 * before it is pressed, so a `press` that changed its argument would throw here rather than pass.
 */
function pressAll(buttons, state = initialState()) {
  return buttons.reduce(
    (current, button) => press(Object.freeze(current), KEY_OF_BUTTON[button] ?? button),
    state,
  )
}

describe('Number entry', () => {
  test('Digits build a number', () => {
    assert.equal(displayText(pressAll(['1', '2', '3'])), '123')
  })

  test('A leading zero is replaced', () => {
    assert.equal(displayText(pressAll(['0', '7'])), '7')
  })

  test('A second decimal point is ignored', () => {
    assert.equal(displayText(pressAll(['1', '.', '5', '.', '2'])), '1.52')
  })

  test('A number can start with the decimal point', () => {
    const state = pressAll(['.'])
    assert.equal(displayText(state), '0.')
    assert.equal(displayText(pressAll(['5'], state)), '0.5')
  })

  test('A number is shown as typed', () => {
    assert.equal(displayText(pressAll(['1', '.', '5', '0'])), '1.50')
  })
})

describe('Arithmetic operations', () => {
  test('Addition', () => {
    assert.equal(displayText(pressAll(['2', '+', '3', '='])), '5')
  })

  test('Subtraction below zero', () => {
    assert.equal(displayText(pressAll(['3', '−', '5', '='])), '-2')
  })

  test('Multiplication', () => {
    assert.equal(displayText(pressAll(['6', '×', '7', '='])), '42')
  })

  test('Division', () => {
    assert.equal(displayText(pressAll(['7', '÷', '2', '='])), '3.5')
  })
})

describe('Operations chain from left to right', () => {
  test('A chain ignores operator precedence', () => {
    const state = pressAll(['2', '+', '3', '×'])
    assert.equal(displayText(state), '5')
    assert.equal(displayText(pressAll(['4', '='], state)), '20')
  })

  test('A second operator replaces the first', () => {
    assert.equal(displayText(pressAll(['8', '+', '−', '3', '='])), '5')
  })
})

describe('Equals', () => {
  test('A digit after a result starts a new calculation', () => {
    const state = pressAll(['2', '+', '3', '=', '4'])
    assert.equal(displayText(state), '4')
    assert.equal(displayText(pressAll(['+', '1', '='], state)), '5')
  })

  test('A decimal point after a result starts a new calculation', () => {
    assert.equal(displayText(pressAll(['2', '+', '3', '=', '.', '5'])), '0.5')
  })

  test('An operator after a result continues from it', () => {
    assert.equal(displayText(pressAll(['2', '+', '3', '=', '+', '4', '='])), '9')
  })

  test('Equals with nothing pending changes nothing', () => {
    assert.equal(displayText(pressAll(['2', '+', '3', '=', '='])), '5')
  })

  test('Equals with only a number typed changes nothing', () => {
    // Equals never closed the entry, so the `3` extends it rather than starting a new number.
    assert.equal(displayText(pressAll(['5', '=', '3'])), '53')
  })

  test('Equals before the second number changes nothing', () => {
    const state = pressAll(['2', '+', '='])
    assert.equal(displayText(state), '2')
    assert.equal(displayText(pressAll(['3', '='], state)), '5')
  })
})

describe('Clear', () => {
  test('Clear discards a pending operation', () => {
    const state = pressAll(['7', '×', '8', 'C'])
    assert.equal(displayText(state), '0')
    assert.equal(displayText(pressAll(['2', '='], state)), '2')
  })

  test('Clear discards an error', () => {
    assert.equal(displayText(pressAll(['5', '÷', '0', '=', 'C'])), '0')
  })
})

describe('Division by zero and overflow', () => {
  test('Dividing by zero shows an error', () => {
    assert.equal(displayText(pressAll(['5', '÷', '0', '='])), 'Error')
  })

  test('A chain that divides by zero shows an error', () => {
    assert.equal(displayText(pressAll(['5', '÷', '0', '+'])), 'Error')
  })

  test('An operator after an error changes nothing', () => {
    assert.equal(displayText(pressAll(['5', '÷', '0', '=', '+'])), 'Error')
  })

  test('Equals after an error changes nothing', () => {
    assert.equal(displayText(pressAll(['5', '÷', '0', '=', '='])), 'Error')
  })

  test('A digit after an error starts a new calculation', () => {
    assert.equal(displayText(pressAll(['5', '÷', '0', '=', '3', '+', '4', '='])), '7')
  })

  test('A decimal point after an error starts a new calculation', () => {
    assert.equal(displayText(pressAll(['5', '÷', '0', '=', '.', '5'])), '0.5')
  })

  test('A result too large to be a finite number shows an error', () => {
    // Built exactly as the scenario words it: `9` ten times, then thirty times `×` followed by `9`
    // ten times, then `=`.
    const nines = Array(10).fill('9')
    const buttons = [...nines]
    for (let times = 0; times < 30; times++) buttons.push('×', ...nines)
    buttons.push('=')
    assert.equal(displayText(pressAll(buttons)), 'Error')
  })

  test('A typed number too large to be a finite number shows an error', () => {
    // Built exactly as the scenario words it: `1`, then `0` three hundred and nine times, then `+`.
    // Ten to the 309th is past the largest double, so it is the `+` that must refuse it.
    const buttons = ['1', ...Array(309).fill('0'), '+']
    assert.equal(displayText(pressAll(buttons)), 'Error')
  })

  test('A typed divisor too large to be a finite number shows an error', () => {
    // Built exactly as the scenario words it: `5`, `÷`, `1`, then `0` three hundred and nine times,
    // then `=`. The divisor is the typed number here, so it is `=` that must refuse it and show
    // `Error`.
    const buttons = ['5', '÷', '1', ...Array(309).fill('0'), '=']
    assert.equal(displayText(pressAll(buttons)), 'Error')
  })

  test('A typed divisor taken by an operator shows an error', () => {
    // Built exactly as the scenario words it: `5`, `÷`, `1`, then `0` three hundred and nine times,
    // then `×`. The same divisor as above, taken by an operator rather than by equals: each row of
    // the transition table that takes a typed number must refuse it.
    const buttons = ['5', '÷', '1', ...Array(309).fill('0'), '×']
    assert.equal(displayText(pressAll(buttons)), 'Error')
  })

  test('A result that rounds past the largest number shows an error', () => {
    // Built exactly as the scenario words it: `1`, `7`, `9`, `7`, `6`, `9`, `3`, `1`, `3`, `4`,
    // `8`, then `0` two hundred and ninety-eight times, then `×`, `1`, `=`. The typed number and
    // the exact product are finite, just under the largest double; only the ten-digit rounding
    // carries it past.
    const buttons = [
      ...['1', '7', '9', '7', '6', '9', '3', '1', '3', '4', '8'],
      ...Array(298).fill('0'),
      '×',
      '1',
      '=',
    ]
    assert.equal(displayText(pressAll(buttons)), 'Error')
  })
})

describe('Results are rounded for display', () => {
  test('Floating-point error is not shown', () => {
    assert.equal(displayText(pressAll(['0', '.', '1', '+', '0', '.', '2', '='])), '0.3')
  })

  test('A chain carries the rounded result', () => {
    const state = pressAll(['1', '÷', '3', '×'])
    assert.equal(displayText(state), '0.3333333333')
    // An unrounded carry would give `1` here; the rounded one is what the display showed, times 3.
    assert.equal(displayText(pressAll(['3', '='], state)), '0.9999999999')
  })

  test('A subtraction that cancels shows no floating-point error', () => {
    const buttons = ['1', '.', '0', '0', '0', '0', '0', '1', '−', '1', '=']
    assert.equal(displayText(pressAll(buttons)), '0.000001')
  })

  test('An addition that cancels shows no floating-point error', () => {
    const buttons = ['0', '−', '1', '=', '+', '1', '.', '0', '0', '0', '0', '0', '1', '=']
    assert.equal(displayText(pressAll(buttons)), '0.000001')
  })

  test('Small numbers add in exponent form', () => {
    // Built exactly as the scenario words it: `.`, then `0` six times, then `1`, `+`, `.`, then `0`
    // six times, then `1`, `=`. `String(1e-7)` is `1e-7`: its `-` belongs to the exponent, and a
    // parser that read it as a sign would get the sum wrong.
    const small = ['.', ...Array(6).fill('0'), '1']
    assert.equal(displayText(pressAll([...small, '+', ...small, '='])), '2e-7')
  })

  test('Numbers past a hundred decimal places add exactly', () => {
    // Built exactly as the scenario words it: `.`, then `0` one hundred and forty-nine times, then
    // `1`, `+`, the same again, then `=`. An addition that capped decimal places at a hundred
    // showed `0` here.
    const tiny = ['.', ...Array(149).fill('0'), '1']
    assert.equal(displayText(pressAll([...tiny, '+', ...tiny, '='])), '2e-150')
  })

  test('A tie at the tenth significant digit rounds away from zero', () => {
    // Built exactly as the scenario words it: `3`, `.`, then `0` eight times, then `3`, `×`, `0`,
    // `.`, `5`, `=`. The exact product is 1.5000000015, a tie at the tenth digit.
    const buttons = ['3', '.', ...Array(8).fill('0'), '3', '×', '0', '.', '5', '=']
    assert.equal(displayText(pressAll(buttons)), '1.500000002')
  })

  test('A result is rounded once, from its exact value', () => {
    // Built exactly as the scenario words it: `1`, `+`, `.`, then `0` nine times, then `4`, then
    // `9` nine times, then `=`. The exact sum 1.0000000004999999999 is below the tie, so it rounds
    // down; rounding it first to a double gives 1.0000000005, which would then round up.
    const buttons = ['1', '+', '.', ...Array(9).fill('0'), '4', ...Array(9).fill('9'), '=']
    assert.equal(displayText(pressAll(buttons)), '1')
  })

  test('A whole-number result keeps its zeros', () => {
    const buttons = ['1', '0', '0', '0', '0', '0', '×', '1', '0', '0', '0', '0', '=']
    assert.equal(displayText(pressAll(buttons)), '1000000000')
  })

  test('A repeating result is cut to ten significant digits', () => {
    assert.equal(displayText(pressAll(['2', '÷', '3', '='])), '0.6666666667')
  })

  test('A large result is shown in exponent notation', () => {
    const buttons = ['1', '0', '0', '0', '0', '0', '×', '1', '0', '0', '0', '0', '0', '=']
    assert.equal(displayText(pressAll(buttons)), '1e+10')
  })

  test('A small result is shown in exponent notation', () => {
    const buttons = ['1', '÷', '1', '0', '0', '0', '0', '0', '0', '0', '=']
    assert.equal(displayText(pressAll(buttons)), '1e-7')
  })
})
