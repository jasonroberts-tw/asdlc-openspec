/**
 * Prose-case grade: for each prose decision case a prompt review answered, asks TypeSafe of each answer
 * whether it does what the case's `expected` says, and prints each case's counts of answers that do,
 * with the old text and the new, for the reviewer's session to list in the review's pull request
 * (`.claude/agents/continuous-prompt-improvement.md` § 4 and § 7). An operator command the reviewer's
 * session runs after `.claude/workflows/review-prompts.js`, never a gate, and its grades block nothing
 * (`docs/decisions/asdlc-openspec-1kie.md` § Decision).
 *
 * WHAT IT DOES. The input is the `prose` that workflow returned: each entry one prose case of a branch
 * the review would merge, with each answer's side, `old` or `new`, and its text, and a checksum over the
 * entry, which this script re-derives before it asks anything, so an entry the session did not copy
 * verbatim is refused rather than graded. Code asks one Noul per answer, through `tools/lib/typesafe.ts`,
 * over the case's situation and the answer's text: does the text do what `expected` says? An answer
 * meets the case when the probability of yes is `promptReviewProseMinProbability` or more. Code then
 * counts, for each text, the answers that meet it, and gives the case the outcome `review-prompts.js`
 * gives a choice case from its right answers (its header's THE STORED CASES): `held` when a majority of
 * each text's answers meet it, `flipped` when the old text's do and the new's do not, `fixed` when only
 * the new's do, `failing` when neither's do, and `unanswered` when an answer is missing or the workflow
 * could read no text. None of them keeps a branch out: the session lists them, and a person reads them.
 *
 * WITHOUT A KEY. When `TYPESAFE_API_KEY` is not set, no call is made: every case is `ungraded`, the
 * output's `skip` says why, and the run exits 0, so a review goes on without the grades. A key that is
 * set and a call that fails is a failure, exit 1, never a quiet run without the grader.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; the script came with asdlc-openspec-1kie. A prompt
 * whose output is prose, such as eli5, fails in a way that reads as success: a dropped caveat or a new
 * figure looks like a clearer explanation, and a forced choice that spells the caveat out cannot see it
 * dropped from what the prompt writes. Were this script wrong, it would let through an answer graded on
 * a copy the session changed, a probability under the threshold counted as meeting the case, a failed
 * call or a missing key reported as cases that held, and a case with a missing answer counted on the
 * answers it has.
 *
 * WHERE IT LOSES. A grader that misreads a text flips a case that held, and a person reads a false
 * alarm; one that misreads the other way hides the drop the counts were there to show. The threshold was
 * set with no measurement of TypeSafe on prose, since the session that wrote this script had no key; its
 * `Means` in `tools/policy/agent-workflows.json` says it is provisional.
 *
 * INVOCATION.
 *
 *   mise run prompt-review:grade --input <file>    the grades, printed as one line of JSON
 *   PROMPT_REVIEW_GRADE_ROOT=<dir> mise run prompt-review:grade --input <file>
 *                       the same, with the policy read from the records under `<dir>/tools/policy/`
 *
 * The input is a JSON file the session writes under `.scratch/`: `{ "prose": [...] }`, the workflow's
 * `prose` unchanged, each entry `{ id, prompt, group, situation, expected, of, why, answers: [{ side,
 * text }], fnv }` as that workflow's header gives it. The output, on stdout:
 *
 *   { model, threshold, skip, cases: [{ id, prompt, group, outcome, old, new, of, why, answers }] }
 *     skip     null, or why no call was made
 *     old/new  how many answers with that text meet the case, of `of`; null when the case is ungraded
 *     answers  [{ side, probability, meets }], one per answer in the input's order; both null for an
 *              answer that has no text or was not graded
 *
 * EXIT. 0 with the grades printed, the key set or not; 2 on a bad flag or a bad input, a checksum that
 * does not match among them, which the session corrects by copying the workflow's `prose` again; 1 on a
 * failure: a policy key missing or wrong, or a TypeSafe call that failed or answered with no
 * probability. On 1 the session names the failure in the description in place of the counts.
 *
 * NEEDS `TYPESAFE_API_KEY` and the network to grade, and `npm ci` for the SDK: one request per answer,
 * twice `promptReviewCaseRepetitions` for each case. Without the key it needs neither. Its selftest is
 * `mise run workflows:selftest`, which runs it in this process over a stubbed judge, with the review
 * workflow's own `prose` as its input, and once through the real SDK to a closed loopback port.
 */
import { readFileSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readPolicy } from '../tools/lib/policy.ts'
import { createJudge } from '../tools/lib/typesafe.ts'

const SELF = fileURLToPath(import.meta.url)
const REPO_ROOT = resolve(dirname(SELF), '..')
export const ROOT_ENV = 'PROMPT_REVIEW_GRADE_ROOT'
const NAME = 'prompt-review:grade'
/** The two texts an answer is given, as `review-prompts.js` labels them. */
const SIDES = ['old', 'new']
/** The outcome of every case when no call was made. */
export const UNGRADED = 'ungraded'

/** The question TypeSafe is asked of each answer; the case's `expected` follows it. */
export const QUESTION =
  'The state holds a situation that a session running a prompt met, and `text`, what the session wrote' +
  ' there. Does `text` do this:'

/** The policy keys this script reads, each with a `Means`, and what each must be. */
const KEYS = [
  ['typesafeModel', 'text'],
  ['promptReviewProseMinProbability', 'probability'],
]

/** The keys this script reads from the records under `root`, or a thrown error naming the one that is wrong. */
export function loadPolicy(root) {
  let raw
  try {
    raw = readPolicy(root)
  } catch (error) {
    throw new Error(`tools/policy/ under ${root} cannot be read: ${error.message}`)
  }
  for (const [key, kind] of KEYS) {
    const value = raw[key]
    if (kind === 'text' && !(typeof value === 'string' && value.trim() !== '')) throw new Error(`the policy has no \`${key}\` that is text`)
    if (kind === 'probability' && !(typeof value === 'number' && value > 0 && value <= 1)) {
      throw new Error(`the policy's \`${key}\` is ${JSON.stringify(value)}, where it must be a probability above 0 and at most 1`)
    }
    if (typeof raw[`${key}Means`] !== 'string') throw new Error(`the policy has \`${key}\` and no \`${key}Means\` saying what it decides`)
  }
  return Object.fromEntries(KEYS.map(([key]) => [key, raw[key]]))
}

