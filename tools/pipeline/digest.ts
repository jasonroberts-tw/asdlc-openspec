/**
 * Content digests over a declared set of files.
 *
 * This is the primitive the provenance stamp is built on: a record, in each artifact, of WHAT IT WAS
 * BUILT FROM, cheap enough to recompute anywhere. Three properties are the whole point, and each one
 * is a constraint on the code below rather than a nice-to-have:
 *
 *  1. **Computing it never runs the generator.** A sorted walk and a fold of per-file SHA-256s.
 *     Wherever a node's inputs are committed files in THIS repository, the digest is computable in
 *     CI with no `../sibling` checkout -- which puts a node whose own `--check` cannot run in CI
 *     behind an automated gate all the same. That `--check` is not being asked to move into CI.
 *  2. **Per-group granularity.** "a node is stale because its input group `<name>` moved" is
 *     actionable; "a node is stale" is not. So a group digest is a first-class value, not an
 *     intermediate.
 *  3. **Reproducible byte-for-byte across machines.** Anything that varies with filesystem order,
 *     path separator, mtime or locale is excluded. The fold below reads file CONTENT and nothing
 *     else -- no size, no mode, no timestamp.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { filesMatching } from './glob.ts'

/** `sha256:` + 64 lowercase hex. The prefix is carried so a stamp says what it is. */
export type Digest = `sha256:${string}`

const sha256 = (data: string | Buffer): Digest =>
  `sha256:${createHash('sha256').update(data).digest('hex')}`

/**
 * The digest of one file's bytes.
 *
 * Read as a Buffer, never as a string. Decoding to UTF-8 and re-encoding would normalise nothing
 * useful and would corrupt a committed artifact that is not UTF-8: a data file kept in its source
 * encoding on purpose, or a PNG baseline, which is not text at all.
 */
export const fileDigest = (abs: string): Digest => sha256(readFileSync(abs))

/**
 * The digest of an in-memory string -- the sibling of `fileDigest` for a value never written to disk.
 *
 * Exists for `nodeRecordDigest`, which hashes a node's declared record out of `graph.ts` rather than
 * the file's bytes. Takes a string rather than a value so the CALLER owns canonicalisation: key
 * order in `JSON.stringify` is insertion order, and a digest that silently depended on it would fold
 * differently for the same record written two ways.
 */
export const stringDigest = (s: string): Digest => sha256(s)

/**
 * Fold a set of files into one digest, keyed by path so a RENAME registers as a change.
 *
 * Hashing content alone would make `git mv a.json b.json` invisible, and a renamed input is exactly
 * the change that once left a generated record citing a file that no longer existed. Path and content are
 * separated by a NUL, which cannot occur in either, so no path can be constructed that folds to the
 * same bytes as a different path plus content.
 */
export function foldFiles(root: string, files: readonly string[]): Digest {
  const h = createHash('sha256')
  for (const rel of [...files].sort()) {
    h.update(rel)
    h.update('\0')
    h.update(fileDigest(join(root, rel)))
    h.update('\n')
  }
  return `sha256:${h.digest('hex')}`
}

/** The digest of every file matching `globs`, plus the file list that produced it. */
export function digestGlobs(
  root: string,
  globs: readonly string[],
): { digest: Digest; files: string[] } {
  const files = filesMatching(root, globs)
  return { digest: foldFiles(root, files), files }
}

/**
 * Fold a set of already-computed group digests into one.
 *
 * Sorted by group name, so declaring a new input group in `graph.ts` in a different position does
 * not move the digest -- only its NAME and CONTENT do. That matters because the manifest is edited
 * by hand and re-ordering a record is the kind of change a reviewer expects to be inert.
 */
export function foldGroups(groups: Readonly<Record<string, string>>): Digest {
  const h = createHash('sha256')
  for (const name of Object.keys(groups).sort()) {
    h.update(name)
    h.update('\0')
    h.update(groups[name] as string)
    h.update('\n')
  }
  return `sha256:${h.digest('hex')}`
}

/** `sha256:1f9c…` -- for a report column, never for a comparison. */
export const short = (d: string): string =>
  d.startsWith('sha256:') ? `sha256:${d.slice(7, 11)}…` : d
