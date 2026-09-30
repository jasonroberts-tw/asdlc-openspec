/**
 * `npm run citations:support:selftest` -- does `citations:support` still judge what it should, skip
 * what it should, and fail when it should?
 *
 * WHAT IT HOLDS. `support.ts` is held to a fixture tree whose answer is known by construction, read
 * through `CITATIONS_ROOT`, with a STUBBED judge in place of TypeSafe, so it needs no key and no
 * network and runs in both tiers of the gate ladder. It asserts each outcome (a citation supported,
 * one contradicted, one that says nothing, one exactly at the threshold and one a hair under), what
 * is left out and why (the register, a history root, a registered quotation, a pointer that does not
 * resolve), what the judge is sent (three lines for the claim, the cited section whole), and the four
 * ways a run ends: findings, a missing key, a failed call and a bad policy. Each break is one doctored
 * policy or one stub, and asserts the REASON the run reports, so a guard deleted from `support.ts`
 * fails the case built for it and not some other.
 *
 * THE FAILURE THIS FILE EXISTS TO PREVENT. An advisory that swallows its own failures is worse than
 * none: a revoked key or a service that is down, treated as "no findings", prints a clean report over
 * a run that judged nothing, and nobody reads a clean report twice. So the cases that matter most
 * are the two that end a run without findings: a missing key must skip clean and say why, and a key
 * that is present with a call that fails must FAIL, with the SDK's own reason in the message. One
 * case goes through the real SDK to a closed loopback port, so the wiring in `tools/lib/typesafe.ts`
 * is held to that too, not only the stub.
 *
 *   npm run citations:support:selftest
 *   node tools/citations/support.ts --selftest      the same
 *
 * Needs `git` on PATH, to build the fixture tree, and `npm ci`, for the one case that goes through the
 * SDK. No key, and no network beyond a refused connection to 127.0.0.1.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gitEnv } from '../lib/git-env.ts'
import type { ChoiceAnswer, TypeSafeJudge } from '../lib/typesafe.ts'
import { createJudge } from '../lib/typesafe.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const SUPPORT = join(HERE, 'support.ts')
const POLICY = join(HERE, '../policy.json')

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

  const livePolicy = JSON.parse(readFileSync(POLICY, 'utf8')) as Record<string, unknown>
  const policyFile = (name: string, edit: (p: Record<string, unknown>) => void): string => {
    const copy = JSON.parse(JSON.stringify(livePolicy)) as Record<string, unknown>
    // Fixed values, so the cases hold whatever the live policy is edited to.
    copy.citationSupportMinProbability = 0.5
    copy.citationSupportSkipPaths = ['docs/decisions.md']
    copy.citationSupportSectionMaxChars = 32000
    copy.citationSupportLineContext = 1
    copy.citationSupportMaxCitations = 100
    edit(copy)
    const path = join(scratch, `${name}.json`)
    writeFileSync(path, JSON.stringify(copy))
    return path
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
      policyPath?: string
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
      policyPath: options.policyPath ?? CONTROL,
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
  const only = await run(['--file', 'docs/citers.md'])
  ok('--file limits the run to the citations written in that file', only.asked.length === 6 && only.code === 0)
  const none = await run(['--file', 'docs/target.md'])
  ok('--file names a file with no citations: nothing is judged, and it is not an error', none.asked.length === 0 && none.code === 0, none.err)

  /* ------------------------------------------------------------------------------------------- *
   * 3. One break per copy: each must fail for the reason it was doctored for
   * ------------------------------------------------------------------------------------------- */

  const noSkip = await run([], { policyPath: policyFile('no-skip', (p) => (p.citationSupportSkipPaths = [])) })
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

  const capped = await run([], { policyPath: policyFile('cap', (p) => (p.citationSupportMaxCitations = 2)) })
  ok(
    'over the policy cap the run refuses before any call, and says how to narrow it',
    capped.code === 1 && capped.asked.length === 0 && /citationSupportMaxCitations/.test(capped.err) && /--file/.test(capped.err),
    capped.err,
  )
  const dry = await run(['--dry-run'], { judge: 'real', env: {} })
  ok(
    '--dry-run counts what would be judged with no key and no call',
    dry.code === 0 && /6 citations would be judged across 5 files/.test(dry.out) && /No call was made/.test(dry.out),
    dry.out + dry.err,
  )

  // The outcome a swallowing advisory gets wrong.
  for (const env of [{}, { TYPESAFE_API_KEY: '' }, { TYPESAFE_API_KEY: '   ' }]) {
    const skipped = await run([], { judge: 'real', env })
    ok(
      `no key (${JSON.stringify(env)}): skips clean, exit 0, and says why`,
      skipped.code === 0 && /skipped: TYPESAFE_API_KEY is not set/.test(skipped.out) && skipped.err === '',
      skipped.out + skipped.err,
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
  ok('a failed call reports no findings and no clean summary', !/citations judged/.test(failing.out) && failing.out === '', failing.out)
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
  const noKey = await run([], { policyPath: policyFile('no-key', dropped('citationSupportConcurrency')) })
  ok(
    'a policy without a key this command reads fails, naming the key',
    noKey.code === 1 && /has no usable `citationSupportConcurrency`/.test(noKey.err),
    noKey.err,
  )
  const noMeans = await run([], { policyPath: policyFile('no-means', dropped('citationSupportMinProbabilityMeans')) })
  ok(
    'a key with no Means sibling fails, naming the Means key',
    noMeans.code === 1 && /`citationSupportMinProbability` and no `citationSupportMinProbabilityMeans`/.test(noMeans.err),
    noMeans.err,
  )
  const noModel = await run([], { policyPath: policyFile('no-model', dropped('typesafeModelMeans')) })
  ok('the pinned model key needs its Means too', noModel.code === 1 && /`typesafeModelMeans`/.test(noModel.err), noModel.err)
  const highMin = await run([], { policyPath: policyFile('high-min', (p) => (p.citationSupportMinProbability = 1.5)) })
  ok('a threshold above 1 is refused as not a probability', highMin.code === 1 && /at most 1/.test(highMin.err), highMin.err)
  const live = (() => {
    try {
      return support.loadPolicy(POLICY)
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
   * 5. The client: a missing key skips, and a present key goes through the real SDK
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
    'as a process with no key: prints why and exits 0',
    unset.status === 0 && /skipped: TYPESAFE_API_KEY is not set/.test(unset.stdout),
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
