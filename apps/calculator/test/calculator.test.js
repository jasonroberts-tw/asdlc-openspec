/**
 * The calculator's arithmetic scenarios, driven through the pure logic in `public/calculator.js`.
 *
 * Each `describe` is a requirement's name, verbatim from capability `calculator`'s spec. Each test is
 * named `[<ID>] <title>` for the scenario it proves, its title verbatim too, and carries a `// trace:`
 * line with its role and the version of the scenario it was written against: the convention is the
 * header of `scripts/test-trace.mjs`. A test presses the scenario's buttons in order and asserts
 * what its THEN, and each AND, says the display shows. Every expected value is a literal copied from
 * the spec, never computed with the code under test.
 */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { displayText, initialState, press } from '../public/calculator.js'

// trace-defaults: layer=functional level=1

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
  // trace: CALC-003:happy@7885ae7879e3
  test('[CALC-003] Digits build a number', () => {
    assert.equal(displayText(pressAll(['1', '2', '3'])), '123')
  })

  // trace: CALC-004:happy@e086cf4781a1
  test('[CALC-004] A leading zero is replaced', () => {
    assert.equal(displayText(pressAll(['0', '7'])), '7')
  })

  // trace: CALC-005:happy@8533039a79a4
  test('[CALC-005] A second decimal point is ignored', () => {
    assert.equal(displayText(pressAll(['1', '.', '5', '.', '2'])), '1.52')
  })

  // trace: CALC-006:happy@5bc34639794c
  test('[CALC-006] A number can start with the decimal point', () => {
    const state = pressAll(['.'])
    assert.equal(displayText(state), '0.')
    assert.equal(displayText(pressAll(['5'], state)), '0.5')
  })

  // trace: CALC-007:happy@5f79dec0b988
  test('[CALC-007] A number is shown as typed', () => {
    assert.equal(displayText(pressAll(['1', '.', '5', '0'])), '1.50')
  })
})

describe('Arithmetic operations', () => {
  // trace: CALC-008:happy@55af76f42a3c
  test('[CALC-008] Addition', () => {
    assert.equal(displayText(pressAll(['2', '+', '3', '='])), '5')
  })

  // trace: CALC-009:happy@687136f721e7
  test('[CALC-009] Subtraction below zero', () => {
    assert.equal(displayText(pressAll(['3', '−', '5', '='])), '-2')
  })

  // trace: CALC-010:happy@b63535dfc10d
  test('[CALC-010] Multiplication', () => {
    assert.equal(displayText(pressAll(['6', '×', '7', '='])), '42')
  })

  // trace: CALC-011:happy@5f1f3b270d05
  test('[CALC-011] Division', () => {
    assert.equal(displayText(pressAll(['7', '÷', '2', '='])), '3.5')
  })
})

describe('Operations chain from left to right', () => {
  // trace: CALC-012:happy@a30747240fc4
  test('[CALC-012] A chain ignores operator precedence', () => {
    const state = pressAll(['2', '+', '3', '×'])
    assert.equal(displayText(state), '5')
    assert.equal(displayText(pressAll(['4', '='], state)), '20')
  })

  // trace: CALC-013:happy@5c28a6b942cd
  test('[CALC-013] A second operator replaces the first', () => {
    assert.equal(displayText(pressAll(['8', '+', '−', '3', '='])), '5')
  })
})

describe('Equals', () => {
  // trace: CALC-014:happy@f1291debb48c
  test('[CALC-014] A digit after a result starts a new calculation', () => {
    const state = pressAll(['2', '+', '3', '=', '4'])
    assert.equal(displayText(state), '4')
    assert.equal(displayText(pressAll(['+', '1', '='], state)), '5')
  })

  // trace: CALC-015:happy@49ca35de9240
  test('[CALC-015] A decimal point after a result starts a new calculation', () => {
    assert.equal(displayText(pressAll(['2', '+', '3', '=', '.', '5'])), '0.5')
  })

  // trace: CALC-016:happy@3ff51f9d6673
  test('[CALC-016] An operator after a result continues from it', () => {
    assert.equal(displayText(pressAll(['2', '+', '3', '=', '+', '4', '='])), '9')
  })

  // trace: CALC-017:happy@f25e67dfd8ce
  test('[CALC-017] Equals with nothing pending changes nothing', () => {
    assert.equal(displayText(pressAll(['2', '+', '3', '=', '='])), '5')
  })

  // trace: CALC-018:happy@e719c045ae5c
  test('[CALC-018] Equals with only a number typed changes nothing', () => {
    // Equals never closed the entry, so the `3` extends it rather than starting a new number.
    assert.equal(displayText(pressAll(['5', '=', '3'])), '53')
  })

  // trace: CALC-019:happy@04b71404a716
  test('[CALC-019] Equals before the second number changes nothing', () => {
    const state = pressAll(['2', '+', '='])
    assert.equal(displayText(state), '2')
    assert.equal(displayText(pressAll(['3', '='], state)), '5')
  })
})

