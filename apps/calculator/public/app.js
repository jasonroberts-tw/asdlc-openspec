/**
 * The calculator page's wiring: `mount(doc)` connects the keypad's buttons and the keyboard to the
 * logic in `calculator.js`, and shows what the logic says in the display. It holds no arithmetic of
 * its own.
 *
 * It takes the document as an argument rather than reading the global one because jsdom does not
 * run `<script type="module">`: the tests build a DOM from the committed `index.html` and call
 * `mount` on its document themselves. In the browser, `main.js` calls it on `document`.
 *
 * What the page must do is capability `calculator`'s spec under `openspec/`, which wins over this
 * file.
 */
import { displayText, initialState, press } from './calculator.js'

/**
 * Each keyboard key the page acts on, and the calculator key it presses. A Map rather than an object
 * literal, so that a key named like an object's own property (`constructor`) finds nothing. A key
 * not here never reaches `press`, which throws on a key it does not know.
 */
const CALCULATOR_KEY_OF = new Map([
  ...Array.from('0123456789.+-*/', (key) => [key, key]),
  ['=', '='],
  ['Enter', '='],
  ['Escape', 'C'],
])

/**
 * Wire the page in `doc` to a fresh calculator: one delegated click listener on the keypad, and one
 * `keydown` listener on `doc` itself, so a key works wherever focus is on the page.
 *
 * @param {Document} doc a document holding the page's `#display` and `#keypad`
 */
export function mount(doc) {
  const display = find(doc, 'display')
  const keypad = find(doc, 'keypad')
  let state = initialState()

  function pressKey(key) {
    state = press(state, key)
    display.textContent = displayText(state)
  }

  keypad.addEventListener('click', (event) => {
    // The target can be the keypad itself, in a gap between buttons, and `closest` walks on past the
    // keypad, so a match outside it is not one of its buttons.
    const button = event.target.closest('[data-key]')
    if (button === null || !keypad.contains(button)) return
    // A button whose `data-key` is not a calculator key is a mistake in the page, and `press` throws
    // on it rather than hiding it.
    pressKey(button.dataset.key)
  })

  doc.addEventListener('keydown', (event) => {
    // A held Ctrl, Meta or Alt makes a browser or system shortcut (Ctrl+R, Cmd+1, Alt+4), which keeps
    // working. Shift is not among them: it is how most layouts type `+` and `*`. Nor is AltGr, which
    // Windows reports as Ctrl+Alt: some layouts need it to type a calculator key, and the spec says
    // those keys work whatever modifier the layout needs.
    const shortcut = event.ctrlKey || event.metaKey || event.altKey
    if (shortcut && !event.getModifierState('AltGraph')) return
    const key = CALCULATOR_KEY_OF.get(event.key)
    if (key === undefined) return
    // Taken, so the browser does nothing else with it: `/` would open quick-find in some browsers,
    // and `Enter` would also click a focused button, pressing that button as well.
    event.preventDefault()
    pressKey(key)
  })

  // The display is drawn from the state from the start, so what it shows is always the logic's word.
  display.textContent = displayText(state)
}

function find(doc, id) {
  const element = doc.getElementById(id)
  // Said here, by name, rather than as a TypeError on `null` at the first key press.
  if (element === null) throw new Error(`mount: the page has no element with id "${id}"`)
  return element
}
