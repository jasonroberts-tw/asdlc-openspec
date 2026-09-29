/**
 * The directories a package script hands `scripts/run-tests.mjs` with `--dir <dir>`, and the one glob
 * of the files the runner runs under each: the home of that expansion, which the runner itself and
 * every gate that reads which files hold tests (`tools/trace/trace.ts`, `scripts/check-test-inventory.mjs`,
 * `scripts/check-thresholds.mjs`) import, so the four cannot disagree. Were a gate to read the quoted
 * patterns alone, a test under such a directory, the build workflow's test-builder's
 * (asdlc-openspec-j09.11), would run and meet no obligation, go unseen when removed, and add no coverage.
 * A `--dir` with no directory after it throws, so a gate refuses the script rather than read it as none.
 */

export const RUNNER = 'scripts/run-tests.mjs'

/** The glob of the files `run-tests.mjs --dir <dir>` runs: every `*.test.js` at any depth under `dir`. */
export const dirGlob = (dir) => `${dir}/**/*.test.js`

const SEPARATORS = ['&&', '||', ';', '|']

/** The words of a script's command, a quoted word as one, its quotes removed. */
export const words = (command) => [...String(command).matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3])

/** The directory after each `--dir` in each call of the runner in `command`, trailing slashes dropped. */
export function runnerDirs(command) {
  const all = words(command)
  const dirs = []
  let inRunner = false
  for (let i = 0; i < all.length; i++) {
    if (SEPARATORS.includes(all[i])) inRunner = false
    else if (all[i] === RUNNER) inRunner = true
    else if (inRunner && all[i] === '--dir') {
      const dir = all[i + 1]
      if (dir === undefined || dir.startsWith('-') || SEPARATORS.includes(dir)) {
        throw new Error(`the script \`${command}\` gives \`${RUNNER}\` a \`--dir\` with no directory after it, so which files it runs cannot be read.`)
      }
      dirs.push(dir.replace(/\/+$/, ''))
      i++
    }
  }
  return dirs
}

/** Every `--dir` directory of every script in `scripts` (a package.json's `scripts`), once, in code-point order. */
export function scriptDirs(scripts) {
  const dirs = new Set(Object.values(scripts ?? {}).flatMap((command) => runnerDirs(command)))
  return [...dirs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}
