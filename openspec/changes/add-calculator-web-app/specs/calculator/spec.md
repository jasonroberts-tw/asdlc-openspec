## ADDED Requirements

### Requirement: Keypad and display

The calculator page SHALL show one display and a keypad with a button for each digit `0` to `9`, a
decimal point (`.`), the four operators add (`+`), subtract (`−`), multiply (`×`) and divide (`÷`),
equals (`=`) and clear (`C`). Every button SHALL have an accessible name, and the display SHALL be a
polite live region, so that assistive technology announces each value it shows.

#### Scenario: The page opens showing zero

- **WHEN** a person opens the calculator page
- **THEN** the display shows `0`
- **AND** the keypad shows the digits `0` to `9`, `.`, `+`, `−`, `×`, `÷`, `=` and `C`

#### Scenario: Every button can be named by assistive technology

- **WHEN** the accessible names of the keypad's buttons are read
- **THEN** each digit button is named by its digit
- **AND** the others are named `decimal point`, `add`, `subtract`, `multiply`, `divide`, `equals` and `clear`
- **AND** the display carries `aria-live="polite"`

### Requirement: Number entry

Pressing a digit SHALL append it to the number being entered, and the display SHALL show that number
as typed. A leading zero SHALL be replaced by the next digit rather than kept. A number SHALL hold at
most one decimal point, and a further press of the decimal point SHALL change nothing. Pressing the
decimal point before any digit SHALL start the number as `0.`.

#### Scenario: Digits build a number

- **WHEN** a person presses `1`, `2`, `3`
- **THEN** the display shows `123`

#### Scenario: A leading zero is replaced

- **WHEN** a person presses `0`, `7`
- **THEN** the display shows `7`

#### Scenario: A second decimal point is ignored

- **WHEN** a person presses `1`, `.`, `5`, `.`, `2`
- **THEN** the display shows `1.52`

#### Scenario: A number can start with the decimal point

- **WHEN** a person presses `.`, `5`
- **THEN** the display shows `0.5`

### Requirement: Arithmetic operations

Pressing an operator, a second number and then equals SHALL apply that operator to the number shown
before the operator and the number entered after it, and the display SHALL show the result. A
negative result SHALL be shown with a leading `-`.

#### Scenario: Addition

- **WHEN** a person presses `2`, `+`, `3`, `=`
- **THEN** the display shows `5`

#### Scenario: Subtraction below zero

- **WHEN** a person presses `3`, `−`, `5`, `=`
- **THEN** the display shows `-2`

#### Scenario: Multiplication

- **WHEN** a person presses `6`, `×`, `7`, `=`
- **THEN** the display shows `42`

#### Scenario: Division

- **WHEN** a person presses `7`, `÷`, `2`, `=`
- **THEN** the display shows `3.5`

### Requirement: Operations chain from left to right

When an operator is pressed while an operation is pending and its second number has been entered,
the calculator SHALL first complete the pending operation, show its result, and use that result as
the first number of the new operation. It SHALL NOT apply operator precedence. Pressing an operator
again before any digit of the second number SHALL replace the pending operator.

#### Scenario: A chain ignores operator precedence

- **WHEN** a person presses `2`, `+`, `3`, `×`
- **THEN** the display shows `5`
- **AND** when the person then presses `4`, `=`, the display shows `20`

#### Scenario: A second operator replaces the first

- **WHEN** a person presses `8`, `+`, `−`, `3`, `=`
- **THEN** the display shows `5`

### Requirement: Equals

Equals SHALL complete the pending operation. After a result is shown, a digit or the decimal point
SHALL start a new calculation, and an operator SHALL continue from the result. Equals with no
operation pending, or before any digit of the pending operation's second number, SHALL change
nothing.

#### Scenario: A digit after a result starts a new calculation

- **WHEN** a person presses `2`, `+`, `3`, `=`, `4`
- **THEN** the display shows `4`
- **AND** when the person then presses `+`, `1`, `=`, the display shows `5`

