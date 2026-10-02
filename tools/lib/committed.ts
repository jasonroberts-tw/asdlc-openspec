/**
 * committed.ts — how an emitter's `:check` reads the file it committed and says where that file
 * first differs from what it re-derives; the trace and co-change emitters share it, so a stale
 * file is reported in the same words by both (asdlc-openspec-3oln). Imported, never run; it needs
 * nothing but the file system.
 */
import { existsSync, readFileSync } from 'node:fs'

/** A committed file's text with Windows line endings read as `\n`, or null when it is not there. */
export const readText = (path: string): string | null => (existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n') : null)

/** The first line where `a` and `b` differ, for a stale file's refusal. */
export function firstDifference(a: string, b: string): string {
  const left = a.split('\n')
  const right = b.split('\n')
  for (let n = 0; n < Math.max(left.length, right.length); n++) {
    if (left[n] !== right[n]) return `line ${n + 1}: committed ${JSON.stringify(left[n] ?? null)}, re-derived ${JSON.stringify(right[n] ?? null)}`
  }
  return 'no line differs'
}
