/**
 * `mise run citations:support:selftest` -- does `citations:support` still judge what it should, skip
 * what it should, and fail when it should?
 *
 * WHAT IT HOLDS. `support.ts` is held to a fixture tree whose answer is known by construction, read
 * through `CITATIONS_ROOT`, with a STUBBED judge in place of TypeSafe, so it needs no key and no
 * network and runs in both tiers of the gate ladder. It asserts each outcome (a citation supported,
 * one contradicted, one that says nothing, one exactly at the threshold and one a hair under), what
 * is left out and why (the register, a history root, a registered quotation, a pointer that does not
 * resolve), what the judge is sent (three lines for the claim, the cited section whole), and the four
 * ways a run ends: findings, a missing key (which runs the offline word-overlap fallback), a failed
 * call and a bad policy. The fallback is held on its own too: the share it computes over handmade
 * weights, the words it leaves out, its threshold, and its report over the fixture tree. Each break
 * is one doctored policy or one stub, and asserts the REASON the run reports, so a guard deleted from
 * `support.ts` fails the case built for it and not some other.
 *
 * THE FAILURE THIS FILE EXISTS TO PREVENT. An advisory that swallows its own failures is worse than
 * none: a revoked key or a service that is down, treated as "no findings", prints a clean report over
 * a run that judged nothing, and nobody reads a clean report twice. So the cases that matter most
 * are the two that end a run without TypeSafe's judgment: a missing key must say why and run the
 * fallback, saying so, and a key that is present with a call that fails must FAIL, with the SDK's own
 * reason in the message, and never fall back. One case goes through the real SDK to a closed
 * loopback port, so the wiring in `tools/lib/typesafe.ts` is held to that too, not only the stub.
 *
 *   mise run citations:support:selftest
 *   node tools/citations/support.ts --selftest      the same
 *
 * Needs `git` on PATH, to build the fixture tree, and `npm ci`, for the one case that goes through the
 * SDK. No key, and no network beyond a refused connection to 127.0.0.1.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gitEnv } from '../lib/git-env.ts'
import { readPolicy } from '../lib/policy.ts'
import type { ChoiceAnswer, TypeSafeJudge } from '../lib/typesafe.ts'
import { createJudge } from '../lib/typesafe.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const SUPPORT = join(HERE, 'support.ts')
/** The checkout whose live policy records the fixtures start from. */
const REPO = join(HERE, '../..')
/** Where a fixture writes the policy, under the record that holds this command's keys. */
const RECORD = 'tools/policy/tool-settings.json'

let failures = 0
let checks = 0
const ok = (what: string, cond: boolean, detail = ''): void => {
  checks++
  if (cond) console.log(`  ok   ${what}`)
  else {
    failures++
    console.error(`  FAIL ${what}${detail ? ` -- ${detail}` : ''}`)
  }
}

console.log('citation support selftest\n')

// Inside a pre-push hook git exports GIT_DIR, which outranks `cwd`: without this the scanner would list
// THIS repository's files while claiming to read the fixture tree.
for (const key of Object.keys(process.env)) if (key.startsWith('GIT_')) delete process.env[key]

const TREE: Readonly<Record<string, string>> = {
  'docs/target.md': [
    '# Target',
    '',
    '## Alpha',
    'The alpha rule holds one thing.',
    '',
    '## Beta',
    'Beta says the opposite of what citers claim.',
    '',
    '### Beta child',
    'Child text sits under Beta.',
    '',
    '## Gamma',
    'Gamma is about something unrelated.',
    '',
    '## Delta',
    'Delta text.',
    '',
    '## Epsilon',
    'Epsilon text.',
    '',
  ].join('\n'),
  'docs/citers.md': [
    '# Citers',
    '',
    'Intro line before.',
    'The alpha rule is stated in `docs/target.md` § Alpha and nowhere else.',
    'Trailing line after.',
    '',
    'Beta is said to agree, per `docs/target.md` § Beta, as claimed.',
    '',
    'Gamma is claimed here: `docs/target.md` § Gamma, verbatim.',
    '',
    'Delta at the threshold: `docs/target.md` § Delta, at the line.',
    '',
    'Epsilon just under it: `docs/target.md` § Epsilon, by a hair.',
    '',
    'The alpha line itself: `docs/target.md:4`.',
    '',
    'A section that is gone: `docs/target.md` § Zeta, which is gone.',
    'A file that is gone: `docs/missing.md` § Alpha.',
    '',
  ].join('\n'),
  'docs/decisions.md': 'Register entry cites `docs/target.md` § Beta.\n',
  'history/old.md': 'Old text cites `docs/target.md` § Gamma.\n',
  'scripts/hooks/_shared.mjs': '// A dead pointer quoted on purpose: `generate-screen.md:15`.\n',
}