describe('Clear', () => {
  // trace: CALC-020:happy@7a554a55d933
  test('[CALC-020] Clear discards a pending operation', () => {
    const state = pressAll(['7', '×', '8', 'C'])
    assert.equal(displayText(state), '0')
    assert.equal(displayText(pressAll(['2', '='], state)), '2')
  })

  // trace: CALC-021:happy@ec82686deec8
  test('[CALC-021] Clear discards an error', () => {
    assert.equal(displayText(pressAll(['5', '÷', '0', '=', 'C'])), '0')
  })
})

describe('Division by zero and overflow', () => {
  // trace: CALC-022:happy@55f7ce6bb47b
  test('[CALC-022] Dividing by zero shows an error', () => {
    assert.equal(displayText(pressAll(['5', '÷', '0', '='])), 'Error')
  })

  // trace: CALC-023:happy@76cc7b430038
  test('[CALC-023] A chain that divides by zero shows an error', () => {
    assert.equal(displayText(pressAll(['5', '÷', '0', '+'])), 'Error')
  })

  // trace: CALC-024:happy@07812451b328
  test('[CALC-024] An operator after an error changes nothing', () => {
    assert.equal(displayText(pressAll(['5', '÷', '0', '=', '+'])), 'Error')
  })

  // trace: CALC-025:happy@2f89a73d2db0
  test('[CALC-025] Equals after an error changes nothing', () => {
    assert.equal(displayText(pressAll(['5', '÷', '0', '=', '='])), 'Error')
  })

  // trace: CALC-026:happy@8cc6ad5295c1
  test('[CALC-026] A digit after an error starts a new calculation', () => {
    assert.equal(displayText(pressAll(['5', '÷', '0', '=', '3', '+', '4', '='])), '7')
  })

  // trace: CALC-027:happy@a4d4909dc574
  test('[CALC-027] A decimal point after an error starts a new calculation', () => {
    assert.equal(displayText(pressAll(['5', '÷', '0', '=', '.', '5'])), '0.5')
  })

  // trace: CALC-028:happy@b152e6aa6212
  test('[CALC-028] A result too large to be a finite number shows an error', () => {
    // Built exactly as the scenario words it: `9` ten times, then thirty times `×` followed by `9`
    // ten times, then `=`.
    const nines = Array(10).fill('9')
    const buttons = [...nines]
    for (let times = 0; times < 30; times++) buttons.push('×', ...nines)
    buttons.push('=')
    assert.equal(displayText(pressAll(buttons)), 'Error')
  })

  // trace: CALC-029:happy@b38b8bef612c
  test('[CALC-029] A typed number too large to be a finite number shows an error', () => {
    // Built exactly as the scenario words it: `1`, then `0` three hundred and nine times, then `+`.
    // Ten to the 309th is past the largest double, so it is the `+` that must refuse it.
    const buttons = ['1', ...Array(309).fill('0'), '+']
    assert.equal(displayText(pressAll(buttons)), 'Error')
  })

  // trace: CALC-030:happy@aade1db244d2
  test('[CALC-030] A typed divisor too large to be a finite number shows an error', () => {
    // Built exactly as the scenario words it: `5`, `÷`, `1`, then `0` three hundred and nine times,
    // then `=`. The divisor is the typed number here, so it is `=` that must refuse it and show
    // `Error`.
    const buttons = ['5', '÷', '1', ...Array(309).fill('0'), '=']
    assert.equal(displayText(pressAll(buttons)), 'Error')
  })

  // trace: CALC-031:happy@3b9bbf48563b
  test('[CALC-031] A typed divisor taken by an operator shows an error', () => {
    // Built exactly as the scenario words it: `5`, `÷`, `1`, then `0` three hundred and nine times,
    // then `×`. The same divisor as above, taken by an operator rather than by equals: each row of
    // the transition table that takes a typed number must refuse it.
    const buttons = ['5', '÷', '1', ...Array(309).fill('0'), '×']
    assert.equal(displayText(pressAll(buttons)), 'Error')
  })

  // trace: CALC-032:happy@5ec1e1ba59a1
  test('[CALC-032] A result just under the largest number is shown', () => {
    // Built exactly as the scenario words it: `1`, `7`, `9`, `7`, `6`, `9`, `3`, `1`, `3`, `4`,
    // `8`, then `0` two hundred and ninety-eight times, then `×`, `1`, `=`. The typed number and
    // the exact product are just under the largest double, so the product is a result, not an
    // error. Its ten-digit display reads above the largest double, but that is only text: a check
    // made on the rounded value would show `Error` here.
    const buttons = [
      ...['1', '7', '9', '7', '6', '9', '3', '1', '3', '4', '8'],
      ...Array(298).fill('0'),
      '×',
      '1',
      '=',
    ]
    assert.equal(displayText(pressAll(buttons)), '1.797693135e+308')
  })
})

