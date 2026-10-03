export const meta = {
  name: 'author-prompt-cases',
  description: "Write candidate decision cases for the settled findings of a prompt review, one author per finding and lens, and validate the cases a session chose against the trunk's text of their prompts, storing only those every repetition answers as expected",
  whenToUse: 'Step 4 of the continuous-prompt-improvement agent, before review-prompts.js: once to write candidates, then once to validate the cases chosen from them; or any session that adds cases to the bank',
  phases: [
    { title: 'Read', detail: "one agent prints every prompt text the run needs, with a checksum this script re-derives" },
    { title: 'Author', detail: 'one author for each finding and lens, given that finding and that text alone' },
    { title: 'Validate', detail: "each chosen case answered as many times as the policy says, with the trunk's text of its prompt" },
  ],
}

/*
 * Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.
 *
 * WHAT IT DOES. Two jobs, either or both in one run. For each seed, a finding about a prompt whose
 * right answer a source settles, it runs one author per lens of `promptReviewCaseLenses`, each by the
 * agentType `prompt-case-author` and given that seed and that prompt's text alone, and returns their
 * candidate cases. For each case, one the session chose from the candidates or combined from them, it
 * runs `promptReviewCaseRepetitions` answers by the agentType `prompt-case-answerer`, each given the
 * case and the trunk's text of its prompt, and returns the case as validated only when every one of
 * them chose its expected option. A case is the format `.claude/prompt-cases/README.md` gives; the
 * session writes each validated case there, and `.claude/workflows/review-prompts.js` answers the
 * bank with the old text and the new of every prompt a review changes (`docs/decisions.md` § D-32).
 * It commits nothing. Its reader writes each text it needs under `.scratch/prompt-case-texts/` where
 * the session stands, and each author or answer reads its own file there: a model that copied a text
 * through its output would have to retype tens of thousands of characters exactly, and the tools
 * show an agent only part of a line that long (the session review of asdlc-openspec-7c1 measured
 * `CLAUDE.md`'s at 39,891 characters, and a Read that showed 21,247 of them). One such copy, of
 * 46,547 characters, did match, in the first run, on the design this replaced; one slip in it would
 * have failed the run.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet: this script lands with the bank it fills
 * (asdlc-openspec-7c1). Were it wrong, it would let through: a case stored that the trunk's text does
 * not answer as expected, which could never flip and so guards nothing, or which flips by noise and
 * keeps a sound edit out; a case answered by an agent that could run a command or search the
 * repository for its expected answer; an author shown another finding or an edit, so that the case is
 * shaped by the change it will judge; an author or an answer sent to a file other than the one its
 * command wrote; and a case whose options sit in one order, so that an answerer's taste for the first
 * option reads as the text.
 *
 * INVOCATION. The Workflow tool, with `scriptPath` set to this file in the session's worktree, and
 * `args`:
 *
 *   policy  the `promptReview*` keys of `tools/policy/agent-workflows.json`; this script reads
 *           `promptReviewCaseLenses` and `promptReviewCaseRepetitions`
 *   seeds   optional [{ key, prompt, source, evidence, settledBy }]: key `<prompt>#<name>`; source
 *           { run, point, commit }, the run id, the point of its analysis and the commit it read the
 *           prompt at, or { section }, the prompt's section the answer comes from; evidence what the
 *           run or the section shows; settledBy what settles the right answer
 *   cases   optional [case]: the cases to validate, each as the README gives it
 *   known   optional [string]: the ids already in the bank, which a case to validate may not take
 *
 * At least one seed or case. A seed from a section gets no lens the library below marks as needing a
 * run, since nothing was recorded.
 *
 * WHAT IT RETURNS. { stopped, why, candidates, validated, turnedAway, counts }. `stopped` is
 * `refused` when an argument did not hold, before any agent ran; `unread` when the reader returned
 * nothing, a copy its checksum refuses, or a path other than where its command writes; `done`
 * otherwise. Each candidate carries its seed's `key`,
 * its `lens`, the `case` with the seed's prompt, lens and source filled in, and the `problem` that
 * drops it, or null. An author gives its options as texts and its expected one by place, and the
 * case's id, `<name>-<lens>`, and its option ids, `a` to `d`, are assigned here: the first run, with
 * the authors left to spell them, dropped 23 of its 27 candidates for an id or an option id alone,
 * their content whole. The session gives each case it keeps an id of its own. A seed whose text git could not show gets no author, and its candidate carries
 * that problem. Each case validated or turned away carries `right`, the answers that chose its
 * expected option, `of`, the repetitions, and `answers`, each answer's option and why, a missing one
 * included. Every count is computed here.
 *
 * LABELS. `read`, `author <lens> <key>`, and `answer <i>/<n> <case id>`. scripts/workflows.selftest.mjs
 * routes its stubbed agents by them: change one here and change it there. `answerPrompt` is copied in
 * `.claude/workflows/review-prompts.js`, and the selftest holds the two to one answer prompt for one
 * case and file.
 *
 * NEEDS the Workflow tool, a checkout whose `origin/main` and commits hold each prompt, and the agents
 * `prompt-case-author` and `prompt-case-answerer`, whose only tools are Read and their structured
 * output: an agentType is resolved from the checkout the calling session started in
 * (`.claude/README.md`), so in a session started where those files are absent every candidate is
 * dropped and every case turned away, each because its agent returned nothing. Such an agent could
 * read a file other than the one it is sent to if it guessed its path, and nothing here records that
 * it did not. The script reads no file: the session passes the policy as `args.policy`.
 * `npm run workflows:selftest` runs this script against stubbed agents.
 */