const dir = mkdtempSync(join(tmpdir(), 'citation-support-selftest-'))
const scratch = mkdtempSync(join(tmpdir(), 'citation-support-policy-'))
try {
  for (const [path, text] of Object.entries(TREE)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
  const env = gitEnv()
  execFileSync('git', ['init', '-q'], { cwd: dir, env, stdio: 'ignore' })
  execFileSync('git', ['add', '-A'], { cwd: dir, env, stdio: 'ignore' })

  // `scan.ts` fixes its root when it is first imported, so the tree is named first.
  process.env.CITATIONS_ROOT = dir
  const support = await import('./support.ts')

  const livePolicy = readPolicy(REPO)
  /** A checkout under the scratch folder whose one record holds the live policy, doctored; its root. */
  const policyFile = (name: string, edit: (p: Record<string, unknown>) => void): string => {
    const copy = JSON.parse(JSON.stringify(livePolicy)) as Record<string, unknown>
    // Fixed values, so the cases hold whatever the live policy is edited to.
    copy.citationSupportMinProbability = 0.5
    copy.citationSupportSkipPaths = ['docs/decisions.md']
    copy.citationSupportSectionMaxChars = 32000
    copy.citationSupportLineContext = 1
    copy.citationSupportMaxCitations = 100
    copy.citationSupportOverlapMinShare = 0.2
    edit(copy)
    const root = join(scratch, name)
    mkdirSync(dirname(join(root, RECORD)), { recursive: true })
    writeFileSync(join(root, RECORD), JSON.stringify(copy))
    return root
  }
  const CONTROL = policyFile('control', () => {})

  interface Asked {
    claim: string
    section: string
    instructions: string
    labels: string[]
  }
  const answer = (choice: string, s: number, c: number, n: number): ChoiceAnswer => ({
    choice,
    confidence: Math.max(s, c, n),
    probabilities: { supports: s, contradicts: c, says_nothing: n },
  })
  /** What the stub says about a passage, by what the passage holds; a passage no fixture has fails the run. */
  const decide = (section: string): ChoiceAnswer => {
    if (section.includes('alpha rule')) return answer('supports', 0.95, 0.02, 0.03)
    if (section.includes('Beta says')) return answer('contradicts', 0.05, 0.9, 0.05)
    if (section.includes('Gamma is about')) return answer('says_nothing', 0.05, 0.05, 0.9)
    if (section.includes('Delta text')) return answer('supports', 0.5, 0.2, 0.3)
    if (section.includes('Epsilon text')) return answer('says_nothing', 0.49, 0.01, 0.5)
    throw new Error(`the stub was asked about a passage no fixture holds: ${JSON.stringify(section)}`)
  }
  const stub = (asked: Asked[], overrideAnswer?: (section: string) => ChoiceAnswer): TypeSafeJudge => ({
    async choose(question) {
      const state = question.state as { claim: string; section: string }
      asked.push({
        claim: state.claim,
        section: state.section,
        instructions: question.instructions,
        labels: Object.keys(question.criteria),
      })
      return (overrideAnswer ?? decide)(state.section)
    },
  })

  interface Run {
    code: number
    out: string
    err: string
    asked: Asked[]
  }
  const run = async (
    argv: string[],
    options: {
      policyRoot?: string
      judge?: TypeSafeJudge | 'real'
      env?: Record<string, string | undefined>
    } = {},
  ): Promise<Run> => {
    const asked: Asked[] = []
    const out: string[] = []
    const err: string[] = []
    const judge = options.judge === undefined ? stub(asked) : options.judge
    const code = await support.supportMain(argv, {
      env: options.env ?? { TYPESAFE_API_KEY: 'selftest-not-a-key' },
      policyRoot: options.policyRoot ?? CONTROL,
      out: (t) => out.push(t),
      err: (t) => err.push(t),
      ...(judge === 'real' ? {} : { makeJudge: async () => ({ judge }) }),
    })
    return { code, out: out.join('\n'), err: err.join('\n'), asked }
  }

  /* ------------------------------------------------------------------------------------------- *
   * 1. The control: every outcome, and what is left out
   * ------------------------------------------------------------------------------------------- */

  const control = await run([])
  ok('control: the undoctored tree runs to a report, exit 0', control.code === 0, control.err || control.out)
  ok(
    'the six resolvable citations are judged, and no others',
    control.asked.length === 6,
    `${control.asked.length} judged`,
  )
  ok(
    'the report counts the judged and the not supported',
    /6 citations judged across 5 files; 3 not supported at P\(supports\) >= 0\.5/.test(control.out),
    control.out.split('\n')[0],
  )
  ok(
    'the report counts every skip by its reason: one history file, one register, one quotation, two unresolved',
    /skipped: 1 written in history files, 1 in the register, 1 registered as quotations, 2 that do not resolve/.test(
      control.out,
    ),
    control.out.split('\n')[0],
  )
  ok(
    'a citation the section contradicts is reported as contradicts, with both probabilities',
    /docs\/citers\.md:7\n\s+cites docs\/target\.md § Beta: contradicts \(0\.90\); P\(supports\) 0\.05/.test(control.out),
    control.out,
  )
  ok(
    'a citation the section says nothing about is reported as says nothing',
    /docs\/citers\.md:9\n\s+cites docs\/target\.md § Gamma: says nothing \(0\.90\); P\(supports\) 0\.05/.test(control.out),
    control.out,
  )
  ok(
    'a citation a hair under the threshold is reported, by the verdict that carried the rest',
    /docs\/citers\.md:13\n\s+cites docs\/target\.md § Epsilon: says nothing \(0\.50\); P\(supports\) 0\.49/.test(control.out),
    control.out,
  )
  ok(
    'a supported citation, the section one and the line one, is not reported',
    !control.out.includes('docs/citers.md:4') && !control.out.includes('docs/citers.md:15'),
    control.out,
  )
  ok(
    'a citation exactly AT the threshold is supported: the threshold is inclusive',
    !control.out.includes('docs/citers.md:11'),
    control.out,
  )
  ok(
    'the register, the history file and the quotation are never sent to the judge',
    !control.asked.some((a) => a.claim.includes('Register entry') || a.claim.includes('Old text') || a.claim.includes('generate-screen')),
  )
  ok(
    'a pointer that does not resolve is left to `citations:check`, not judged and not an error',
    !control.asked.some((a) => a.claim.includes('Zeta') || a.claim.includes('missing.md')),
  )

  /* ------------------------------------------------------------------------------------------- *
   * 2. What the judge is sent
   * ------------------------------------------------------------------------------------------- */

  const alpha = control.asked.find((a) => a.claim.includes('The alpha rule is stated in'))
  ok(
    'the claim is the line before the pointer, its line and the line after, and not the paragraph',
    alpha?.claim ===
      'Intro line before.\nThe alpha rule is stated in `docs/target.md` § Alpha and nowhere else.\nTrailing line after.',
    JSON.stringify(alpha?.claim),
  )
  ok(
    'the cited section starts at its heading',
    alpha?.section.startsWith('## Alpha\nThe alpha rule holds one thing.') === true,
    JSON.stringify(alpha?.section),
  )
  const beta = control.asked.find((a) => a.section.includes('Beta says'))
  ok(
    'a section runs on through its subsections and stops at the next heading of its own level',
    beta?.section.includes('### Beta child') === true &&
      beta.section.includes('Child text sits under Beta.') &&
      !beta.section.includes('Gamma is about'),
    JSON.stringify(beta?.section),
  )
  const line = control.asked.find((a) => a.claim.includes('The alpha line itself'))
  ok(
    'a line citation is judged against the cited line and the neighbours the policy names',
    line?.section === '## Alpha\nThe alpha rule holds one thing.\n',
    JSON.stringify(line?.section),
  )
  ok(
    'the judge is asked for exactly the three verdicts, and told which text is which',
    control.asked.every(
      (a) =>
        a.labels.join(',') === 'supports,contradicts,says_nothing' &&
        a.instructions.includes('`claim`') &&
        a.instructions.includes('`section`'),
    ),
    JSON.stringify(control.asked[0]?.labels),
  )

  const collected = support.collect({ ...support.loadPolicy(CONTROL), citationSupportSectionMaxChars: 20 })
  ok(
    'a passage over the policy limit is cut to it and marked, so the report can say so',
    collected.candidates.length === 6 &&
      collected.candidates.every((c) => c.passage.length <= 20 && c.truncated === true),
    collected.candidates.map((c) => `${c.passage.length}/${c.truncated}`).join(' '),
  )
  const windowed = support.collect({ ...support.loadPolicy(CONTROL), citationSupportClaimLineMaxChars: 30 })
  const alphaWindowed = windowed.candidates.find((c) => c.claim.includes('docs/target.md'))
  ok(
    'each claim line is cut to the policy limit, windowed round the pointer so the pointer is never cut',
    windowed.candidates.every((c) => c.claim.split('\n').every((l) => l.length <= 30)) &&
      alphaWindowed?.claim.split('\n').some((l) => l.includes('docs/target.md')) === true,
    windowed.candidates.map((c) => JSON.stringify(c.claim)).join(' '),
  )
  const only = await run(['--file', 'docs/citers.md'])
  ok('--file limits the run to the citations written in that file', only.asked.length === 6 && only.code === 0)
  const none = await run(['--file', 'docs/target.md'])
  ok('--file names a file with no citations: nothing is judged, and it is not an error', none.asked.length === 0 && none.code === 0, none.err)

  /* ------------------------------------------------------------------------------------------- *
   * 3. One break per copy: each must fail for the reason it was doctored for
   * ------------------------------------------------------------------------------------------- */

  const noSkip = await run([], { policyRoot: policyFile('no-skip', (p) => (p.citationSupportSkipPaths = [])) })
  ok(
    'with the register not listed in the policy, its citation IS judged: the skip is the policy key, and counted as none',
    noSkip.asked.length === 7 && /0 in the register/.test(noSkip.out) && /docs\/decisions\.md:1/.test(noSkip.out),
    `${noSkip.asked.length} judged; ${noSkip.out.split('\n')[0]}`,
  )
  const strict = await run(['--min', '0.6'])
  ok(
    '--min raises the threshold for one run: the citation at 0.50 is now reported',
    /docs\/citers\.md:11/.test(strict.out) && /4 not supported at P\(supports\) >= 0\.6/.test(strict.out),
    strict.out.split('\n')[0],
  )
  const badMin = await run(['--min', '2'])
  ok('--min outside 0..1 is refused with its reason, exit 2', badMin.code === 2 && /--min is a probability from 0 to 1/.test(badMin.err), badMin.err)
  const badFlag = await run(['--bogus'])
  ok('an unknown flag is refused, exit 2', badFlag.code === 2 && /unknown or incomplete flag "--bogus"/.test(badFlag.err), badFlag.err)

  const capped = await run([], { policyRoot: policyFile('cap', (p) => (p.citationSupportMaxCitations = 2)) })
  ok(
    'over the policy cap the run refuses before any call, and says how to narrow it',
    capped.code === 1 && capped.asked.length === 0 && /citationSupportMaxCitations/.test(capped.err) && /--file/.test(capped.err),
    capped.err,
  )
  const cappedOffline = await run([], { judge: 'real', env: {}, policyRoot: policyFile('cap-offline', (p) => (p.citationSupportMaxCitations = 2)) })
  ok(
    'with no key the cap is not read, since the offline fallback sends nothing: the run judges all six',
    cappedOffline.code === 0 && /word overlap instead: 6 citations/.test(cappedOffline.out) && cappedOffline.err === '',
    cappedOffline.out + cappedOffline.err,
  )
  const dry = await run(['--dry-run'], { judge: 'real', env: {} })
  ok(
    '--dry-run counts what would be judged with no key and no call',
    dry.code === 0 && /6 citations would be judged across 5 files/.test(dry.out) && /No call was made/.test(dry.out),
    dry.out + dry.err,
  )

  // The outcome a swallowing advisory gets wrong.
  for (const env of [{}, { TYPESAFE_API_KEY: '' }, { TYPESAFE_API_KEY: '   ' }]) {
    const offline = await run([], { judge: 'real', env })
    ok(
      `no key (${JSON.stringify(env)}): says why, judges by word overlap instead, exit 0`,
      offline.code === 0 &&
        /TYPESAFE_API_KEY is not set/.test(offline.out) &&
        /judged offline by word overlap instead: 6 citations across 5 files/.test(offline.out) &&
        offline.err === '',
      offline.out + offline.err,
    )
  }
  const asked: Asked[] = []
  const failing = await run([], {
    judge: {
      async choose() {
        asked.push({ claim: '', section: '', instructions: '', labels: [] })
        throw new Error('503 service unavailable (request req_selftest)')
      },
    },
  })
  ok(
    'a key is present and the call fails: the run FAILS, exit 1, with the SDK error in the message',
    failing.code === 1 &&
      /FAILED: a TypeSafe call failed, so no verdict is reported: 503 service unavailable \(request req_selftest\)/.test(failing.err),
    failing.err,
  )
  ok(
    'a failed call reports no findings, no clean summary, and never falls back to word overlap',
    !/citations judged/.test(failing.out) && failing.out === '' && !/word overlap/.test(failing.err),
    failing.out + failing.err,
  )
  const malformed = await run([], {
    judge: stub([], () => ({ choice: 'supports', confidence: 1, probabilities: { supports: 1, contradicts: 0 } })),
  })
  ok(
    'an answer with a label missing from its probabilities fails the run and names the label',
    malformed.code === 1 && /has no probability for "says_nothing"/.test(malformed.err),
    malformed.err,
  )

  const dropped = (key: string): ((p: Record<string, unknown>) => void) => (p) => {
    delete p[key]
  }
  const noKey = await run([], { policyRoot: policyFile('no-key', dropped('citationSupportConcurrency')) })
  ok(
    'a policy without a key this command reads fails, naming the key',
    noKey.code === 1 && /has no usable `citationSupportConcurrency`/.test(noKey.err),
    noKey.err,
  )
  const noMeans = await run([], { policyRoot: policyFile('no-means', dropped('citationSupportMinProbabilityMeans')) })
  ok(
    'a key with no Means sibling fails, naming the Means key',
    noMeans.code === 1 && /`citationSupportMinProbability` and no `citationSupportMinProbabilityMeans`/.test(noMeans.err),
    noMeans.err,
  )
  const noModel = await run([], { policyRoot: policyFile('no-model', dropped('typesafeModelMeans')) })
  ok('the pinned model key needs its Means too', noModel.code === 1 && /`typesafeModelMeans`/.test(noModel.err), noModel.err)
  const highMin = await run([], { policyRoot: policyFile('high-min', (p) => (p.citationSupportMinProbability = 1.5)) })
  ok('a threshold above 1 is refused as not a probability', highMin.code === 1 && /at most 1/.test(highMin.err), highMin.err)
  const noShare = await run([], { judge: 'real', env: {}, policyRoot: policyFile('no-share', dropped('citationSupportOverlapMinShare')) })
  ok(
    'a policy without the offline share fails, naming it, even with no key',
    noShare.code === 1 && /has no usable `citationSupportOverlapMinShare`/.test(noShare.err),
    noShare.err,
  )
  const highShare = await run([], { policyRoot: policyFile('high-share', (p) => (p.citationSupportOverlapMinShare = 1.5)) })
  ok(
    'an offline share above 1 is refused, with its reason',
    highShare.code === 1 && /`citationSupportOverlapMinShare` is a share of a claim's words, at most 1/.test(highShare.err),
    highShare.err,
  )
  const live = (() => {
    try {
      return support.loadPolicy(REPO)
    } catch (error) {
      return error as Error
    }
  })()
  ok('the live policy carries every key this command reads, each with its Means', !(live instanceof Error), String((live as Error).message))

  /* ------------------------------------------------------------------------------------------- *
   * 4. The section locator, held to `namesSection`'s own answer
   * ------------------------------------------------------------------------------------------- */

  const span = support.sectionSpan
  const doc = ['# Doc', '', '## 1. First step', 'one', '', '## 2. Second step', 'two', '### 2.1 Detail', 'deep', '## Setup', 'set', '']
  ok('a numbered citation finds its numbered heading', JSON.stringify(span('2', doc)) === JSON.stringify({ start: 5, end: 9 }), JSON.stringify(span('2', doc)))
  ok('a section named by prose running on is found by its longest leading name', span('Setup runs on into the sentence', doc)?.start === 9)
  ok('a name no section carries is not located', span('Nothing here', doc) === null)
  const table = ['| Setup thing | x |', '', '## Setup', 'real', '']
  ok('a heading wins over a line that merely starts with the name', span('Setup', table)?.start === 2, JSON.stringify(span('Setup', table)))
  const labels = ['STALE WHEN', 'a', 'b', '', 'CONFIDENCE', 'c']
  ok(
    'a bare uppercase label, as the prompt files use, is located and runs to the end of a file with no headings',
    JSON.stringify(span('CONFIDENCE', labels)) === JSON.stringify({ start: 4, end: 6 }) &&
      JSON.stringify(span('STALE WHEN', labels)) === JSON.stringify({ start: 0, end: 6 }),
    JSON.stringify([span('CONFIDENCE', labels), span('STALE WHEN', labels)]),
  )
  const scan = await import('./scan.ts')
  const names = ['Alpha', 'Beta child', 'Gamma', 'Zeta', 'Setup', '2']
  ok(
    'the locator finds a section exactly when `namesSection` says one is named',
    names.every((n) => (span(n, doc.concat(TREE['docs/target.md']!.split('\n'))) !== null) === scan.namesSection(n, doc.concat(TREE['docs/target.md']!.split('\n')))),
  )

  /* ------------------------------------------------------------------------------------------- *
   * 5. The offline fallback: its share, what it leaves out, its threshold and its report
   * ------------------------------------------------------------------------------------------- */

  const flat = (): number => 1
  const fox = { asWritten: 'a.md § Den', claim: 'The quick brown fox cites `a.md` § Den.', passage: '## Den\nA brown fox sleeps.' }
  const foxShare = support.overlapShare(fox, flat)
  ok(
    'the share is the claim words the passage holds over the claim words, the pointer\'s own words left out: 2 of 5',
    Math.abs(foxShare - 0.4) < 1e-12,
    String(foxShare),
  )
  const light = (w: string): number => (w === 'the' || w === 'cites' ? 0 : 1)
  ok(
    'a word of no weight counts for nothing either way: 2 of 3',
    Math.abs(support.overlapShare(fox, light) - 2 / 3) < 1e-12,
    String(support.overlapShare(fox, light)),
  )
  const headingOnly = { asWritten: 'a.md § 2', claim: 'The brown fox story, `a.md` § 2.', passage: '## 2. Brown fox\nNothing more.' }
  ok(
    'the words of the passage\'s heading are left out of the claim, so they never count as support',
    support.overlapShare(headingOnly, light) === 0,
    String(support.overlapShare(headingOnly, light)),
  )
  const lineCited = { asWritten: 'a.md:2', claim: 'Brown fox, `a.md:2`.', passage: 'Brown fox here.\nMore.' }
  ok(
    'a passage whose first line is no heading keeps its words: a line citation',
    support.overlapShare(lineCited, flat) === 1,
    String(support.overlapShare(lineCited, flat)),
  )
  ok(
    'a claim with nothing left once the pointer is out says nothing to compare, and scores 1',
    support.overlapShare({ asWritten: 'a.md § Den', claim: '`a.md` § Den', passage: '## Den\nA brown fox.' }, flat) === 1,
  )

  const asCandidate = (c: { asWritten: string; claim: string; passage: string }) => ({
    ...c,
    where: 'x.md:1',
    resolvedTo: 'a.md',
    truncated: false,
  })
  const atShare = support.judgeByOverlap([asCandidate(fox)], { ...support.loadPolicy(CONTROL), citationSupportOverlapMinShare: 0.4 }, flat)
  const overShare = support.judgeByOverlap([asCandidate(fox)], { ...support.loadPolicy(CONTROL), citationSupportOverlapMinShare: 0.41 }, flat)
  ok(
    'a share AT the threshold is silent and one under it is printed: the threshold is inclusive',
    atShare.findings.length === 0 && atShare.supported === 1 && overShare.findings.length === 1,
    `${atShare.findings.length} at, ${overShare.findings.length} over`,
  )

  const weigh = support.wordWeights()
  ok(
    'a word no scanned file holds weighs most, ln(N + 1) over the five fixture files',
    Math.abs(weigh('zzzfixtureword') - Math.log(6)) < 1e-12,
    String(weigh('zzzfixtureword')),
  )
  ok(
    'a word more files hold weighs less: `cites` is in two fixture files, `verbatim` in one',
    weigh('cites') < weigh('verbatim') && Math.abs(weigh('cites') - Math.log(6 / 3)) < 1e-12,
    `${weigh('cites')} ${weigh('verbatim')}`,
  )

  // Over the fixture tree, at the fixture's share of 0.2: the line citation's claim keeps `the`,
  // `line` and `itself`, and its passage holds `the`, so it shares ln 2 of ln 2 + 2 ln 3, about 0.24
  // (silent); Beta's claim shares no word with its section (printed at 0.00).
  const offline = await run([], { judge: 'real', env: {} })
  ok(
    'with no key the report says why, names the fallback and counts what it printed and skipped',
    offline.code === 0 &&
      /^citations:support -- TYPESAFE_API_KEY is not set/.test(offline.out) &&
      /judged offline by word overlap instead: 6 citations across 5 files; 5 whose passage holds under 0\.2 of the claim's weighted words \(skipped: 1 written in history files, 1 in the register, 1 registered as quotations, 2 that do not resolve/.test(
        offline.out,
      ),
    offline.out,
  )
  ok(
    'a claim sharing no word with its section is printed with its share',
    /docs\/citers\.md:7\n\s+cites docs\/target\.md § Beta: the passage holds 0\.00 of the claim's weighted words/.test(offline.out),
    offline.out,
  )
  ok(
    'a claim over the share is silent in the fallback\'s report',
    /judged offline by word overlap/.test(offline.out) && !offline.out.includes('docs/citers.md:15'),
    offline.out,
  )
  ok(
    'the fallback\'s report says what it cannot see, and that it refuses nothing',
    /contradicts its section/.test(offline.out) && /paraphrases its section/.test(offline.out) && /Nothing here refuses a push/.test(offline.out),
    offline.out,
  )
  const offlineMin = await run(['--min', '0.3'], { judge: 'real', env: {} })
  ok(
    '--min stands in for the offline share when there is no key: at 0.3 the line citation is printed too',
    /6 whose passage holds under 0\.3/.test(offlineMin.out) && offlineMin.out.includes('docs/citers.md:15'),
    offlineMin.out,
  )

  /* ------------------------------------------------------------------------------------------- *
   * 6. The client: a missing key skips, and a present key goes through the real SDK
   * ------------------------------------------------------------------------------------------- */

  const skip = await createJudge({ env: {}, model: 'jev-selftest' })
  ok('the shared client returns a skip with the reason when no key is set', 'skip' in skip && /TYPESAFE_API_KEY/.test(skip.skip), JSON.stringify(skip))
  const made = await createJudge({ env: { TYPESAFE_API_KEY: 'selftest-not-a-key' }, model: 'jev-selftest' })
  ok('the shared client returns a judge, and makes no call, when a key is set', 'judge' in made && typeof made.judge.choose === 'function')

  const child = (args: string[], extra: Record<string, string>) =>
    spawnSync(process.execPath, [SUPPORT, ...args], {
      cwd: dir,
      env: { ...gitEnv(), CITATIONS_ROOT: dir, ...extra },
      encoding: 'utf8',
      timeout: 60_000,
    })
  const wired = child([], { TYPESAFE_API_KEY: 'selftest-not-a-key', TYPESAFE_BASE_URL: 'http://127.0.0.1:1' })
  ok(
    'through the real SDK to a refused connection: the command fails, exit 1, and does not skip',
    wired.status === 1 && /citations:support FAILED: a TypeSafe call failed/.test(wired.stderr) && !/skipped/.test(wired.stdout),
    `exit ${wired.status}; ${wired.stderr.split('\n')[0]}`,
  )
  const unset = child([], { TYPESAFE_API_KEY: '' })
  ok(
    'as a process with no key: prints why, judges by word overlap, and exits 0',
    unset.status === 0 &&
      /TYPESAFE_API_KEY is not set/.test(unset.stdout) &&
      /judged offline by word overlap instead/.test(unset.stdout),
    `exit ${unset.status}; ${unset.stdout}${unset.stderr}`,
  )
  const forwarded = spawnSync(process.execPath, [SUPPORT, '--selftest', '--bogus'], { encoding: 'utf8', timeout: 60_000, env: gitEnv() })
  ok('`--selftest` with another flag is a usage error, and does not start a selftest', forwarded.status === 2, `exit ${forwarded.status}`)
} finally {
  rmSync(dir, { recursive: true, force: true })
  rmSync(scratch, { recursive: true, force: true })
}

console.log(`\n${checks} checks, ${failures} failed`)
process.exitCode = failures ? 1 : 0