#### Scenario: An operator after a result continues from it

- **WHEN** a person presses `2`, `+`, `3`, `=`, `+`, `4`, `=`
- **THEN** the display shows `9`

#### Scenario: Equals with nothing pending changes nothing

- **WHEN** a person presses `2`, `+`, `3`, `=`, `=`
- **THEN** the display shows `5`

#### Scenario: Equals before the second number changes nothing

- **WHEN** a person presses `2`, `+`, `=`
- **THEN** the display shows `2`
- **AND** when the person then presses `3`, `=`, the display shows `5`

### Requirement: Clear

Clear SHALL set the display to `0` and discard the number being entered, any pending operation and
any error.

#### Scenario: Clear discards a pending operation

- **WHEN** a person presses `7`, `+`, `8`, `C`
- **THEN** the display shows `0`
- **AND** when the person then presses `2`, `=`, the display shows `2`

### Requirement: Division by zero

An operation that divides by zero SHALL show `Error` in the display, never a number, `Infinity` or
`NaN`. While `Error` is shown, an operator or equals SHALL change nothing, and a digit or the decimal
point SHALL start a new calculation.

#### Scenario: Dividing by zero shows an error

- **WHEN** a person presses `5`, `÷`, `0`, `=`
- **THEN** the display shows `Error`

#### Scenario: A chain that divides by zero shows an error

- **WHEN** a person presses `5`, `÷`, `0`, `+`
- **THEN** the display shows `Error`

#### Scenario: An operator after an error changes nothing

- **WHEN** a person presses `5`, `÷`, `0`, `=`, `+`
- **THEN** the display shows `Error`

#### Scenario: A digit after an error starts a new calculation

- **WHEN** a person presses `5`, `÷`, `0`, `=`, `3`, `+`, `4`, `=`
- **THEN** the display shows `7`

### Requirement: Results are rounded for display

A result SHALL be shown rounded to at most ten significant digits, with any trailing zeros after the
decimal point, and a decimal point left trailing, removed, so that the error of binary
floating-point arithmetic does not reach the display. A result whose magnitude is at least 10^10, or
that is not zero and below 10^-6, SHALL be shown in exponent notation, its mantissa rounded and
trimmed the same way. A number being entered is shown as typed and is not rounded.

#### Scenario: Floating-point error is not shown

- **WHEN** a person presses `0`, `.`, `1`, `+`, `0`, `.`, `2`, `=`
- **THEN** the display shows `0.3`

#### Scenario: A repeating result is cut to ten significant digits

- **WHEN** a person presses `2`, `÷`, `3`, `=`
- **THEN** the display shows `0.6666666667`

#### Scenario: A large result is shown in exponent notation

- **WHEN** a person presses `1`, `0`, `0`, `0`, `0`, `0`, `×`, `1`, `0`, `0`, `0`, `0`, `0`, `=`
- **THEN** the display shows `1e+10`

#### Scenario: A small result is shown in exponent notation

- **WHEN** a person presses `1`, `÷`, `1`, `0`, `0`, `0`, `0`, `0`, `0`, `0`, `=`
- **THEN** the display shows `1e-7`

### Requirement: Keyboard input

While the calculator page has focus, the keys `0` to `9`, `.`, `+`, `-`, `*` and `/` SHALL act as
the matching buttons, `Enter` and `=` SHALL act as equals, and `Escape` SHALL act as clear. Any other
key SHALL change nothing.

#### Scenario: A calculation typed on the keyboard

- **WHEN** a person types `6`, `*`, `7`, `Enter`
- **THEN** the display shows `42`

#### Scenario: Escape clears

- **WHEN** a person types `9`, `Escape`
- **THEN** the display shows `0`

#### Scenario: Other keys are ignored

- **WHEN** a person types `4`, `a`
- **THEN** the display shows `4`