const A = args || {}

const POLICY_KEYS = ['promptReviewCaseLenses', 'promptReviewCaseRepetitions']
const TRUNK = 'origin/main'
const AUTHOR = 'prompt-case-author'
const ANSWERER = 'prompt-case-answerer'
const README = '`.claude/prompt-cases/README.md`'

/** The lenses an author writes through, by the names `promptReviewCaseLenses` gives. */
const LENSES = {
  recorded: { needsRun: true, text: 'the situation as the run met it, with the option it took or nearly took.' },
  'near-miss': { needsRun: false, text: 'a neighbouring situation where the rule must not apply, such as one a broadened rule would wrongly catch; its answer is what the text gives there.' },
  pressure: { needsRun: false, text: 'the situation with a push toward the wrong option, such as a deadline, a brief or work already done.' },
}

/* ----------------------------------------------------------------------------- the schemas ----- */

const STRING = { type: 'string' }
/** An author gives its options as texts and its expected one by place: ids are assigned here, so no author's spelling of one can drop its case. */
const CANDIDATE_SCHEMA = {
  type: 'object',
  properties: { situation: STRING, options: { type: 'array', items: STRING }, expected: { type: 'integer' }, settledBy: STRING },
  required: ['situation', 'options', 'expected', 'settledBy'],
}
const OPTION_IDS = ['a', 'b', 'c', 'd']
const ANSWER_SCHEMA = { type: 'object', properties: { choice: { type: 'integer' }, why: STRING }, required: ['choice', 'why'] }
const READ_SCHEMA = { type: 'object', properties: { output: STRING }, required: ['output'] }

/* ------------------------------------------------------------------------ checking the input ----- */

const isText = (v) => typeof v === 'string' && v.trim() !== ''
const isWhole = (v) => Number.isInteger(v) && v >= 1
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const NAME = /^[a-z0-9][a-z0-9-]*$/
/** A path or ref the reader's command embeds in single quotes, so it may hold none. */
const SAFE = /^[A-Za-z0-9._/-]+$/
const COMMIT = /^[0-9a-f]{7,40}$/

/** Why `path` cannot name a prompt, or null. */
function pathProblem(path) {
  if (!isText(path) || !SAFE.test(path)) return 'must be a repository-relative path of letters, digits, `.`, `_`, `/` and `-`'
  if (path.startsWith('/') || path.split('/').some((s) => s === '' || s === '..')) return 'must be relative, with no empty or `..` segment'
  return null
}

/** Why a case's own fields break the README's format, or null. The lens and source are checked by `caseProblem`. */
function shapeProblem(c) {
  if (!isText(c.id) || !NAME.test(c.id)) return 'its id must be lower case letters, digits and dashes'
  if (!isText(c.situation)) return 'it has no situation'
  if (!Array.isArray(c.options) || c.options.length < 2 || c.options.length > 4) return 'it must have two to four options'
  const ids = c.options.map((o) => (isPlainObject(o) ? o.id : undefined))
  if (ids.some((id) => !/^[a-d]$/.test(id ?? '')) || new Set(ids).size !== ids.length) return 'its options need distinct ids from a to d'
  if (c.options.some((o) => !isText(o.text))) return 'an option has no text'
  if (!ids.includes(c.expected)) return `its expected answer ${JSON.stringify(c.expected)} is none of its options`
  if (!isText(c.settledBy)) return 'it says nothing of what settles its answer'
  return null
}

