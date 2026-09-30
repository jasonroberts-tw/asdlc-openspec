/**
 * `npm run citations:support` -- does the passage a citation names say what the sentence citing it
 * claims? An ADVISORY command: it prints findings for a person to read and refuses nothing.
 *
 * WHAT IT DOES. Code finds and resolves every citation with the scanner `citations:check` uses
 * (`tools/citations/scan.ts`). For each one it hands TypeSafe a Choice over two texts -- the line
 * before the pointer, its line and the line after, and the cited section whole -- and asks whether
 * the section supports the claim, contradicts it or says nothing about it. A citation whose
 * probability of "supports" is under `citationSupportMinProbability` is printed, with the verdict
 * that carried the rest and both probabilities.
 *
 * THE FAILURE IT EXISTS TO PREVENT. `citations:check` proves a pointer RESOLVES and nothing more:
 * `namesSection` accepts a section citation when any leading word-prefix of it starts any line of the
 * target file, so a table row or a body sentence satisfies a citation it was never meant to (the
 * loss its own header names, "a false PASS"). The result reads as authoritative and points at prose
 * that does not say what is claimed. On 2026-09-29 a one-off run of this judgment over this
 * repository's citations found `docs/playbook.md:53` citing `README.md` § Setup for a sentence that
 * sits in that file's table (`asdlc-openspec-6yt.2`), a pointer the gate passed. The wrong fixes,
 * each tried on the way to this shape and refused: the citing passage as its whole paragraph or
 * table cut at 900 characters flagged 12 of 60 real citations, because the pointer often fell past
 * the cut; and a phrase registry (the `model-citations.ts` the scanner's header once named) covers
 * only citations that adopted it, where this reads the citations already written.
 *
 * WHY IT IS NOT A GATE, and never in `citations:check`. It reads `TYPESAFE_API_KEY` and the network,
 * so it runs in neither pre-push nor `.github/workflows/verify.yml` (`CLAUDE.md` § The gate ladder);
 * its selftest, `npm run citations:support:selftest`, runs in both over a stubbed judge. A verdict
 * only ever adds a finding for a person. It never clears a refusal, and it never changes a file
 * (`CLAUDE.md` § A program proposes; only a person promotes).
 *
 * WHERE IT LOSES. A pointer that cites a whole section for one of its subsections reads "says
 * nothing" where a person would accept it: review noise, not a defect. A section that runs on to
 * the end of a file with no headings after it is cut at `citationSupportSectionMaxChars`. A judgment
 * is a probability over two texts and can be wrong in either direction, so a finding is read and
 * a silence is not proof.
 *
 *   npm run citations:support                    every citation in every tracked text file
 *   npm run citations:support -- --file <path>   only citations written in <path> (repeatable), as
 *                                                a session checks the files its change touched
 *   npm run citations:support -- --min <p>       this run's threshold in place of the policy's, as a
 *                                                by-hand look at how many findings a threshold gives
 *   npm run citations:support -- --dry-run       count what would be judged; no key, no call
 *   npm run citations:support -- --selftest      the selftest, `npm run citations:support:selftest`
 *   CITATIONS_ROOT=<dir> npm run citations:support   the same run over a doctored copy (a git tree)
 *   CITATIONS_UNTRACKED=1 npm run citations:support  also reads untracked files git does not ignore
 *
 * Exit 0 with or without findings, and 0 when `TYPESAFE_API_KEY` is not set (it prints why and
 * skips); 1 when the key is set and a call fails, or the policy is wrong; 2 on a bad flag. Every
 * threshold and constant is a key of `tools/policy.json` with a `Means` sibling.
 *
 * Needs `TYPESAFE_API_KEY` and the network to judge (`tools/lib/typesafe.ts`), `git` on PATH, and
 * `npm ci` for the SDK. About 500 requests, sent in parallel, in seconds and a few cents.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { ROOT, readJson } from '../lib/paths.ts'
import type { TypeSafeJudge } from '../lib/typesafe.ts'
import { createJudge } from '../lib/typesafe.ts'
import {
  INCLUDE_UNTRACKED,
  SCAN_ROOT,
  SCANNED_EXTENSIONS,
  citationsIn,
  historyReason,
  indexByName,
  isQuoted,
  lineReader,
  namesSection,
  resolveTarget,
  retiredWithoutPath,
  trackedFiles,
  untrackedFiles,
} from './scan.ts'

/** The keys of `tools/policy.json` this command reads, each with a `<key>Means` sibling. */
export interface SupportPolicy {
  typesafeModel: string
  citationSupportMinProbability: number
  citationSupportSkipPaths: string[]
  citationSupportSectionMaxChars: number
  citationSupportLineContext: number
  citationSupportConcurrency: number
  citationSupportMaxCitations: number
}