/** FNV-1a over the UTF-16 code units of `s`, as `review-prompts.js` seals each entry of its `prose`. */
export function fnv(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

/** An entry's sealed fields, in the order `review-prompts.js` seals them, so a copy that reorders its keys still matches. */
const sealedFields = (e) => ({ id: e.id, prompt: e.prompt, group: e.group, situation: e.situation, expected: e.expected, of: e.of, why: e.why, answers: e.answers })

const isText = (v) => typeof v === 'string' && v.trim() !== ''

/** The entries of the input, or a thrown error whose `usage` is set, naming what is wrong. */
export function readInput(path) {
  const fail = (why) => Object.assign(new Error(`the input ${path} ${why}`), { usage: true })
  let data
  try {
    data = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw fail(`cannot be read as JSON: ${error.message}`)
  }
  if (!Array.isArray(data?.prose) || data.prose.length === 0) throw fail('holds no non-empty list `prose`')
  const ids = new Set()
  for (const [i, e] of data.prose.entries()) {
    if (!isText(e?.id) || ids.has(e.id)) throw fail(`has prose[${i}] with no id, or an id another case has`)
    ids.add(e.id)
    if (!isText(e.prompt) || !isText(e.group) || !isText(e.situation) || !isText(e.expected)) throw fail(`has the case ${e.id} with no prompt, group, situation or expected text`)
    if (!Number.isInteger(e.of) || e.of < 1) throw fail(`has the case ${e.id} whose \`of\` is not a whole number of at least 1`)
    if (e.why !== null && !isText(e.why)) throw fail(`has the case ${e.id} whose \`why\` is neither null nor text`)
    if (!Array.isArray(e.answers) || e.answers.some((a) => !SIDES.includes(a?.side) || (a.text !== null && typeof a.text !== 'string'))) {
      throw fail(`has the case ${e.id} with an answer that is not { side: old or new, text }`)
    }
    if (!Number.isInteger(e.fnv) || fnv(JSON.stringify(sealedFields(e))) !== e.fnv) {
      throw fail(`has the case ${e.id} whose checksum does not match its fields, so it is not the workflow's \`prose\` copied verbatim`)
    }
  }
  return data.prose
}

/** A case's outcome from the answers that meet it with each text, as `review-prompts.js` gives a choice case's from its right answers. */
export function outcomeOf(oldMet, newMet, of, complete) {
  if (!complete) return 'unanswered'
  const majority = Math.floor(of / 2) + 1
  return oldMet >= majority ? (newMet >= majority ? 'held' : 'flipped') : newMet >= majority ? 'fixed' : 'failing'
}

/** Whether a case has every answer: `of` with each text, each with text. */
const complete = (e) => SIDES.every((side) => e.answers.filter((a) => a.side === side && isText(a.text)).length === e.of)

/** Each case's grades: one request per answer with text, one after another, so the first call that fails stops the run. */
export async function gradeAll(entries, policy, judge) {
  const out = []
  for (const e of entries) {
    const answers = []
    for (const a of e.answers) {
      if (!judge || !isText(a.text)) {
        answers.push({ side: a.side, probability: null, meets: null })
        continue
      }
      const { meets: probability } = await judge.noul({ state: { situation: e.situation, text: a.text }, questions: { meets: `${QUESTION} ${e.expected}` } })
      answers.push({ side: a.side, probability, meets: probability >= policy.promptReviewProseMinProbability })
    }
    const met = (side) => (judge ? answers.filter((a) => a.side === side && a.meets === true).length : null)
    const outcome = judge ? outcomeOf(met('old'), met('new'), e.of, complete(e)) : UNGRADED
    out.push({ id: e.id, prompt: e.prompt, group: e.group, outcome, old: met('old'), new: met('new'), of: e.of, why: e.why, answers })
  }
  return out
}

/** The command, its dependencies handed in so the selftest runs it whole over a stub. */
export async function main(argv, deps = {}) {
  const env = deps.env ?? process.env
  const out = deps.out ?? ((t) => process.stdout.write(`${t}\n`))
  const err = deps.err ?? ((t) => process.stderr.write(`${t}\n`))
  const makeJudge = deps.makeJudge ?? createJudge
  const root = env[ROOT_ENV] ? resolve(env[ROOT_ENV]) : REPO_ROOT

  let input = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input' && argv[i + 1] && !argv[i + 1].startsWith('--')) input = argv[++i]
    else {
      err(`${NAME}: unknown or incomplete flag ${JSON.stringify(argv[i])}. See the header of scripts/grade-prose-cases.mjs.`)
      return 2
    }
  }
  if (!input) {
    err(`${NAME}: --input <file> is required: the review workflow's \`prose\`, as the header of scripts/grade-prose-cases.mjs gives it.`)
    return 2
  }
  let entries
  try {
    entries = readInput(input)
  } catch (error) {
    err(`${NAME}: ${error.message}. Correct it and run again.`)
    return 2
  }

  let policy
  let made
  try {
    policy = loadPolicy(root)
    made = await makeJudge({ env, model: policy.typesafeModel })
  } catch (error) {
    err(`${NAME} FAILED: ${error.message}`)
    return 1
  }
  const skip = 'skip' in made ? made.skip : null
  let graded
  try {
    graded = await gradeAll(entries, policy, skip ? null : made.judge)
  } catch (error) {
    err(`${NAME} FAILED: a TypeSafe call failed, so no case is graded: ${error.message}`)
    return 1
  }
  const tally = (outcome) => graded.filter((c) => c.outcome === outcome).length
  err(
    `${NAME} -- ${graded.length} prose case(s), blocking nothing: ${tally('held')} held, ${tally('flipped')} flipped, ${tally('fixed')} fixed,` +
      ` ${tally('failing')} failing, ${tally('unanswered')} unanswered, ${tally(UNGRADED)} ungraded${skip ? ` (${skip})` : ''}`,
  )
  out(JSON.stringify({ model: policy.typesafeModel, threshold: policy.promptReviewProseMinProbability, skip, cases: graded }))
  return 0
}

/** Whether this file is the one node was asked to run, through a symbolic link too, as macOS's temporary directory is. */
const isEntry = () => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(SELF)
  } catch {
    return false
  }
}

if (isEntry()) process.exitCode = await main(process.argv.slice(2))