/** Why a source cannot be a case's, or null. */
function sourceProblem(s) {
  if (!isPlainObject(s)) return 'its source must be { run, point, commit } or { section }'
  if (s.section !== undefined) return isText(s.section) && Object.keys(s).length === 1 ? null : 'a source from a section names the section alone'
  if (!isText(s.run) || !/^.+@\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(s.run)) return 'its run must be a run id, `<issue>@<UTC second>`'
  if (!isWhole(s.point)) return 'its point must be the number of a point in the run\'s analysis'
  return isText(s.commit) && COMMIT.test(s.commit) ? null : 'its commit must be the hash the run read the prompt at'
}

/** Why a case cannot be validated, or null. */
function caseProblem(c) {
  if (!isPlainObject(c)) return 'it is not an object'
  const bad = pathProblem(c.prompt)
  if (bad) return `its prompt ${bad}`
  if (!A.policy.promptReviewCaseLenses.includes(c.lens)) return `its lens ${JSON.stringify(c.lens)} is none of \`promptReviewCaseLenses\``
  const source = sourceProblem(c.source)
  if (source) return source
  if (LENSES[c.lens].needsRun && !c.source.run) return `the ${c.lens} lens needs a run, and its source is a section`
  return shapeProblem(c)
}

/** Why the policy the session passed cannot drive a run, or null when it can. */
function policyProblem() {
  const p = A.policy
  if (!isPlainObject(p)) return "args.policy must be the `promptReview*` keys of tools/policy/agent-workflows.json, as the agent's § 2 prints them"
  const missing = POLICY_KEYS.filter((key) => p[key] === undefined || p[key] === null)
  if (missing.length) return `args.policy has no ${missing.map((k) => `\`${k}\``).join(', ')}: pass the keys tools/policy/agent-workflows.json holds`
  const lenses = p.promptReviewCaseLenses
  if (!Array.isArray(lenses) || !lenses.length || lenses.some((l) => !LENSES[l]) || new Set(lenses).size !== lenses.length) {
    return `args.policy \`promptReviewCaseLenses\` must be distinct lenses drawn from ${Object.keys(LENSES).join(', ')}`
  }
  return isWhole(p.promptReviewCaseRepetitions) ? null : 'args.policy `promptReviewCaseRepetitions` must be a whole number of at least 1'
}

/** Why the arguments cannot drive a run, or null when they can. Nothing has run yet. */
function argsProblem() {
  const badPolicy = policyProblem()
  if (badPolicy) return badPolicy
  for (const key of ['seeds', 'cases', 'known']) {
    if (A[key] !== undefined && !Array.isArray(A[key])) return `args.${key} must be a list`
  }
  const seeds = A.seeds || []
  const cases = A.cases || []
  if (!seeds.length && !cases.length) return 'args holds no seed to write a case for and no case to validate'
  const keys = new Set()
  for (const [i, s] of seeds.entries()) {
    const where = `args.seeds[${i}]`
    if (!isPlainObject(s)) return `${where} must be an object`
    const bad = pathProblem(s.prompt)
    if (bad) return `${where}.prompt ${bad}`
    if (!isText(s.key) || s.key !== `${s.prompt}#${s.key.split('#').pop()}` || !NAME.test(s.key.split('#').pop())) return `${where}.key must be \`<prompt>#<name>\`, the name in lower case letters, digits and dashes`
    if (keys.has(s.key)) return `the key ${s.key} is on two seeds`
    keys.add(s.key)
    const source = sourceProblem(s.source)
    if (source) return `seed ${s.key}: ${source}`
    if (!isText(s.evidence) || !isText(s.settledBy)) return `seed ${s.key} needs its evidence and what settles its answer`
  }
  const known = new Set(A.known || [])
  const ids = new Set()
  for (const [i, c] of cases.entries()) {
    const problem = caseProblem(c)
    if (problem) return `args.cases[${i}] is not a case as ${README} gives one: ${problem}`
    if (known.has(c.id) || ids.has(c.id)) return `the case id ${c.id} is already taken`
    ids.add(c.id)
  }
  return null
}

/* ------------------------------------------------------------------------------ the prompts ----- */

