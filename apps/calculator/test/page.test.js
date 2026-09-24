/**
 * The page's scenarios: the keypad, the display, the names assistive technology reads, and keyboard
 * input, driven through the committed `public/index.html` in a DOM that jsdom builds in Node.
 *
 * Each `describe` is a requirement's name and each `test` a scenario's name, both verbatim from
 * capability `calculator`'s spec, so a scenario traces to its test by exact string. The last
 * `describe` is named so that it cannot be taken for a requirement: its tests are wiring the spec
 * states without a scenario of its own, such as a chain clicked through every button. A scenario's
 * expected values are literals copied from the spec, and the chain's are plain arithmetic worked by
 * hand: none is computed with the code under test.
 *
 * jsdom does not run `<script type="module">`, so `main.js` never loads here: each test builds a
 * fresh DOM from the page and calls `mount` on its document itself. Nor is jsdom a browser: layout,
 * real focus, the page's security policy, and the scenario 'Space presses the focused button' (a
 * browser's own behaviour for a focused button, which jsdom does not implement) are checked by hand,
 * in a real browser, when the change that added this page is verified.
 *
 * An exception thrown in a listener never reaches the code that dispatched the event: jsdom reports
 * it to its virtual console and carries on. So each page collects those reports, and every click and
 * key asserts that none arrived. Without that, a key that reached `press` and threw would leave the
 * display unchanged, and a test expecting an unchanged display would pass.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { JSDOM, VirtualConsole } from 'jsdom'
import { mount } from '../public/app.js'

/** The committed page, read once. Each test builds a DOM of its own from it. */
const PAGE = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8')

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/** The spec's name for each button that is not a digit, by the text the button shows. */
const NAME_OF_BUTTON = {
  '.': 'decimal point',
  '+': 'add',
  '−': 'subtract',
  '×': 'multiply',
  '÷': 'divide',
  '=': 'equals',
  C: 'clear',
}

/**
 * A fresh DOM built from the committed page, with the calculator mounted on its document: what a
 * person has in front of them once the page has opened.
 */
function openPage() {
  const reported = []
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', (error) => reported.push(error))
  const dom = new JSDOM(PAGE, { virtualConsole })
  const doc = dom.window.document
  mount(doc)
  // Found by what it is rather than by the id `mount` looks for, so a second display, or one that
  // is not an `<output>`, fails here.
  const outputs = doc.querySelectorAll('output')
  assert.equal(outputs.length, 1, 'the page has one display, an <output>')
  return {
    window: dom.window,
    doc,
    display: outputs[0],
    buttons: Array.from(doc.querySelectorAll('button')),
    reported,
  }
}

/** Fail on the first exception a listener threw, with its own message and stack. */
function assertNothingReported(page) {
  const [first] = page.reported
  if (first !== undefined) assert.fail(`the page reported: ${first.cause?.stack ?? first.message}`)
}

function textOf(button) {
  return button.textContent.trim()
}

/**
 * A button's accessible name, by the steps of the accessible-name computation that these buttons
 * reach: `aria-label` when present, else the button's text. jsdom computes no names of its own.
 * `aria-labelledby` would win over both, and this helper does not follow it, so a button that
 * carries one fails here rather than being misnamed.
 */
function accessibleName(button) {
  const text = textOf(button)
  assert.equal(button.hasAttribute('aria-labelledby'), false, `${text} has aria-labelledby`)
  const label = button.getAttribute('aria-label')?.trim()
  return label ? label : text
}

/**
 * Type one key, and return whether the page took it, that is, prevented the browser's own action.
 * It is sent where a browser sends a key when no control has focus, the body, and bubbles from there
 * to the listener on the document.
 */
function type(page, key, modifiers = {}) {
  const event = new page.window.KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  })
  page.doc.body.dispatchEvent(event)
  assertNothingReported(page)
  return event.defaultPrevented
}

/** Click the one button that shows `text`, as a person picks it: by what it shows. */
function click(page, text) {
  const matches = page.buttons.filter((button) => textOf(button) === text)
  assert.equal(matches.length, 1, `one button shows ${text}`)
  matches[0].click()
  assertNothingReported(page)
}