const POLICY_KEYS: ReadonlyArray<{ key: keyof SupportPolicy; type: 'string' | 'number' | 'strings' }> = [
  { key: 'typesafeModel', type: 'string' },
  { key: 'citationSupportMinProbability', type: 'number' },
  { key: 'citationSupportSkipPaths', type: 'strings' },
  { key: 'citationSupportSectionMaxChars', type: 'number' },
  { key: 'citationSupportLineContext', type: 'number' },
  { key: 'citationSupportConcurrency', type: 'number' },
  { key: 'citationSupportMaxCitations', type: 'number' },
]

const POLICY_FILE = 'tools/policy.json'

/** This command's keys from a policy file, or a thrown error naming the key that is missing or wrong. */
export function loadPolicy(path: string = join(ROOT, POLICY_FILE)): SupportPolicy {
  const raw = readJson<Record<string, unknown>>(path)
  for (const { key, type } of POLICY_KEYS) {
    const value = raw[key]
    const shapeOk =
      type === 'string'
        ? typeof value === 'string' && value !== ''
        : type === 'number'
          ? typeof value === 'number' && Number.isFinite(value) && value >= 0
          : Array.isArray(value) && value.every((v) => typeof v === 'string')
    if (!shapeOk) {
      throw new Error(`${POLICY_FILE} has no usable \`${key}\` (a ${type}): ${JSON.stringify(value)}`)
    }
    if (typeof raw[`${key}Means`] !== 'string') {
      throw new Error(`${POLICY_FILE} has \`${key}\` and no \`${key}Means\` saying what it decides.`)
    }
  }
  const policy = raw as unknown as SupportPolicy
  if (policy.citationSupportMinProbability > 1) {
    throw new Error(`${POLICY_FILE} \`citationSupportMinProbability\` is a probability, at most 1.`)
  }
  if (policy.citationSupportConcurrency < 1) {
    throw new Error(`${POLICY_FILE} \`citationSupportConcurrency\` is at least 1.`)
  }
  return policy
}

/** The question TypeSafe is asked. Its labels are the three verdicts, and no others. */
const INSTRUCTIONS =
  'The state holds two texts. `claim` is the few lines around a pointer in one document; `section`' +
  ' is the passage of another document that the pointer names. Judge only what the sentence' +
  ' carrying the pointer says the passage contains. How does the section relate to that?'

const CRITERIA = {
  supports: 'The section states what the sentence says it states, or directly implies it.',
  contradicts:
    'The section states the opposite of what the sentence says it states, or implies that is false.',
  says_nothing: 'The section does not address what the sentence says it states, either way.',
} as const

export type Verdict = keyof typeof CRITERIA

/** One citation, with the two texts a judgment is made over. */
export interface Candidate {
  /** The file and 1-based line the citation is written at. */
  where: string
  /** The citation as written, `file.md:12` or `file.md § Name`. */
  asWritten: string
  /** The line before the pointer, its line and the line after. */
  claim: string
  /** The cited passage: a section whole, or the cited lines and their neighbours. */
  passage: string
  /** The file the pointer resolved to. */
  resolvedTo: string
  /** Whether `passage` was cut at `citationSupportSectionMaxChars`. */
  truncated: boolean
}

/** What was left out of the judged set, and why. Every skip is counted so none is silent. */
export interface Skipped {
  /** Written in a file under a HISTORY root, which records what was said. */
  history: number
  /** Written in a file `citationSupportSkipPaths` names, such as the register. */
  register: number
  /** Registered in `QUOTED`, a dead pointer quoted on purpose. */
  quoted: number
  /** A pointer that does not resolve, which `citations:check` reports and this does not judge. */
  unresolved: number
}