/** FNV-1a over the UTF-16 code units of `s`, as the reader's command computes it. */
function fnv(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

/**
 * The reader's command: git shows each `[ref, file]` into `<root>/<ref>/<file>`, root
 * `.scratch/prompt-case-texts` where the session stands, and it prints each path with a checksum.
 * No model copies a text: an author or an answer reads its file.
 */
function readCommand(want) {
  const js = [
    "const cp=require('child_process'),fs=require('fs'),p=require('path');const root=p.resolve('.scratch/prompt-case-texts');",
    `const want=${JSON.stringify(want).replace(/"/g, "'")};`,
    "const texts=want.map(([ref,file])=>{const path=p.join(root,ref,file);try{const t=cp.execFileSync('git',['show',ref+':'+file],{encoding:'utf8',maxBuffer:1e8,stdio:['ignore','pipe','ignore']});fs.mkdirSync(p.dirname(path),{recursive:true});fs.writeFileSync(path,t);return {ref,file,path,bytes:Buffer.byteLength(t)}}catch(e){return {ref,file,path:null,bytes:0}}});",
    'const s=JSON.stringify({root,texts});let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}',
    'console.log(JSON.stringify({root,texts,fnv:h}))',
  ].join('')
  return `node --no-warnings -e "${js}"`
}

const readPrompt = (want) => `Run this one command where you stand, and return in output the one line it prints, verbatim, even where it looks wrong. Change nothing else.\n\n${readCommand(want)}`

/** The path the reader wrote each text to, keyed `<ref>:<file>`, or the reason they cannot be used. */
function readTexts(reply) {
  let parsed
  try {
    parsed = JSON.parse(reply.output)
  } catch (error) {
    return { problem: `the reader's output is not the JSON its command prints: ${JSON.stringify(String(reply.output).slice(0, 200))}` }
  }
  if (!isPlainObject(parsed) || !isText(parsed.root) || !Array.isArray(parsed.texts) || !Number.isInteger(parsed.fnv)) return { problem: "the reader's output holds no root, paths and checksum" }
  if (fnv(JSON.stringify({ root: parsed.root, texts: parsed.texts })) !== parsed.fnv) return { problem: "the reader's copy does not match the checksum its command printed, so it was not copied verbatim" }
  if (!parsed.root.startsWith('/') || !parsed.root.endsWith('/.scratch/prompt-case-texts')) return { problem: `the reader's root ${JSON.stringify(parsed.root)} is not where its command writes` }
  const stray = parsed.texts.find((t) => t.path !== null && t.path !== `${parsed.root}/${t.ref}/${t.file}`)
  if (stray) return { problem: `the reader names ${JSON.stringify(stray.path)} for ${stray.file}, which is not where its command writes` }
  return { texts: new Map(parsed.texts.map((t) => [`${t.ref}:${t.file}`, t.path])) }
}

/** The case's options in the order the `r`th repetition shows them, so each takes each place in turn. */
const rotated = (options, r) => options.slice(r % options.length).concat(options.slice(0, r % options.length))

/** The prompt one answer to case `c` is given, with the version of its prompt under test at `path`. */
function answerPrompt(c, path, r) {
  return [
    `You are a session running \`${c.prompt}\`. Read its text, the version under test, from \`${path}\`, and no other file.`,
    '',
    '## The situation',
    '',
    c.situation,
    '',
    '## The options',
    '',
    ...rotated(c.options, r).map((o, i) => `${i + 1}. ${o.text}`),
  ].join('\n')
}

function authorPrompt(seed, lens, path, n) {
  const s = seed.source
  const where = s.run ? `as the run ${s.run} read it, at ${s.commit}` : `as the trunk has it; the finding is drawn from ${s.section}`
  return [
    `You are one of ${n} authors writing a decision case for one finding about \`${seed.prompt}\`. Write through the ${lens} lens: ${LENSES[lens].text}`,
    '',
    `## The finding ${seed.key}`,
    '',
    seed.evidence,
    '',
    `What settles its answer: ${seed.settledBy}`,
    '',
    `## \`${seed.prompt}\`, ${where}`,
    '',
    `Read it from \`${path}\`, and no other file.`,
  ].join('\n')
}

/* ---------------------------------------------------------------------------------- the run ----- */

const badArgs = argsProblem()
if (badArgs) {
  log(`Refused: ${badArgs}`)
  return { stopped: 'refused', why: badArgs, candidates: [], validated: [], turnedAway: [], counts: null }
}

const seeds = A.seeds || []
const cases = A.cases || []
const n = A.policy.promptReviewCaseRepetitions
const refOf = (s) => (s.run ? s.commit : TRUNK)
const pairs = [...seeds.map((s) => [refOf(s.source), s.prompt]), ...cases.map((c) => [TRUNK, c.prompt])]
const want = [...new Map(pairs.map((p) => [p.join(':'), p])).values()]
let authorsRun = 0

phase('Read')
const reply = await agent(readPrompt(want), { label: 'read', phase: 'Read', schema: READ_SCHEMA, effort: 'low' })
const read = reply ? readTexts(reply) : { problem: 'the reader returned nothing' }
if (read.problem) {
  log(`Stopped (unread): ${read.problem}`)
  return { stopped: 'unread', why: read.problem, candidates: [], validated: [], turnedAway: [], counts: null }
}
const pathOf = (ref, file) => read.texts.get(`${ref}:${file}`) ?? null

/** One seed's candidates: one author per lens it can take, each checked against the README's format. */
async function authorSeed(seed) {
  const lenses = A.policy.promptReviewCaseLenses.filter((l) => seed.source.run || !LENSES[l].needsRun)
  const path = pathOf(refOf(seed.source), seed.prompt)
  if (path === null) return [{ key: seed.key, lens: null, case: null, problem: `git could not show ${seed.prompt} at ${refOf(seed.source)}` }]
  authorsRun += lenses.length
  const written = await parallel(
    lenses.map((lens) => () => agent(authorPrompt(seed, lens, path, lenses.length), { label: `author ${lens} ${seed.key}`, phase: 'Author', schema: CANDIDATE_SCHEMA, agentType: AUTHOR })),
  )
  return lenses.map((lens, i) => {
    const w = written[i]
    if (!w) return { key: seed.key, lens, case: null, problem: 'the author returned nothing' }
    const c = {
      id: `${seed.key.split('#').pop()}-${lens}`,
      prompt: seed.prompt,
      lens,
      source: seed.source,
      situation: w.situation,
      options: w.options.map((text, j) => ({ id: OPTION_IDS[j] ?? String(j + 1), text })),
      expected: OPTION_IDS[w.expected - 1] ?? null,
      settledBy: w.settledBy,
    }
    const out = w.expected < 1 || w.expected > w.options.length ? `its expected answer, option ${w.expected}, is none of its ${w.options.length} options` : null
    return { key: seed.key, lens, case: c, problem: out ?? shapeProblem(c) }
  })
}

/** One case's answers against the trunk's text, and whether every one chose its expected option. */
async function validate(c) {
  const path = pathOf(TRUNK, c.prompt)
  if (path === null) return { case: c, right: 0, of: n, answers: [], problem: `git could not show ${c.prompt} at ${TRUNK}` }
  const replies = await parallel(
    Array.from({ length: n }, (_, r) => () => agent(answerPrompt(c, path, r), { label: `answer ${r + 1}/${n} ${c.id}`, phase: 'Validate', schema: ANSWER_SCHEMA, agentType: ANSWERER })),
  )
  const answers = replies.map((a, r) => {
    const chosen = a ? rotated(c.options, r)[a.choice - 1]?.id ?? null : null
    return { option: chosen, why: a ? a.why : 'the answerer returned nothing' }
  })
  return { case: c, right: answers.filter((a) => a.option === c.expected).length, of: n, answers, problem: null }
}

if (seeds.length) phase('Author')
const authored = await pipeline(seeds, authorSeed)
const candidates = authored.flatMap((list, i) => list || [{ key: seeds[i].key, lens: null, case: null, problem: 'its authors could not be run' }])
for (const c of candidates.filter((x) => x.problem)) log(`Dropped ${c.key}${c.lens ? ` (${c.lens})` : ''}: ${c.problem}`)

if (cases.length) phase('Validate')
const answered = await pipeline(cases, validate)
const results = answered.map((r, i) => r || { case: cases[i], right: 0, of: n, answers: [], problem: 'its answers could not be run' })
const validated = results.filter((r) => !r.problem && r.right === n)
const turnedAway = results.filter((r) => r.problem || r.right !== n)
for (const r of turnedAway) log(`Turned away ${r.case.id}: ${r.problem ?? `${r.right} of ${n} answers chose its expected option`}`)

const counts = {
  seeds: seeds.length,
  authors: authorsRun,
  candidates: candidates.filter((c) => !c.problem).length,
  dropped: candidates.filter((c) => c.problem).length,
  cases: cases.length,
  answers: results.reduce((sum, r) => sum + r.answers.length, 0),
  validated: validated.length,
  turnedAway: turnedAway.length,
}
const why = `${counts.authors} author(s) wrote ${counts.candidates} candidate(s) for ${counts.seeds} seed(s), ${counts.dropped} dropped; ${counts.validated} of ${counts.cases} case(s) validated by ${counts.answers} answer(s), ${counts.turnedAway} turned away`
log(`Stopped (done): ${why}`)
return { stopped: 'done', why, candidates, validated, turnedAway, counts }