describe('Keypad and display', () => {
  test('The page opens showing zero', () => {
    const page = openPage()
    assert.equal(page.display.textContent, '0')
    // The scenario lists the buttons, not their order on the keypad, so both sides are sorted.
    const shown = page.buttons.map(textOf).sort()
    const expected = [...DIGITS, '.', '+', '−', '×', '÷', '=', 'C'].sort()
    assert.deepEqual(shown, expected)
  })

  test('Every button can be named by assistive technology', () => {
    const page = openPage()
    const digits = page.buttons.filter((button) => DIGITS.includes(textOf(button)))
    const others = page.buttons.filter((button) => !DIGITS.includes(textOf(button)))
    assert.equal(digits.length, 10)
    for (const button of digits) assert.equal(accessibleName(button), textOf(button))
    // Each name is checked on the button that shows its symbol, so a label moved to the wrong
    // button fails as surely as a missing one.
    const names = Object.fromEntries(
      others.map((button) => [textOf(button), accessibleName(button)]),
    )
    assert.deepEqual(names, NAME_OF_BUTTON)
    assert.equal(page.display.getAttribute('aria-live'), 'polite')
  })
})

describe('Keyboard input', () => {
  test('A calculation typed on the keyboard', () => {
    const page = openPage()
    for (const key of ['6', '*', '7', 'Enter']) {
      assert.equal(type(page, key), true, `${key} taken`)
    }
    assert.equal(page.display.textContent, '42')
  })

  test('Escape clears', () => {
    const page = openPage()
    assert.equal(type(page, '9'), true)
    // Checked first, so the `0` below is Escape's doing and not a display that never changed.
    assert.equal(page.display.textContent, '9')
    assert.equal(type(page, 'Escape'), true)
    assert.equal(page.display.textContent, '0')
  })

  test('Other keys are ignored', () => {
    const page = openPage()
    assert.equal(type(page, '4'), true)
    // A key the page ignores keeps whatever the browser would do with it.
    assert.equal(type(page, 'a'), false)
    assert.equal(page.display.textContent, '4')
    // The change's design reads a key held with Ctrl, Meta or Alt as one of the requirement's "any
    // other key", so that browser shortcuts keep working: a digit so held changes nothing either.
    // AltGr is the design's one exception, held by the wiring test below.
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
      assert.equal(type(page, '5', { [modifier]: true }), false, `${modifier} with 5 not taken`)
    }
    assert.equal(page.display.textContent, '4')
  })
})

describe('Page wiring (not a spec scenario)', () => {
  test('A chain clicked through every button reaches the logic', () => {
    const page = openPage()
    const clickAll = (texts) => texts.forEach((text) => click(page, text))
    // Each step's value is plain arithmetic on the one before, and the chain between them presses
    // every button on the keypad at least once, so a button wired to the wrong key shows here.
    clickAll(['2', '+', '3', '='])
    assert.equal(page.display.textContent, '5')
    clickAll(['×', '4', '='])
    assert.equal(page.display.textContent, '20')
    clickAll(['−', '1', '.', '5', '='])
    assert.equal(page.display.textContent, '18.5')
    clickAll(['÷', '2', '='])
    assert.equal(page.display.textContent, '9.25')
    // Every checkpoint above follows `=`, and an operator in its place also completes the pending
    // operation, so those show the same. After a result, `3` starts a new calculation and `=` then
    // changes nothing; after an operator, `3` is a second number, and a second operator completes it.
    clickAll(['3', '='])
    assert.equal(page.display.textContent, '3')
    // A clear taken as `0` would show 0 straight after a result, and the next digit would replace
    // it. After a second number has begun, it shows as 80 instead.
    clickAll(['×', '8', 'C'])
    assert.equal(page.display.textContent, '0')
    clickAll(['6', '7', '8', '9', '0'])
    assert.equal(page.display.textContent, '67890')
  })

  test('A calculator key typed with AltGr still counts', () => {
    // The spec's keys work "whatever modifier the keyboard layout needs". Windows reports AltGr as
    // Ctrl+Alt, which the page otherwise reads as a shortcut, so AltGr is told apart by its own
    // modifier state.
    const page = openPage()
    const altGr = { ctrlKey: true, altKey: true, modifierAltGraph: true }
    assert.equal(type(page, '6'), true)
    assert.equal(type(page, '*', altGr), true, '* typed with AltGr taken')
    assert.equal(type(page, '7'), true)
    assert.equal(type(page, 'Enter'), true)
    assert.equal(page.display.textContent, '42')
  })
})
