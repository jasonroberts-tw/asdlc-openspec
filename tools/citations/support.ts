/**
 * `mise run citations:support` -- does the passage a citation names say what the sentence citing it
 * claims? An ADVISORY command: it prints findings for a person to read and refuses nothing.
 *
 * WHAT IT DOES. Code finds and resolves every citation with the scanner `citations:check` uses
 * (`tools/citations/scan.ts`). For each one it hands TypeSafe a Choice over two texts -- the line
 * before the pointer, its line and the line after, and the cited section whole -- and asks whether
 * the section supports the claim, contradicts it or says nothing about it. A citation whose
 * probability of "supports" is under `citationSupportMinProbability` is printed, with the verdict
 * that carried the rest and both probabilities.
 *
 * WITHOUT A KEY it falls back to an offline check, so a clone with no `TYPESAFE_API_KEY` still gets
 * a list to read. It weighs each word by how few of the scanned files hold it, and prints a citation
 * when the passage holds less than `citationSupportOverlapMinShare` of the claim's weight, leaving
 * out the words of the pointer and of the section's heading, which the passage always shares. The
 * report says which of the two judged. The fallback is only for a missing key: a key that is set
 * and a call that fails is still a failure, never a quiet run of the weaker check.
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
 * its selftest, `mise run citations:support:selftest`, runs in both over a stubbed judge. A verdict
 * only ever adds a finding for a person. It never clears a refusal, and it never changes a file
 * (`CLAUDE.md` § A program proposes; only a person promotes).
 *
 * WHERE IT LOSES. A pointer that cites a whole section for one of its subsections reads "says
 * nothing" where a person would accept it: review noise, not a defect. A section that runs on to
 * the end of a file with no headings after it is cut at `citationSupportSectionMaxChars`. A judgment
 * is a probability over two texts and can be wrong in either direction, so a finding is read and
 * a silence is not proof. The offline fallback is weaker again, as its policy key's `Means` measures:
 * a contradiction shares the section's words and passes; a pointer into the wrong section of a file
 * that repeats the claim's words there passes (`docs/playbook.md:53`, which TypeSafe flags); and a
 * claim that paraphrases its section is printed.
 *
 *   mise run citations:support                    every citation in every tracked text file
 *   mise run citations:support --file <path>   only citations written in <path> (repeatable), as
 *                                                a session checks the files its change touched
 *   mise run citations:support --min <p>       this run's threshold in place of the policy's, as a
 *                                                by-hand look at how many findings a threshold gives:
 *                                                P(supports) with a key, the word share without one
 *   mise run citations:support --dry-run       count what would be judged; no key, no call
 *   mise run citations:support --selftest      the selftest, `mise run citations:support:selftest`
 *   CITATIONS_ROOT=<dir> mise run citations:support   the same run over a doctored copy (a git tree)
 *   CITATIONS_UNTRACKED=1 mise run citations:support  also reads untracked files git does not ignore
 *
 * Exit 0 with or without findings, and 0 when `TYPESAFE_API_KEY` is not set (it prints why and
 * judges by word overlap); 1 when the key is set and a call fails, or the policy is wrong; 2 on a
 * bad flag. Every threshold and constant is a key of `tools/policy/tool-settings.json` with a `Means`
 * sibling, read through `tools/lib/policy.ts`.
 *
 * Needs `TYPESAFE_API_KEY` and the network to judge with TypeSafe (`tools/lib/typesafe.ts`), `git`
 * on PATH, and `npm ci` for the SDK. About 500 requests, sent in parallel, in seconds and a few
 * cents. Without the key it needs neither, and reads every scanned file once to weigh the words.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { ROOT } from '../lib/paths.ts'
import { POLICY_DIR, readPolicy } from '../lib/policy.ts'
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

/** The keys of `tools/policy/tool-settings.json` this command reads, each with a `<key>Means` sibling. */
export interface SupportPolicy {
  typesafeModel: string
  citationSupportMinProbability: number
  citationSupportSkipPaths: string[]
  citationSupportSectionMaxChars: number
  citationSupportClaimLineMaxChars: number
  citationSupportLineContext: number
  citationSupportConcurrency: number
  citationSupportMaxCitations: number
  citationSupportOverlapMinShare: number
}