describe('Results are rounded for display', () => {
  // trace: CALC-033:happy@74c7c6694a17
  test('[CALC-033] Floating-point error is not shown', () => {
    assert.equal(displayText(pressAll(['0', '.', '1', '+', '0', '.', '2', '='])), '0.3')
  })

  // trace: CALC-034:happy@12216004f16d
  test('[CALC-034] A chain carries the exact result', () => {
    const state = pressAll(['1', '÷', '3', '×'])
    assert.equal(displayText(state), '0.3333333333')
    // The carried value is exactly a third, so times 3 it is `1`. A carry of the rounded value the
    // display showed would give `0.9999999999` here.
    assert.equal(displayText(pressAll(['3', '='], state)), '1')
  })

  // trace: CALC-035:happy@5f9b815bec2f
  test('[CALC-035] A subtraction that cancels shows no floating-point error', () => {
    const buttons = ['1', '.', '0', '0', '0', '0', '0', '1', '−', '1', '=']
    assert.equal(displayText(pressAll(buttons)), '0.000001')
  })

  // trace: CALC-036:happy@64bf5f028b32
  test('[CALC-036] An addition that cancels shows no floating-point error', () => {
    const buttons = ['0', '−', '1', '=', '+', '1', '.', '0', '0', '0', '0', '0', '1', '=']
    assert.equal(displayText(pressAll(buttons)), '0.000001')
  })

  // trace: CALC-037:happy@a3289653310e
  test('[CALC-037] Small numbers add in exponent form', () => {
    // Built exactly as the scenario words it: `.`, then `0` six times, then `1`, `+`, `.`, then `0`
    // six times, then `1`, `=`. The sum is below 10^-6, so it shows in exponent notation. An
    // implementation that read numbers through a text form such as `1e-7` would also have to keep
    // the exponent's `-` from being taken for a sign.
    const small = ['.', ...Array(6).fill('0'), '1']
    assert.equal(displayText(pressAll([...small, '+', ...small, '='])), '2e-7')
  })

  // trace: CALC-038:happy@0edebdb1da55
  test('[CALC-038] Numbers past a hundred decimal places add exactly', () => {
    // Built exactly as the scenario words it: `.`, then `0` one hundred and forty-nine times, then
    // `1`, `+`, the same again, then `=`. An addition that capped decimal places at a hundred
    // showed `0` here.
    const tiny = ['.', ...Array(149).fill('0'), '1']
    assert.equal(displayText(pressAll([...tiny, '+', ...tiny, '='])), '2e-150')
  })

  // trace: CALC-039:happy@b5c71f6298af
  test('[CALC-039] A tie at the tenth significant digit rounds away from zero', () => {
    // Built exactly as the scenario words it: `3`, `.`, then `0` eight times, then `3`, `×`, `0`,
    // `.`, `5`, `=`. The exact product is 1.5000000015, a tie at the tenth digit.
    const buttons = ['3', '.', ...Array(8).fill('0'), '3', '×', '0', '.', '5', '=']
    assert.equal(displayText(pressAll(buttons)), '1.500000002')
  })

  // trace: CALC-040:happy@4fe9801eca25
  test('[CALC-040] A result is rounded once, from its exact value', () => {
    // Built exactly as the scenario words it: `1`, `+`, `.`, then `0` nine times, then `4`, then
    // `9` nine times, then `=`. The exact sum 1.0000000004999999999 is below the tie, so it rounds
    // down. An implementation that rounded it first to a double would get 1.0000000005, and then
    // round up.
    const buttons = ['1', '+', '.', ...Array(9).fill('0'), '4', ...Array(9).fill('9'), '=']
    assert.equal(displayText(pressAll(buttons)), '1')
  })

  // trace: CALC-041:happy@5995cda107eb
  test('[CALC-041] A whole-number result keeps its zeros', () => {
    const buttons = ['1', '0', '0', '0', '0', '0', '×', '1', '0', '0', '0', '0', '=']
    assert.equal(displayText(pressAll(buttons)), '1000000000')
  })

  // trace: CALC-042:happy@850e4e9c9e54
  test('[CALC-042] A repeating result is cut to ten significant digits', () => {
    assert.equal(displayText(pressAll(['2', '÷', '3', '='])), '0.6666666667')
  })

  // trace: CALC-043:happy@8d2867e84692
  test('[CALC-043] A large result is shown in exponent notation', () => {
    const buttons = ['1', '0', '0', '0', '0', '0', '×', '1', '0', '0', '0', '0', '0', '=']
    assert.equal(displayText(pressAll(buttons)), '1e+10')
  })

  // trace: CALC-044:happy@4ba341d9c727
  test('[CALC-044] A small result is shown in exponent notation', () => {
    const buttons = ['1', '÷', '1', '0', '0', '0', '0', '0', '0', '0', '=']
    assert.equal(displayText(pressAll(buttons)), '1e-7')
  })
})