const HEADING = /^(#{1,6})\s/

const headingText = (line: string): string =>
  line
    .replace(/^#{1,6}\s+/, '')
    .replace(/[*_`"]/g, '')
    .trim()
    .toLowerCase()

/** Mirrors `bare` in `scan.ts`, which is not exported: a line as the text a section name is written as. */
const bareLine = (line: string): string =>
  line
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/[*_`"]/g, '')
    .trim()
    .toLowerCase()

/**
 * The lines a section citation names, `[start, end)`, or null when `namesSection` says none is named.
 *
 * It follows `namesSection`'s own order (a section number, then the longest leading word-prefix of the
 * name) but returns WHERE it matched, which `namesSection` does not. At each length a heading that
 * contains the probe wins over a line that merely starts with it, so a table row or a body sentence
 * that begins with the name is not taken for the section. The section runs to the next heading of the
 * same or a higher level, so its subsections are part of it; a match that is not an ATX heading (the
 * prompt files' bare uppercase labels) runs to the next heading of any level, or the end of the file.
 * `citationSupportSectionMaxChars` bounds the rest.
 */
export function sectionSpan(
  section: string,
  lines: readonly string[],
): { start: number; end: number } | null {
  if (!namesSection(section, lines)) return null
  const words = section
    .replace(/[*_`"]/g, '')
    .split(/\s+/)
    .filter(Boolean)
  const bares = lines.map(bareLine)

  let start = -1
  const numbered = /^(\d+(?:\.\d+)*)/.exec(words[0] ?? '')
  if (numbered) {
    const number = new RegExp(`^${(numbered[1] as string).replace(/\./g, '\\.')}([.)\\s]|$)`)
    start = bares.findIndex((b) => number.test(b))
  }
  for (let n = words.length; start === -1 && n > 0; n--) {
    const probe = words
      .slice(0, n)
      .join(' ')
      .replace(/[.,;:)\]]+$/, '')
      .toLowerCase()
    if (probe.length < 2) continue
    start = lines.findIndex((l) => HEADING.test(l) && headingText(l).includes(probe))
    if (start === -1) start = bares.findIndex((b) => b.startsWith(probe))
  }
  if (start === -1) return null

  const level = HEADING.exec(lines[start] as string)?.[1]?.length
  let end = start + 1
  while (end < lines.length) {
    const next = HEADING.exec(lines[end] as string)?.[1]?.length
    if (next !== undefined && (level === undefined || next <= level)) break
    end++
  }
  return { start, end }
}

/** `text` cut to `max` characters, and whether it was cut. */
function cut(text: string, max: number): { text: string; truncated: boolean } {
  return text.length > max ? { text: text.slice(0, max), truncated: true } : { text, truncated: false }
}

/** A line no longer than `width`, windowed round `needle` where it is longer, so a pointer is never cut. */
function window(line: string, needle: string, width: number): string {
  if (line.length <= width) return line
  const at = Math.max(0, line.indexOf(needle) - Math.floor(width / 2))
  return line.slice(at, at + width)
}

export interface Collected {
  candidates: Candidate[]
  skipped: Skipped
  /** Files read for citations. */
  files: number
}

/**
 * Every citation worth judging, from every tracked text file (or only the files in `only`).
 *
 * The walk is `citations:check`'s, with the same exemptions, and it judges only what that gate
 * resolves: a pointer that does not resolve is counted as `unresolved` and left to the gate that owns it.
 */
export function collect(policy: SupportPolicy, only: readonly string[] = []): Collected {
  const untracked = INCLUDE_UNTRACKED ? untrackedFiles() : []
  const tracked = [...trackedFiles(), ...untracked]
  const trackedSet = new Set(tracked)
  const byName = indexByName(tracked)
  const linesOf = lineReader()
  const skipped: Skipped = { history: 0, register: 0, quoted: 0, unresolved: 0 }
  const candidates: Candidate[] = []
  let files = 0

  for (const file of tracked) {
    if (!SCANNED_EXTENSIONS.test(file)) continue
    if (only.length && !only.includes(file)) continue
    let text: string
    try {
      text = readFileSync(join(SCAN_ROOT, file), 'utf8')
    } catch {
      continue
    }
    if (text.includes('\0')) continue
    files++
    const found = citationsIn(file, text)
    if (historyReason(file)) {
      skipped.history += found.length
      continue
    }
    if (policy.citationSupportSkipPaths.some((p) => file === p || file.startsWith(p))) {
      skipped.register += found.length
      continue
    }
    const own = text.split('\n')

    for (const c of found) {
      const asWritten =
        c.kind === 'line'
          ? `${c.target}:${c.first}${c.last === c.first ? '' : `-${c.last}`}`
          : `${c.target} § ${c.section}`
      if (isQuoted(c.from, asWritten)) {
        skipped.quoted++
        continue
      }
      const resolved = resolveTarget(c.from, c.target, trackedSet, byName)
      if ('error' in resolved || retiredWithoutPath(c.from, c.target, resolved.path)) {
        skipped.unresolved++
        continue
      }
      const lines = linesOf(resolved.path)

      let passageLines: readonly string[]
      if (c.kind === 'line') {
        if (c.first < 1 || c.last > lines.length) {
          skipped.unresolved++
          continue
        }
        const context = policy.citationSupportLineContext
        passageLines = lines.slice(Math.max(0, c.first - 1 - context), Math.min(lines.length, c.last + context))
      } else {
        const span = sectionSpan(c.section, lines)
        if (!span) {
          skipped.unresolved++
          continue
        }
        passageLines = lines.slice(span.start, span.end)
      }
      const passage = cut(passageLines.join('\n'), policy.citationSupportSectionMaxChars)
      const claim = own
        .slice(Math.max(0, c.at - 2), c.at + 1)
        .map((l) => window(l, c.target, 800))
        .join('\n')
      candidates.push({
        where: `${c.from}:${c.at}`,
        asWritten,
        claim,
        passage: passage.text,
        resolvedTo: resolved.path,
        truncated: passage.truncated,
      })
    }
  }
  return { candidates, skipped, files }
}

/** A citation the section did not support, at the policy's threshold. */
export interface Finding {
  candidate: Candidate
  /** The verdict that carried the rest of the probability: contradicts or says_nothing. */
  verdict: Exclude<Verdict, 'supports'>
  /** That verdict's probability. */
  probability: number
  pSupports: number
}

export interface Judged {
  findings: Finding[]
  /** How many were supported at the threshold. */
  supported: number
}

/**
 * Judge every candidate, `citationSupportConcurrency` at a time. The first error stops new requests and
 * rejects with it: a failed call is a failure, never a citation left unjudged in silence.
 */
export async function judgeAll(
  candidates: readonly Candidate[],
  judge: TypeSafeJudge,
  policy: SupportPolicy,
): Promise<Judged> {
  const findings: Array<Finding | null> = new Array(candidates.length).fill(null)
  let next = 0
  let stopped = false

  const worker = async (): Promise<void> => {
    while (!stopped) {
      const i = next++
      const candidate = candidates[i]
      if (!candidate) return
      try {
        const answer = await judge.choose({
          state: { claim: candidate.claim, section: candidate.passage },
          instructions: INSTRUCTIONS,
          criteria: CRITERIA,
        })
        for (const label of Object.keys(CRITERIA)) {
          const p = answer.probabilities[label]
          if (typeof p !== 'number' || !(p >= 0 && p <= 1)) {
            throw new Error(`the answer for ${candidate.where} has no probability for "${label}"`)
          }
        }
        const pSupports = answer.probabilities.supports as number
        if (pSupports >= policy.citationSupportMinProbability) continue
        const contradicts = answer.probabilities.contradicts as number
        const saysNothing = answer.probabilities.says_nothing as number
        const verdict = contradicts > saysNothing ? 'contradicts' : 'says_nothing'
        findings[i] = {
          candidate,
          verdict,
          probability: verdict === 'contradicts' ? contradicts : saysNothing,
          pSupports,
        }
      } catch (error) {
        stopped = true
        throw error
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(policy.citationSupportConcurrency, candidates.length) }, worker))
  const flagged = findings.filter((f): f is Finding => f !== null)
  return { findings: flagged, supported: candidates.length - flagged.length }
}

const pct = (p: number): string => p.toFixed(2)

/** The report: counts, never a rate (`CLAUDE.md` § Stateful counts live in `count-index.md`, under a key). */
export function report(collected: Collected, judged: Judged, policy: SupportPolicy): string {
  const { candidates, skipped } = collected
  const lines: string[] = []
  lines.push(
    `citations:support -- ${candidates.length} citations judged across ${collected.files} files;` +
      ` ${judged.findings.length} not supported at P(supports) >= ${policy.citationSupportMinProbability}` +
      ` (skipped: ${skipped.history} written in history files, ${skipped.register} in the register,` +
      ` ${skipped.quoted} registered as quotations, ${skipped.unresolved} that do not resolve, which` +
      ' `citations:check` reports)\n',
  )
  for (const f of judged.findings) {
    lines.push(`  ${f.candidate.where}`)
    lines.push(
      `    cites ${f.candidate.asWritten}: ${f.verdict.replace('_', ' ')} (${pct(f.probability)});` +
        ` P(supports) ${pct(f.pSupports)}${f.candidate.truncated ? '; section cut for length' : ''}`,
    )
    const own = f.candidate.claim.split('\n')
    lines.push(`    > ${(own[own.length > 2 ? 1 : 0] ?? '').trim().slice(0, 160)}\n`)
  }
  lines.push(
    'Advisory: each finding is a probability for a person to read, and nothing here refuses a push. A' +
      '\npointer that cites a whole section for one of its subsections reads as "says nothing" and is noise.',
  )
  return lines.join('\n')
}

export interface MainDeps {
  env?: Readonly<Record<string, string | undefined>>
  /** Makes the judge; the real SDK's by default, a stub in the selftest. */
  makeJudge?: (options: { env: Readonly<Record<string, string | undefined>>; model: string }) => ReturnType<typeof createJudge>
  out?: (text: string) => void
  err?: (text: string) => void
  policyPath?: string
}

/** The command, with its dependencies handed in so the selftest can run it whole over a stub. */
export async function supportMain(argv: readonly string[], deps: MainDeps = {}): Promise<number> {
  const env = deps.env ?? process.env
  const out = deps.out ?? ((t) => console.log(t))
  const err = deps.err ?? ((t) => console.error(t))
  const makeJudge = deps.makeJudge ?? createJudge

  const only: string[] = []
  let dryRun = false
  let minOverride: number | null = null
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') dryRun = true
    else if (arg === '--file' && argv[i + 1]) only.push(argv[++i] as string)
    else if (arg === '--min' && argv[i + 1] !== undefined) {
      minOverride = Number(argv[++i])
      if (!(minOverride >= 0 && minOverride <= 1)) {
        err(`citations:support: --min is a probability from 0 to 1, not ${JSON.stringify(argv[i])}.`)
        return 2
      }
    } else {
      err(`citations:support: unknown or incomplete flag ${JSON.stringify(arg)}. See the header of tools/citations/support.ts.`)
      return 2
    }
  }

  let policy: SupportPolicy
  try {
    policy = loadPolicy(deps.policyPath)
  } catch (error) {
    err(`citations:support FAILED: ${(error as Error).message}`)
    return 1
  }
  if (minOverride !== null) policy = { ...policy, citationSupportMinProbability: minOverride }

  const collected = collect(policy, only)
  if (dryRun) {
    out(
      `citations:support --dry-run -- ${collected.candidates.length} citations would be judged across` +
        ` ${collected.files} files; skipped: ${collected.skipped.history} history,` +
        ` ${collected.skipped.register} register, ${collected.skipped.quoted} quoted,` +
        ` ${collected.skipped.unresolved} unresolved. No call was made.`,
    )
    return 0
  }
  if (collected.candidates.length > policy.citationSupportMaxCitations) {
    err(
      `citations:support FAILED: ${collected.candidates.length} citations would be judged, over` +
        ` \`citationSupportMaxCitations\` in ${POLICY_FILE}. Narrow the run with --file, or a person raises the key.`,
    )
    return 1
  }

  let made
  try {
    made = await makeJudge({ env, model: policy.typesafeModel })
  } catch (error) {
    err(`citations:support FAILED: ${(error as Error).message}`)
    return 1
  }
  if ('skip' in made) {
    out(`citations:support -- skipped: ${made.skip}`)
    return 0
  }
  let judged: Judged
  try {
    judged = await judgeAll(collected.candidates, made.judge, policy)
  } catch (error) {
    err(`citations:support FAILED: a TypeSafe call failed, so no verdict is reported: ${(error as Error).message}`)
    return 1
  }
  out(report(collected, judged, policy))
  return 0
}

const isEntry = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isEntry) {
  const args = process.argv.slice(2)
  if (args.length === 1 && args[0] === '--selftest') {
    const self = fileURLToPath(new URL('./support.selftest.ts', import.meta.url))
    process.exitCode = spawnSync(process.execPath, [self], { stdio: 'inherit' }).status ?? 1
  } else {
    process.exitCode = await supportMain(args)
  }
}