const POLICY_KEYS: ReadonlyArray<{ key: keyof SupportPolicy; type: 'string' | 'number' | 'strings' }> = [
  { key: 'typesafeModel', type: 'string' },
  { key: 'citationSupportMinProbability', type: 'number' },
  { key: 'citationSupportSkipPaths', type: 'strings' },
  { key: 'citationSupportSectionMaxChars', type: 'number' },
  { key: 'citationSupportClaimLineMaxChars', type: 'number' },
  { key: 'citationSupportLineContext', type: 'number' },
  { key: 'citationSupportConcurrency', type: 'number' },
  { key: 'citationSupportMaxCitations', type: 'number' },
  { key: 'citationSupportOverlapMinShare', type: 'number' },
]

/** The record that holds this command's keys, named in a refusal. */
const POLICY_FILE = 'tools/policy/tool-settings.json'

/** This command's keys from the policy under `root`, or a thrown error naming the key that is missing or wrong. */
export function loadPolicy(root: string = ROOT): SupportPolicy {
  let raw: Record<string, unknown>
  try {
    raw = readPolicy(root)
  } catch (error) {
    throw new Error(`${POLICY_DIR}/ cannot be read: ${(error as Error).message}`)
  }
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
  if (policy.citationSupportOverlapMinShare > 1) {
    throw new Error(`${POLICY_FILE} \`citationSupportOverlapMinShare\` is a share of a claim's words, at most 1.`)
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
        .map((l) => window(l, c.target, policy.citationSupportClaimLineMaxChars))
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

/** Lower-cased runs of letters and digits: the words the offline fallback compares. */
const wordsOf = (text: string): string[] => text.toLowerCase().match(/[a-z0-9]+/g) ?? []

/**
 * Each word's weight for the offline fallback: `ln((N + 1) / (n + 1))`, where N is the number of text
 * files the scanner reads and n how many of them hold the word. A word every file holds (`the`, `a`)
 * weighs nothing and a word few files hold weighs most, so no list of common words is kept anywhere.
 * The files are the whole scan, not the `--file` selection, so a word weighs the same in either run.
 */
export function wordWeights(): (word: string) => number {
  const files = [...trackedFiles(), ...(INCLUDE_UNTRACKED ? untrackedFiles() : [])]
  const holding = new Map<string, number>()
  let read = 0
  for (const file of files) {
    if (!SCANNED_EXTENSIONS.test(file)) continue
    let text: string
    try {
      text = readFileSync(join(SCAN_ROOT, file), 'utf8')
    } catch {
      continue
    }
    if (text.includes('\0')) continue
    read++
    for (const word of new Set(wordsOf(text))) holding.set(word, (holding.get(word) ?? 0) + 1)
  }
  return (word) => Math.log((read + 1) / ((holding.get(word) ?? 0) + 1))
}

/**
 * The share of a claim's weighted words that its passage holds, from 0 to 1: the offline fallback's
 * one number. The pointer's own words (its file and section name as written) and the words of the
 * passage's heading are left out of the claim, because the passage shares them however wrong the
 * citation is. A claim with no word of any weight left says nothing to compare, and scores 1.
 */
export function overlapShare(
  candidate: Pick<Candidate, 'claim' | 'passage' | 'asWritten'>,
  weight: (word: string) => number,
): number {
  const pointer = new Set(wordsOf(candidate.asWritten))
  const heading = candidate.passage.split('\n')[0] ?? ''
  if (HEADING.test(heading)) for (const word of wordsOf(heading)) pointer.add(word)
  const passage = new Set(wordsOf(candidate.passage))
  let total = 0
  let shared = 0
  for (const word of new Set(wordsOf(candidate.claim))) {
    if (pointer.has(word)) continue
    const w = weight(word)
    total += w
    if (passage.has(word)) shared += w
  }
  return total > 0 ? shared / total : 1
}

/** A citation whose passage holds too little of its claim's weighted words, at the policy's threshold. */
export interface OverlapFinding {
  candidate: Candidate
  share: number
}

export interface OverlapJudged {
  findings: OverlapFinding[]
  supported: number
}

/** The offline fallback over every candidate. A share at the threshold is silent, as P(supports) is. */
export function judgeByOverlap(
  candidates: readonly Candidate[],
  policy: SupportPolicy,
  weight: (word: string) => number = wordWeights(),
): OverlapJudged {
  const findings: OverlapFinding[] = []
  for (const candidate of candidates) {
    const share = overlapShare(candidate, weight)
    if (share < policy.citationSupportOverlapMinShare) findings.push({ candidate, share })
  }
  return { findings, supported: candidates.length - findings.length }
}

const pct = (p: number): string => p.toFixed(2)

const skippedText = (skipped: Skipped): string =>
  `(skipped: ${skipped.history} written in history files, ${skipped.register} in the register,` +
  ` ${skipped.quoted} registered as quotations, ${skipped.unresolved} that do not resolve, which` +
  ' `citations:check` reports)'

/** A finding's pointer line, as the report quotes it. */
const pointerLine = (candidate: Candidate): string => {
  const own = candidate.claim.split('\n')
  return `    > ${(own[own.length > 2 ? 1 : 0] ?? '').trim().slice(0, 160)}\n`
}

/** The report: counts, never a rate (`CLAUDE.md` § Stateful counts live in `count-index.md`, under a key). */
export function report(collected: Collected, judged: Judged, policy: SupportPolicy): string {
  const { candidates, skipped } = collected
  const lines: string[] = []
  lines.push(
    `citations:support -- ${candidates.length} citations judged across ${collected.files} files;` +
      ` ${judged.findings.length} not supported at P(supports) >= ${policy.citationSupportMinProbability}` +
      ` ${skippedText(skipped)}\n`,
  )
  for (const f of judged.findings) {
    lines.push(`  ${f.candidate.where}`)
    lines.push(
      `    cites ${f.candidate.asWritten}: ${f.verdict.replace('_', ' ')} (${pct(f.probability)});` +
        ` P(supports) ${pct(f.pSupports)}${f.candidate.truncated ? '; section cut for length' : ''}`,
    )
    lines.push(pointerLine(f.candidate))
  }
  lines.push(
    'Advisory: each finding is a probability for a person to read, and nothing here refuses a push. A' +
      '\npointer that cites a whole section for one of its subsections reads as "says nothing" and is noise.',
  )
  return lines.join('\n')
}

/** The offline fallback's report, which says it is the fallback and what the fallback cannot see. */
export function overlapReport(
  collected: Collected,
  judged: OverlapJudged,
  policy: SupportPolicy,
  why: string,
): string {
  const { candidates, skipped } = collected
  const lines: string[] = [`citations:support -- ${why}`]
  lines.push(
    `citations:support -- judged offline by word overlap instead: ${candidates.length} citations across` +
      ` ${collected.files} files; ${judged.findings.length} whose passage holds under` +
      ` ${policy.citationSupportOverlapMinShare} of the claim's weighted words ${skippedText(skipped)}\n`,
  )
  for (const f of judged.findings) {
    lines.push(`  ${f.candidate.where}`)
    lines.push(
      `    cites ${f.candidate.asWritten}: the passage holds ${pct(f.share)} of the claim's weighted words` +
        `${f.candidate.truncated ? '; section cut for length' : ''}`,
    )
    lines.push(pointerLine(f.candidate))
  }
  lines.push(
    'Advisory, and weaker than the TypeSafe judgment a key gives: a claim that contradicts its section' +
      '\nshares its words and passes, as does a pointer to the wrong section of a file that repeats the' +
      "\nclaim's words elsewhere, and a claim that paraphrases its section is printed. Nothing here refuses a push.",
  )
  return lines.join('\n')
}

export interface MainDeps {
  env?: Readonly<Record<string, string | undefined>>
  /** Makes the judge; the real SDK's by default, a stub in the selftest. */
  makeJudge?: (options: { env: Readonly<Record<string, string | undefined>>; model: string }) => ReturnType<typeof createJudge>
  out?: (text: string) => void
  err?: (text: string) => void
  /** The checkout whose policy records are read; this one by default, a fixture in the selftest. */
  policyRoot?: string
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
    policy = loadPolicy(deps.policyRoot)
  } catch (error) {
    err(`citations:support FAILED: ${(error as Error).message}`)
    return 1
  }
  // One run uses one threshold, so --min stands in for whichever the run's judge reads.
  if (minOverride !== null) {
    policy = { ...policy, citationSupportMinProbability: minOverride, citationSupportOverlapMinShare: minOverride }
  }

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

  let made
  try {
    made = await makeJudge({ env, model: policy.typesafeModel })
  } catch (error) {
    err(`citations:support FAILED: ${(error as Error).message}`)
    return 1
  }
  if ('skip' in made) {
    out(overlapReport(collected, judgeByOverlap(collected.candidates, policy), policy, made.skip))
    return 0
  }
  // The cap bounds what one run sends TypeSafe, so it is read only once a run would send it anything.
  if (collected.candidates.length > policy.citationSupportMaxCitations) {
    err(
      `citations:support FAILED: ${collected.candidates.length} citations would be judged, over` +
        ` \`citationSupportMaxCitations\` in ${POLICY_FILE}. Narrow the run with --file, or a person raises the key.`,
    )
    return 1
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
