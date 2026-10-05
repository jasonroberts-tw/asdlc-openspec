export const meta = {
  name: 'build-change-task',
  description: "Build one task of a product change in its worktree, with an independent test-builder's tests beside it, review it through the lenses tools/policy/agent-workflows.json names for its kind, confirm each finding with skeptics sized to its severity, fix until a round confirms nothing major, then run the test-builder's tests and triage each failure",
  whenToUse: 'Step 3 of the change-build skill, once for each task of a planned change, from the change worktree',
  phases: [
    { title: 'Setup', detail: "read the sizes from tools/policy/, list the listeners on 127.0.0.1, and read the test-builder's inputs" },
    { title: 'Build', detail: "the app-builder sees each scenario's proof fail and builds the task, while the test-builder writes its tests" },
    { title: 'Review', detail: 'one reviewer for each lens the policy names for the kind' },
    { title: 'Merge', detail: 'findings of one kind on one file that describe one defect become one' },
    { title: 'Confirm', detail: 'skeptics, as many as the policy gives the severity, judge each defect and spec contradiction' },
    { title: 'Fix', detail: 'one agent fixes the confirmed defects and runs the proofs again' },
    { title: 'Architect', detail: "run the test-builder's tests against the build, route each failure, and act on the route" },
    { title: 'Sweep', detail: 'list the listeners on 127.0.0.1 again, and report any the run left behind' },
  ],
}

/*
 * Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.
 *
 * WHAT IT DOES. Builds one task of a product change in the change's worktree, then reviews what was
 * built: one reviewer for each lens `tools/policy/agent-workflows.json` names for the task's kind,
 * the findings merged, each defect and spec contradiction confirmed by skeptics, the confirmed defects
 * fixed, and another round only while a round confirms a major one. It commits nothing and writes
 * nothing to the tracker: the parent session does both
 * (`.claude/skills/change-build/SKILL.md` § 3. Build it, and prove it).
 *
 * THE FAILURE IT EXISTS TO PREVENT. On 2026-09-24 the calculator change (asdlc-openspec-zgh) built
 * every task through an untracked ancestor of this script, which three skeptics per finding and three
 * rounds made cost 22.4M tokens across its build runs, and which failed three ways. It halted on any
 * reviewer's "spec problem" unconfirmed: eleven stopped one pass of zgh.1, and seven of them were
 * scenarios no test covered or mutants the tests did not catch, each halt a round of questions to the
 * maintainer. A skeptic that could not verify a finding answered refuted, and so rejected a real gap,
 * Node's own 400 and 431 answers carrying no Content-Security-Policy, which change-verify upheld. And a
 * reviewer's mutant copy of apps/calculator/serve.js was left listening on 127.0.0.1:8080 for 74
 * minutes. `bd show asdlc-openspec-d6b` gives each figure and the file it was measured from.
 *
 * Since asdlc-openspec-fye (`docs/decisions.md` § D-14) it also stops, as not-red and before any
 * review, a task of a kind `buildRedFirstKinds` lists when a scenario the parent named has neither a
 * red record nor an already-green report. No incident yet: were that check wrong, a test first run
 * after the code that passes it, which may pass without that code, would reach review, where only the
 * honesty lens's mutants can catch it, and only for the mutations a reviewer thinks of.
 *
 * Since asdlc-openspec-j09.11 (`docs/decisions.md` § D-13, items 12, 16 and 17) it runs the strategy's
 * three build roles (`docs/test-strategy.md` § Build Agents). The builder and the fixers are the
 * app-builder. For a kind `buildIndependentKinds` lists, a test-builder that sees none of the
 * app-builder's work writes the contract, fitness and E2E tests, and the architect's triage runs them
 * against the build and routes each failure. No incident yet: were this wrong, the Binding Surface
 * would be verified only by the agent that implements it, or a fixer would be handed a test's source
 * and fit the code to that test rather than to the spec. Two gaps were found in review before any
 * such test existed, on 2026-09-29. The review of pull request #72 at 98754a8 found that the package
 * script meant for Build ran every file under the test-builder's directory, E2E tests included,
 * since a file's `runAt` never reached the disk; its stage is now its directory. The review at
 * b5b6e73 found that the architect ran only the files this task's test-builder returned, so an
 * earlier task's contract test was never rerun after a later task changed the code it covers; every
 * committed build-stage file now runs beside this task's.
 *
 * INVOCATION. The Workflow tool, with `scriptPath` set to this file inside the change's worktree, so
 * that the script and the policy it reads come from one commit, and `args`:
 *
 *   task      { id, title, body }: the tracker task, as `bd show <id>` prints it
 *   scenarios [string]: each scenario and NFR the task names, as it names them (`[<ID>] <title>`), and
 *             [] when it names none. Required, so that no run skips the red run by omission
 *   change    the change's name; its delta specs and design are under openspec/changes/<change>/
 *   worktree  the worktree's absolute path, as `git rev-parse --show-toplevel` prints it there
 *   branch    the worktree's branch
 *   kind      the `assetLabels` key for what the task mainly changes; `buildReviewLenses` maps it to lenses
 *   app       the directory under apps/ whose Binding Surface the task builds against. Required for a
 *             kind in `buildIndependentKinds`, and optional otherwise
 *   lenses    optional { <lens key>: focus }: this task's own probes, mutations or cases for a lens the
 *             kind runs. The policy picks the lenses; this adds to them and never adds one
 *   guide     optional: what the builder reads first, or builds in what order
 *   settled   optional [string]: decided already, by the parent or the user; no agent raises it again
 *
 * WHAT IT RETURNS. { task, stopped, why, build, lastFix, fixUnreviewed, rounds, confirmed, unverified,
 * refuted, unplanned, followUps, independent, listeners }. Every count in it is computed here, never by
 * an agent. `rounds` has one entry per round, round 0 being the build's own findings. `build` carries
 * the builder's `red` records and `alreadyGreen` reports beside its work. `independent` is null for a
 * kind the test-builder does not run for, and otherwise { app, dir, skipped, complete, files, e2e,
 * rounds, untriaged }: `files` the test-builder's files as it last returned them, whole, for the parent
 * to write and commit with the task, since the runner removes them; `e2e` the paths written and not
 * run here; `rounds` one entry per run with each file's result and each failure's route. `stopped` is
 * one of:
 *
 *   refused             an argument or the policy did not hold, or Setup's copy of the inputs does not
 *                       match its checksum; `why` names it. Only Setup ran
 *   agent-died          the builder, the test-builder, a fixer, the runner or every reviewer of a round
 *                       returned nothing
 *   not-red             the task's kind is in `buildRedFirstKinds`, and for a scenario `why` names the
 *                       builder returned neither a red record nor an already-green report; no review
 *                       followed it
 *   proof-failing       a proof the builder or a fixer ran did not pass; no review followed it
 *   spec-contradiction  a spec contradiction was confirmed; nothing after it was fixed
 *   not-independent     the app-builder changed a file under `independentTestDir`, the test-builder
 *                       returned a file outside it, or the runner left one of its files in the worktree
 *   re-design           a failure the architect routed to a re-design pass was confirmed by skeptics;
 *                       nothing after it was fixed
 *   architect-failing   a test-builder's test still fails and nothing is left to act on it: at the last
 *                       run `buildArchitectMaxRounds` allows, or at an earlier one whose every failure
 *                       is untriaged (its architect returned nothing, or an answer code could not
 *                       hold) or a re-design its skeptics refuted or left unverified, which `why`
 *                       names; `independent.rounds` gives each failure's route
 *   nothing-major       a round confirmed no defect at a `buildReviewMajorSeverities` severity, and
 *                       every test-builder test run here passed
 *   round-limit         the last round `buildReviewMaxRounds` allows confirmed a major defect, its fix
 *                       unreviewed, and every test-builder test run here passed
 *
 * THE MECHANICS, whose one home is this header. The kinds of finding are defined in KIND_RULE below,
 * which every agent reads, but for one case, a scenario a known-wrong implementation satisfies, whose
 * home is `.claude/skills/change-build/SKILL.md` § 5. What the build turns up. That section also says
 * what the parent does with each kind, and KIND_RULE cites it for the one case and has every agent
 * read it first.
 *
 *   Merge. Findings of one kind naming one file go, where there are two or more, to one agent that
 *   groups those describing one defect. A group becomes one finding, with the highest severity among
 *   them, every lens that raised it, and each lens's evidence. A grouping that does not place each
 *   finding exactly once, or mixes files or kinds, is discarded, logged, and the findings kept apart.
 *
 *   Confirmation. A defect goes to `buildReviewSkeptics[severity]` skeptics, and a spec contradiction
 *   always to the `blocker` count, since a confirmed one halts the run. Each answers upheld, refuted or
 *   unverified. With n sent, floor(n/2)+1 upheld confirms it and as many refuted refutes it; anything
 *   else, a skeptic that returns nothing included, leaves it unverified, and it goes back to the parent
 *   as such, never as refuted. A refuted finding that that many skeptics also mark followUp becomes a
 *   coverage gap to file. Coverage gaps, out-of-scope and unplanned findings are never confirmed: the
 *   parent searches the tracker before filing one, and whoever works it checks its premise first.
 *
 *   Red first. Before it changes the code under test, the builder runs the task's proof for each
 *   scenario in `args.scenarios`, sees it fail on the scenario's THEN, and returns a red record for it:
 *   the scenario, the command, and the failure it printed. It reports a scenario whose proof passes
 *   first, because the code already has its behaviour, as already green, with the command and its
 *   evidence. Each already-green report goes to the parent among `unverified`, never as passed, for
 *   the parent to judge, and round 0 counts it in its `unverified`, so the rounds' counts sum to the
 *   list. For a kind in `buildRedFirstKinds`, a scenario with neither stops the run as
 *   not-red; a scenario is matched by its text, trimmed, so a record for another scenario covers
 *   nothing. A task of another kind is asked for the same records and not held to them. The lenses
 *   that set `red` read the red records, and the spec lens holds each failure to its scenario's THEN.
 *
 *   Stop order, after the build: a confirmed spec contradiction among the builder's findings stops the
 *   run, since a spec revision rebuilds the task anyway; then not-red, whose missing records the parent
 *   takes against the build it keeps (`.claude/skills/change-build/SKILL.md` § 3. Build it, and prove
 *   it); then a failing proof.
 *   After each round's confirmation: a confirmed spec contradiction stops the run; else the confirmed
 *   defects are fixed and the proofs run again; then a round that confirmed no defect at a major
 *   severity ends the review, and so does the last round allowed; else the next round reviews the fix.
 *   A test-builder's test then runs, as below, and the review's end is the run's stop only once every
 *   one run here passes. The whole order: spec-contradiction, not-red and proof-failing after the
 *   build; then the test-builder's death and not-independent; then the review rounds; then the
 *   architect's runs.
 *
 *   Independence (test-builder). For a kind in `buildIndependentKinds`, Setup's agent runs one command
 *   that reads every file under the paths `independentInputs` gives, with `{change}` and `{app}` filled
 *   in, a script there as its header alone (the home of the rule it states), and the epic's children
 *   from the tracker, their notes left out; it prints them with a checksum this script re-derives, so
 *   a copy that is not verbatim is refused. Any path outside those given is dropped here and logged.
 *   A `cite` agent then prints the hash of each artifact the tests may cite (the header of
 *   scripts/test-trace.mjs): each ID in `args.scenarios`, the Binding Surface, and each operation of
 *   the app's contracts. The test-builder runs beside the builder, by `agentType`, as the agent
 *   `.claude/agents/test-builder.md` defines: its only tool is its structured output, so nothing on
 *   disk or in git reaches it, and its prompt is built from Setup's inputs alone, before the builder
 *   returns, and never from `settled` or `guide`. A spike on 2026-09-28 held that premise: one agent of
 *   this agentType, run through the Workflow tool from a session started in a worktree holding the
 *   file, listed StructuredOutput as its only tool and found no Read, Bash, ToolSearch or MCP tool
 *   (asdlc-openspec-j09.11's pull request gives the script and its answer). The same spike found that
 *   an `agentType` is resolved from the agents of the checkout the calling session started in: a
 *   session started where that file is absent gets no test-builder, and the run stops agent-died.
 *   It returns its files as data. Every path must be
 *   `independentTestDir` for the app, then its stage, then a layer `independentLayers` lists, then
 *   `<name>.test.js`, or the run stops not-independent; and so does a builder or fixer whose
 *   `filesChanged` enters `independentTestDir` for any app. The stage is `build` for a file at a
 *   layer `architectRunLayers` lists that declares `runAt` build, and `verify` for every other, so
 *   the package script that runs the build stage at push and in CI runs no E2E test or
 *   Verify-deferred fitness function (`docs/test-strategy.md` § Build exit criteria). A task naming
 *   no ID gets no test-builder to write its own tests, and says so; one still rewrites an earlier file
 *   the architect routes `rewrite-test` (Running, below). Its code can still break what an earlier task's tests
 *   cover, so the architect still runs every build-stage file an earlier task committed, below, and
 *   triages each failure as for any task: a regression surfaces at the task that caused it, not
 *   first among the gates of `.claude/skills/change-build/SKILL.md` § 6. Repeat, then hand over.
 *   With no earlier file either, nothing runs, and the review's end is the run's stop.
 *
 *   Running (architect). After the review, a runner agent in the worktree runs every build-stage file:
 *   this task's, which it writes, and every one an earlier task committed under the app's
 *   `independentTestDir`, which Setup read among the inputs and which it runs where it stands. It runs
 *   `scripts/run-tests.mjs` on each as this script builds the command, runs a failing one once more
 *   (D-13, item 12), removes every file it wrote and prints `git status --porcelain` of the directory.
 *   Here, a first pass is a pass, a failure then a pass is flaky and counts as failing, and two
 *   failures fail. A file left behind, or a committed one changed or removed, stops the run as
 *   not-independent before any fixer runs. A file of this task's whose tests name an ID the task does
 *   not is routed to rewrite-test here, and runs at no architect. An earlier file names earlier tasks'
 *   IDs and is exempt by its path, so its rewrite is exempt too, and the runner writes the rewrite
 *   before it runs it. An earlier file that fails is triaged as this task's are, and its rewrite
 *   comes back in `independent.files` for the parent to write; one left unchanged never does. Every
 *   earlier file runs, not only those whose scope the task touches: the strategy reruns the tests of
 *   the elements a task changes, and no rule here could tell which those are without reading the code,
 *   so a rule that guessed would pass a test it skipped. The cost is one run of each build-stage file
 *   per architect round, and it grows with the change's tests.
 *
 *   Triage (architect). One architect agent per failing file sees the test, how it failed, the design,
 *   the Binding Surface and the text its IDs reference, and returns one route of
 *   `docs/test-strategy.md` § Architect triage loop: rewrite-test, fix-app or re-design, with the ID
 *   violated, the expected behaviour copied from the delta specs or the design, the observed
 *   behaviour, the lower layer where the defect is observable, and, for rewrite-test, the line of the
 *   test or the sentence of the inputs that shows it wrong. An answer whose ID the test does not name,
 *   whose expected text is not found verbatim in the change's delta specs or design, or whose
 *   rewrite-test quote is not found verbatim in the test or the inputs, is untriaged and acted on by
 *   no one. A re-design goes to `buildReviewSkeptics.blocker` skeptics, and a majority upheld stops
 *   the run as re-design. The fix-app routes go to one fixer, whose feedback this script builds from
 *   the four fields alone (`docs/test-strategy.md` § Independence): the ID; the expected text; the
 *   observed text with every line dropped that holds a stack frame, an assertion, the test's file
 *   name, or a line or string of its source of two words or more, compared with whitespace removed,
 *   unless the inputs outside the test-builder's directory state that line or string too; and the
 *   platform and Node version the runner reported, each only in a form code accepts, else `unknown`.
 *   A lower layer adds the ask for the lowest-layer test that reproduces it. The rewrite-test routes
 *   go back to the test-builder as the ID and that quote, built here, and never the architect's own
 *   words, which may name the app-builder's code. Each run is a round, at most
 *   `buildArchitectMaxRounds`; the last one's failures are triaged and not acted on, and stop the run
 *   as architect-failing.
 *
 *   Sweep. Setup lists the listeners on 127.0.0.1. Every exit after Setup lists them again, and each one
 *   that was not there before is `listeners.leftBehind`, for the parent to stop.
 *
 * LABELS. Agents are labelled `setup`, `cite`, `build`, `test-builder`, `review <lens> r<n>`,
 * `merge r<n>`, `skeptic <i>/<n> r<round>: <title>`, `fix r<n>`, `run a<n>`, `architect a<n>: <path>`,
 * `redesign <i>/<n> a<n>: <path>`, `fix a<n>`, `test-builder a<n>` and `sweep`.
 * scripts/workflows.selftest.mjs routes its stubbed agents by them: change one here and change it there.
 *
 * NEEDS a change worktree with node, git and bd, `lsof` (macOS) or `ss` (Linux) for the listeners, the
 * Workflow tool, and a calling session started where `.claude/agents/test-builder.md` exists. Nothing
 * here reads a file: Setup's agent reads the policy and the inputs. `mise run workflows:selftest` runs
 * this script against stubbed agents.
 */

const A = args || {}

const SEVERITIES = ['blocker', 'major', 'minor']
const KINDS = ['defect', 'spec-contradiction', 'coverage-gap', 'out-of-scope', 'unplanned']
const BUILDER_KINDS = ['spec-contradiction', 'coverage-gap', 'out-of-scope', 'unplanned']
const CONFIRMED_KINDS = ['defect', 'spec-contradiction']
const POLICY_KEYS = [
  'buildReviewLenses', 'buildReviewSkeptics', 'buildReviewMaxRounds', 'buildReviewMajorSeverities', 'buildRedFirstKinds', 'assetLabels',
  'buildIndependentKinds', 'buildArchitectMaxRounds', 'independentInputs', 'independentTestDir', 'independentLayers', 'architectRunLayers', 'testTraceLayers',
]
const ROUTES = '`.claude/skills/change-build/SKILL.md` § 5. What the build turns up'
const TRIAGE = ['rewrite-test', 'fix-app', 're-design']
const TEST_BUILDER = 'test-builder'
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
/** An ID token at the head of a scenario as `args.scenarios` names it. */
const ID_TOKEN = /^\s*\[([^\]\s]+)\]/
/** The IDs a test's name references (the header of scripts/test-trace.mjs), from each call opening a line. */
const TEST_NAME = /^\s*(?:test|it)(?:\.\w+)?\(\s*['"`]\[([^\]]+)\]/gm

/* ------------------------------------------------------------------------------ the lenses ----- */

const LENSES = {
  spec: {
    label: 'the tests prove the scenarios',
    red: true,
    prompt: [
      'For each scenario the task names, find the test the task names as its proof.',
      "The test must drive exactly the scenario's WHEN and assert every THEN and AND, including a value shown part-way through a sequence, with each expected value written out rather than computed by the code under test.",
      'Where the design or the task sets a rule for test names, hold each name to it character for character.',
      "Hold each red record below to its scenario: its failure must be the scenario's THEN failing, not an error before it, such as an import error, a syntax error or a missing file.",
      "Run the task's proof and read what it reports.",
      'Report a scenario with no test or with a test that under-asserts it, and a test named like a scenario that is not one.',
    ].join(' '),
  },
  behaviour: {
    label: 'the code does what the specs say',
    prompt: [
      'Probe the real thing this task changes: the module, the page, the server, the command or the gate.',
      'Before you run each probe, write down the result the delta specs, the design or the task say it must give, derived from their text and never from the code.',
      'Cover the cases the text names, and the inputs just either side of every limit it states.',
      'Report each divergence with the probe, the result the text requires, and the result you got.',
    ].join(' '),
  },
  honesty: {
    label: 'the proofs catch a wrong implementation',
    prompt: [
      "Try to make the task's proof pass while the code is wrong. Never edit the task's files: other reviewers are reading them.",
      'Copy the code under test and the test or selftest that proves it into .scratch/mutants-<n>/, with its relative paths still working, make one mutation per copy, and run the proof against the copy.',
      'Mutate what the scenarios state: each condition, each boundary, each branch, each value written out. For a gate, break the gate and run its selftest: a case that still holds does not assert its reason.',
      'Give each surviving mutant its kind by the rule below. A mutation that cannot change anything observable is equivalent, and not a finding.',
      'Also look for skipped, todo or only tests, assertions that can pass over an empty list, and helpers that swallow exceptions.',
      'Look too for a test whose assertions depend on the environment, and hold it to the rule for such a test in ' + ROUTES + '.',
    ].join(' '),
  },
  wiring: {
    label: 'the repository around the change',
    prompt: [
      "Hold the files around the change to what the task's acceptance criteria ask of them.",
      'A task it adds is wired as the add-task skill says, with a cost note measured on this host.',
      "A file it adds has its row in its directory's README.md. A script, emitter or hook it adds opens with the header CLAUDE.md asks of one.",
      'Every comment and README sentence it touches is true of the code.',
      'Run mise run check:jobs and mise run citations:check, and report what they print.',
    ].join(' '),
  },
  contract: {
    label: 'the text says what the task asks',
    prompt: [
      "Read every line the task adds or changes, and hold it to the task's acceptance criteria, the delta specs and the design: everything they ask for is there, and nothing they do not ask for is.",
      'Hold it also to the rules for its kind of file: a register entry to how docs/decisions.md says an entry is written and changed; a README to what CLAUDE.md asks of a directory README; a prompt to what CLAUDE.md asks of a skill or an agent; a template to the placeholders its renderer fills.',
      'Run the gate that holds the file, where one does (mise run check:register for the register, mise run check:prompts for a prompt), and report what it prints.',
    ].join(' '),
  },
  record: {
    label: 'every claim is true of the repository',
    prompt: [
      'Re-derive every claim the changed text makes about the repository: each file, script, path, command, figure and date.',
      "A file-level record, such as a register entry's What changed or a README table, must match git diff --stat origin/main...HEAD and git status --short, with nothing missing and nothing extra.",
      'Each figure must come with the command that re-derives it, and equal what that command prints now.',
      'Run mise run citations:check and mise run counts:check, and report what they print.',
    ].join(' '),
  },
}

/* ------------------------------------------------------------------------------- the rules ----- */

const KIND_RULE = [
  'Read ' + ROUTES + ' before you give any finding a kind: one case below is decided there, not here.',
  'Give every finding one kind. First quote, in `against`, the sentence of the delta specs, the design or the task that says what should happen.',
  '- No sentence to quote: coverage-gap, since nothing states it, so nothing proves it. A mutant you can call wrong only by your own judgement is one.',
  '- The code as it stands breaks the sentence: defect.',
  "- Only a known-wrong implementation, a mutant, breaks it: when no scenario is about that sentence, coverage-gap; when a faithful test of the scenario would fail the mutant but the task's own test passes it, defect, because the task's proof does not prove its scenario; " +
    'otherwise, the kind ' + ROUTES + ' gives it.',
  '- A behaviour the delta specs leave undecided so that the build had to choose, or anything § 5 calls a spec that is wrong: spec-contradiction.',
  '- A real defect in a file or a task this task does not own: out-of-scope. Work this change needs that no task of its plan covers: unplanned.',
  'Grade a finding blocker or major when it breaks a scenario or an acceptance criterion, and minor when it is real but small. Report nothing that is a matter of taste.',
  'Where each kind goes is ' + ROUTES + '; the parent session routes it, not you.',
].join('\n')

function rules() {
  return [
    `You are working in the git worktree ${A.worktree}, on branch ${A.branch}, on task ${A.task.id} of the product change ${A.change}. Its delta specs, and its design where it has one, are under openspec/changes/${A.change}/.`,
    'Rules for this run, on top of CLAUDE.md and .worktree/CONTEXT.md:',
    '- Do not commit, push, stash, reset or switch branches, and write nothing to the tracker: the parent session commits and closes the task.',
    `- Never edit anything under openspec/changes/${A.change}/. Where the specs or the design cannot be followed as written, report a spec-contradiction rather than coding around it.`,
    '- Use no Node API or syntax newer than the engines floor in package.json, and match the style of the files beside the one you edit.',
    '- Throwaway files go under .scratch/ only.',
    '- A probe that needs a listener binds port 0 on 127.0.0.1, in its own script, never through a command that fixes the port. Stop every process you start before you return, and check that nothing you started still listens.',
  ].join('\n')
}

function taskBlock() {
  return `## Task ${A.task.id}: ${A.task.title}\n\n${A.task.body}`
}

function settledBlock() {
  return A.settled && A.settled.length
    ? `\n\n## Settled already; do not raise these again\n\n${A.settled.map((s) => `- ${s}`).join('\n')}`
    : ''
}

/* ----------------------------------------------------------------------------- the schemas ----- */

const STRINGS = { type: 'array', items: { type: 'string' } }

function findingSchema(kinds) {
  return {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: kinds },
      severity: { type: 'string', enum: SEVERITIES },
      title: { type: 'string' },
      file: { type: 'string' },
      against: { type: 'string' },
      evidence: { type: 'string' },
      fix: { type: 'string' },
    },
    required: ['kind', 'severity', 'title', 'file', 'against', 'evidence', 'fix'],
  }
}

/** How Setup and the sweep each list the listeners, the one text both prompts carry. */
const LISTENING =
  'the TCP listeners on 127.0.0.1, with `lsof -nP -iTCP@127.0.0.1 -sTCP:LISTEN` on macOS or `ss -ltnpH src 127.0.0.1` on Linux: one entry per listening socket with its pid, its port and its command, as printed, and an empty list when there is none'

const LISTENERS = {
  type: 'array',
  items: {
    type: 'object',
    properties: { pid: { type: 'string' }, port: { type: 'string' }, command: { type: 'string' } },
    required: ['pid', 'port', 'command'],
  },
}

// No enum here: a policy that is wrong must reach the code below whole, to be refused with a reason,
// not be tidied by the agent that read it. The inputs are asked for only where an app is named.
function setupSchema() {
  const properties = { policyJson: { type: 'string' }, toplevel: { type: 'string' }, branch: { type: 'string' }, listeners: LISTENERS }
  const required = ['policyJson', 'toplevel', 'branch', 'listeners']
  if (A.app !== undefined) {
    properties.inputsJson = { type: 'string' }
    required.push('inputsJson')
  }
  return { type: 'object', properties, required }
}

const CITE_SCHEMA = { type: 'object', properties: { output: { type: 'string' } }, required: ['output'] }

/** The test-builder's files, as data: it writes nothing itself. */
const TESTS_SCHEMA = {
  type: 'object',
  properties: {
    files: {
      type: 'array',
      items: {
        type: 'object',
        properties: { path: { type: 'string' }, layer: { type: 'string' }, runAt: { type: 'string', enum: ['build', 'verify'] }, content: { type: 'string' } },
        required: ['path', 'layer', 'runAt', 'content'],
      },
    },
    complete: { type: 'boolean' },
    findings: { type: 'array', items: findingSchema(BUILDER_KINDS) },
  },
  required: ['files', 'complete', 'findings'],
}

const RUN_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          attempts: {
            type: 'array',
            items: { type: 'object', properties: { passed: { type: 'boolean' }, output: { type: 'string' } }, required: ['passed', 'output'] },
          },
        },
        required: ['path', 'attempts'],
      },
    },
    platform: { type: 'string' },
    node: { type: 'string' },
    status: { type: 'string' },
  },
  required: ['results', 'platform', 'node', 'status'],
}

const TRIAGE_SCHEMA = {
  type: 'object',
  properties: {
    route: { type: 'string', enum: TRIAGE },
    id: { type: 'string' },
    expected: { type: 'string' },
    observed: { type: 'string' },
    lowerLayer: { type: 'string' },
    contradicts: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['route', 'id', 'expected', 'observed', 'lowerLayer', 'contradicts', 'reason'],
}

const WORK_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    filesChanged: STRINGS,
    proofs: {
      type: 'array',
      items: {
        type: 'object',
        properties: { command: { type: 'string' }, passed: { type: 'boolean' }, output: { type: 'string' } },
        required: ['command', 'passed', 'output'],
      },
    },
    decisions: STRINGS,
    findings: { type: 'array', items: findingSchema(BUILDER_KINDS) },
  },
  required: ['summary', 'filesChanged', 'proofs', 'decisions', 'findings'],
}

const STRING = { type: 'string' }

/** One record per scenario: the scenario as `args.scenarios` gives it, the command, and `field`. */
const perScenario = (field) => ({
  type: 'array',
  items: { type: 'object', properties: { scenario: STRING, command: STRING, [field]: STRING }, required: ['scenario', 'command', field] },
})

/** The builder's work, with its red run: the fixer returns WORK_SCHEMA alone. */
const BUILD_SCHEMA = {
  type: 'object',
  properties: { ...WORK_SCHEMA.properties, red: perScenario('failure'), alreadyGreen: perScenario('evidence') },
  required: [...WORK_SCHEMA.required, 'red', 'alreadyGreen'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: { checked: STRINGS, findings: { type: 'array', items: findingSchema(KINDS) } },
  required: ['checked', 'findings'],
}

const MERGE_SCHEMA = {
  type: 'object',
  properties: { groups: { type: 'array', items: { type: 'array', items: { type: 'integer' } } } },
  required: ['groups'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['upheld', 'refuted', 'unverified'] },
    reason: { type: 'string' },
    followUp: { type: 'boolean' },
  },
  required: ['verdict', 'reason', 'followUp'],
}

const SWEEP_SCHEMA = { type: 'object', properties: { listeners: LISTENERS }, required: ['listeners'] }

/* ------------------------------------------------------------------------ checking the input ----- */

const isText = (v) => typeof v === 'string' && v.trim() !== ''
const isWhole = (v) => Number.isInteger(v) && v >= 1
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/** Why the arguments cannot drive a run, or null when they can. Nothing has run yet. */
function argsProblem() {
  if (!isPlainObject(A.task) || !isText(A.task.id) || !isText(A.task.title) || !isText(A.task.body)) {
    return 'args.task must be { id, title, body }, each a non-empty string, as `bd show <id>` prints them'
  }
  if (!Array.isArray(A.scenarios) || A.scenarios.some((s) => !isText(s))) {
    return 'args.scenarios must be an array of non-empty strings'
  }
  for (const key of ['change', 'worktree', 'branch', 'kind']) {
    if (!isText(A[key])) return `args.${key} must be a non-empty string`
  }
  if (A.app !== undefined && !(isText(A.app) && NAME_PATTERN.test(A.app) && NAME_PATTERN.test(A.change))) {
    return 'args.app must name a directory under apps/, and args.change be a plain name'
  }
  if (A.lenses !== undefined && (!isPlainObject(A.lenses) || Object.values(A.lenses).some((v) => !isText(v)))) {
    return 'args.lenses must be an object mapping a lens key to the focus text for this task'
  }
  if (A.guide !== undefined && typeof A.guide !== 'string') return 'args.guide must be a string'
  if (A.settled !== undefined && (!Array.isArray(A.settled) || A.settled.some((s) => !isText(s)))) {
    return 'args.settled must be an array of non-empty strings'
  }
  return null
}

/** The policy Setup read, checked, or the reason it cannot be used. */
function readPolicy(setup) {
  let p
  try {
    p = JSON.parse(setup.policyJson)
  } catch (error) {
    return { problem: `tools/policy/ could not be read: Setup printed ${JSON.stringify(setup.policyJson.slice(0, 200))}` }
  }
  if (!isPlainObject(p)) return { problem: 'tools/policy/ could not be read: Setup did not print an object' }
  const missing = POLICY_KEYS.filter((key) => p[key] === undefined || p[key] === null)
  if (missing.length) return { problem: `tools/policy/ has no ${missing.map((k) => `\`${k}\``).join(', ')}` }

  const labels = isPlainObject(p.assetLabels) ? Object.keys(p.assetLabels) : []
  const lensSets = p.buildReviewLenses
  if (!isPlainObject(lensSets) || Object.values(lensSets).some((set) => !Array.isArray(set) || !set.length)) {
    return { problem: 'tools/policy/agent-workflows.json `buildReviewLenses` must map each kind to a non-empty list of lens keys' }
  }
  for (const [kind, set] of Object.entries(lensSets)) {
    if (!labels.includes(kind)) {
      return { problem: `tools/policy/agent-workflows.json \`buildReviewLenses\` has the kind ${kind}, which is not an \`assetLabels\` key` }
    }
    const unknown = set.filter((lens) => !Object.prototype.hasOwnProperty.call(LENSES, lens))
    if (unknown.length) {
      return {
        problem: `tools/policy/agent-workflows.json \`buildReviewLenses\` names the lens ${unknown.join(', ')} for ${kind}, which this workflow does not have (it has: ${Object.keys(LENSES).join(', ')})`,
      }
    }
  }
  const skeptics = p.buildReviewSkeptics
  if (!isPlainObject(skeptics) || SEVERITIES.some((s) => !isWhole(skeptics[s])) || Object.keys(skeptics).length !== SEVERITIES.length) {
    return { problem: `tools/policy/agent-workflows.json \`buildReviewSkeptics\` must give exactly ${SEVERITIES.join(', ')} each a whole number of at least 1` }
  }
  if (!isWhole(p.buildReviewMaxRounds)) {
    return { problem: 'tools/policy/agent-workflows.json `buildReviewMaxRounds` must be a whole number of at least 1' }
  }
  const majors = p.buildReviewMajorSeverities
  if (!Array.isArray(majors) || majors.some((s) => !SEVERITIES.includes(s))) {
    return { problem: `tools/policy/agent-workflows.json \`buildReviewMajorSeverities\` must be a list drawn from ${SEVERITIES.join(', ')}` }
  }
  const redFirst = p.buildRedFirstKinds
  if (!Array.isArray(redFirst) || redFirst.some((kind) => !labels.includes(kind))) {
    return { problem: 'tools/policy/agent-workflows.json `buildRedFirstKinds` must be a list of `assetLabels` keys' }
  }
  const independentProblem = independentPolicyProblem(p, labels)
  if (independentProblem) return { problem: independentProblem }

  if (!Object.prototype.hasOwnProperty.call(lensSets, A.kind)) {
    return { problem: `args.kind ${A.kind} has no lens set in tools/policy/agent-workflows.json \`buildReviewLenses\` (it has: ${Object.keys(lensSets).join(', ')})` }
  }
  const extra = Object.keys(A.lenses || {}).filter((lens) => !lensSets[A.kind].includes(lens))
  if (extra.length) {
    return { problem: `args.lenses names ${extra.join(', ')}, which the kind ${A.kind} does not run (it runs: ${lensSets[A.kind].join(', ')})` }
  }
  const strip = (path) => path.trim().replace(/\/+$/, '')
  if (strip(setup.toplevel) !== strip(A.worktree)) {
    return { problem: `args.worktree is ${A.worktree}, but Setup ran in ${setup.toplevel.trim()}: pass the path git rev-parse --show-toplevel prints there` }
  }
  if (setup.branch.trim() !== A.branch.trim()) {
    return { problem: `args.branch is ${A.branch}, but the worktree is on ${setup.branch.trim()}` }
  }
  if (p.buildIndependentKinds.includes(A.kind) && A.app === undefined) {
    return { problem: `args.app must name the app under apps/ for a task of kind ${A.kind}, which \`buildIndependentKinds\` gives a test-builder` }
  }
  return { policy: p }
}

/** Why the test-builder's and the architect's keys cannot be used, or null. */
function independentPolicyProblem(p, labels) {
  const isRelative = (path) => isText(path) && !path.startsWith('/') && !path.split('/').includes('..')
  const layers = isPlainObject(p.testTraceLayers) ? Object.keys(p.testTraceLayers) : []
  if (!Array.isArray(p.buildIndependentKinds) || p.buildIndependentKinds.some((kind) => !labels.includes(kind))) {
    return 'tools/policy/agent-workflows.json `buildIndependentKinds` must be a list of `assetLabels` keys'
  }
  if (!isWhole(p.buildArchitectMaxRounds)) return 'tools/policy/agent-workflows.json `buildArchitectMaxRounds` must be a whole number of at least 1'
  if (!Array.isArray(p.independentInputs) || !p.independentInputs.length || !p.independentInputs.every(isRelative)) {
    return 'tools/policy/agent-workflows.json `independentInputs` must be a non-empty list of relative paths, none climbing out'
  }
  if (!isRelative(p.independentTestDir) || !p.independentTestDir.includes('{app}')) {
    return 'tools/policy/agent-workflows.json `independentTestDir` must be a relative path holding `{app}`'
  }
  if (!Array.isArray(p.independentLayers) || !p.independentLayers.length || p.independentLayers.some((l) => !layers.includes(l))) {
    return 'tools/policy/agent-workflows.json `independentLayers` must be a non-empty list of `testTraceLayers` keys'
  }
  if (!Array.isArray(p.architectRunLayers) || p.architectRunLayers.some((l) => !p.independentLayers.includes(l))) {
    return 'tools/policy/agent-workflows.json `architectRunLayers` must be a list drawn from `independentLayers`'
  }
  return null
}

/* ---------------------------------------------------------------------------- the run state ----- */

const S = {
  build: null,
  lastFix: null,
  fixUnreviewed: false,
  rounds: [],
  confirmed: [],
  unverified: [],
  refuted: [],
  unplanned: [],
  followUps: [],
  independent: null,
}
let policy = null
let before = []
/** For a kind the test-builder runs for: the app, its directory, the task's IDs, and the inputs. */
let I = null

function newRound(round, lenses) {
  const byKind = {}
  for (const kind of KINDS) byKind[kind] = 0
  const record = { round, lenses, lensesMissing: [], raised: 0, merged: 0, byKind, skeptics: 0, confirmed: 0, refuted: 0, unverified: 0, fixed: 0 }
  S.rounds.push(record)
  return record
}

const work = (w) => ({ summary: w.summary, filesChanged: w.filesChanged, proofs: w.proofs, decisions: w.decisions })

/** An already-green report as the parent receives it: among the unverified findings, never passed. */
const greenFinding = (g) => ({
  round: 0,
  source: 'build',
  raisedBy: ['build'],
  kind: 'already-green',
  title: `Never seen to fail: ${g.scenario}`,
  command: g.command,
  against: g.scenario,
  evidence: g.evidence,
  fix: 'Where the code lacked this behaviour before the build, make the proof fail without it.',
})

function summary(stopped, why, listeners) {
  return {
    task: A.task && A.task.id,
    stopped,
    why,
    build: S.build,
    lastFix: S.lastFix,
    fixUnreviewed: S.fixUnreviewed,
    rounds: S.rounds,
    confirmed: S.confirmed,
    unverified: S.unverified,
    refuted: S.refuted,
    unplanned: S.unplanned,
    followUps: S.followUps,
    independent: S.independent,
    listeners,
  }
}

function refuse(why, listeners) {
  log(`Refused: ${why}`)
  return summary('refused', why, { checked: false, before: listeners || [], after: null, leftBehind: [] })
}

const keyOf = (l) => `${String(l.pid).trim()}:${String(l.port).trim()}`

/** Every exit after Setup: list the listeners again, and name those the run left behind. */
async function finish(stopped, why) {
  phase('Sweep')
  const sweep = await agent(`Now list ${LISTENING}. Do nothing else: change nothing and stop nothing.`, {
    label: 'sweep',
    phase: 'Sweep',
    schema: SWEEP_SCHEMA,
    effort: 'low',
  })
  const seen = new Set(before.map(keyOf))
  const leftBehind = sweep ? sweep.listeners.filter((l) => !seen.has(keyOf(l))) : []
  if (!sweep) why += '; the sweep returned nothing, so the listeners were not checked'
  if (leftBehind.length) {
    log(`Left behind on 127.0.0.1: ${leftBehind.map((l) => `${l.command} (pid ${l.pid}, port ${l.port})`).join('; ')}`)
  }
  log(`Stopped (${stopped}): ${why}`)
  return summary(stopped, why, { checked: Boolean(sweep), before, after: sweep ? sweep.listeners : null, leftBehind })
}

/* ------------------------------------------------------------------------ sorting findings ----- */

const normalise = (file) =>
  String(file)
    .trim()
    .replace(A.worktree.replace(/\/+$/, '') + '/', '')
    .replace(/^\.\//, '')
    .replace(/:\d+(?:[-:]\d+)?$/, '')

const rank = (severity) => SEVERITIES.indexOf(severity)

/**
 * File every finding that is not confirmed where the parent will find it, count each kind on the
 * round, and return those that go to skeptics.
 */
function route(findings, record, round, source) {
  const toConfirm = []
  for (const f of findings) {
    record.byKind[f.kind] = (record.byKind[f.kind] || 0) + 1
    const entry = { round, source, ...f }
    if (CONFIRMED_KINDS.includes(f.kind)) toConfirm.push(entry)
    else if (f.kind === 'unplanned') S.unplanned.push(entry)
    else S.followUps.push(entry)
  }
  return toConfirm
}

/** Findings of one kind on one file that describe one defect, merged; the rest as they were. */
async function merge(findings, round) {
  const byPlace = new Map()
  findings.forEach((f, i) => {
    const place = `${normalise(f.file)}\u0000${f.kind}`
    if (!byPlace.has(place)) byPlace.set(place, [])
    byPlace.get(place).push(i)
  })
  const shared = [...byPlace.values()].filter((indices) => indices.length > 1)
  if (!shared.length) return findings

  phase('Merge')
  const listing = shared
    .map((indices) =>
      indices
        .map((i) => {
          const f = findings[i]
          return `[${i}] ${normalise(f.file)} (${f.kind}, ${f.severity}) ${f.title}: ${f.evidence.slice(0, 300)}`
        })
        .join('\n'),
    )
    .join('\n\n')
  const out = await agent(
    `Independent reviewers of task ${A.task.id} reported the findings below, listed in blocks by the file they name and their kind. Within each block, decide which findings describe the same defect: the same wrong behaviour at the same place, however it is worded. Return every index below exactly once, in groups; a finding like no other is a group of one, and a group never spans two blocks. Read nothing and change nothing.\n\n${listing}`,
    { label: `merge r${round}`, phase: 'Merge', schema: MERGE_SCHEMA, effort: 'low' },
  )

  const blockOf = new Map()
  shared.forEach((indices, b) => indices.forEach((i) => blockOf.set(i, b)))
  const used = out ? out.groups.flat() : []
  const sound =
    out &&
    used.length === blockOf.size &&
    new Set(used).size === used.length &&
    used.every((i) => blockOf.has(i)) &&
    out.groups.every((g) => g.length > 0 && g.every((i) => blockOf.get(i) === blockOf.get(g[0])))
  if (!sound) {
    log(`Round ${round}: the merge did not place each finding exactly once within its file and kind; the findings are kept apart`)
    return findings
  }

  const merged = findings.filter((_, i) => !blockOf.has(i))
  for (const group of out.groups) {
    const members = group.map((i) => findings[i]).sort((a, b) => rank(a.severity) - rank(b.severity))
    if (members.length === 1) {
      merged.push(members[0])
      continue
    }
    const raisedBy = []
    for (const m of members) for (const lens of m.raisedBy) if (!raisedBy.includes(lens)) raisedBy.push(lens)
    merged.push({
      ...members[0],
      raisedBy,
      evidence: members.map((m) => `[${m.raisedBy.join(', ')}] ${m.evidence}`).join('\n'),
    })
  }
  return merged
}

/** Majority of those sent, as the header states. A missing vote is an unverified one. */
function tally(f, votes) {
  const n = votes.length
  const majority = Math.floor(n / 2) + 1
  const cast = votes.map((v) => v || { verdict: 'unverified', reason: 'the skeptic returned nothing', followUp: false })
  const upheld = cast.filter((v) => v.verdict === 'upheld').length
  const refuted = cast.filter((v) => v.verdict === 'refuted')
  const outcome = upheld >= majority ? 'confirmed' : refuted.length >= majority ? 'refuted' : 'unverified'
  const followUp = outcome === 'refuted' && refuted.filter((v) => v.followUp).length >= majority
  return {
    ...f,
    outcome,
    skeptics: n,
    followUp,
    votes: cast.map((v) => `${v.verdict}${v.followUp ? ', follow-up' : ''}: ${v.reason}`),
  }
}

function skepticPrompt(f, i, n) {
  return [
    rules(),
    '',
    `You are skeptic ${i} of ${n} on a finding about task ${A.task.id}. Judge it against the delta specs under openspec/changes/${A.change}/, the design there where there is one, and the task below, and against nothing else. Read the files it names and, where it helps, run the command it cites. You change nothing.`,
    '',
    '- upheld: you checked it, and it holds, as the kind it claims.',
    '- refuted: you checked it, and it is wrong: factually, already satisfied, or asking for more than the specs, the design and the task state. Set followUp when it is refuted only because nothing states the behaviour it asks for, and that behaviour deserves a scenario or a test.',
    '- unverified: you could not establish either. Say what stopped you. Never answer refuted because you could not verify it.',
    '',
    KIND_RULE,
    '',
    taskBlock() + settledBlock(),
    '',
    '## The finding',
    '',
    `Kind: ${f.kind}`,
    `Severity: ${f.severity}`,
    `Title: ${f.title}`,
    `File: ${f.file}`,
    `Against: ${f.against}`,
    `Evidence: ${f.evidence}`,
    `Proposed fix: ${f.fix}`,
  ].join('\n')
}

/** Send each finding to its skeptics, file the outcome, and count it on the round. */
async function judge(findings, record, round) {
  phase('Confirm')
  const judged = await pipeline(
    findings,
    (f) => {
      const n = policy.buildReviewSkeptics[f.kind === 'spec-contradiction' ? 'blocker' : f.severity]
      return parallel(
        Array.from({ length: n }, (_, i) => () =>
          agent(skepticPrompt(f, i + 1, n), {
            label: `skeptic ${i + 1}/${n} r${round}: ${f.title.slice(0, 40)}`,
            phase: 'Confirm',
            schema: VERDICT_SCHEMA,
          }),
        ),
      )
    },
    (votes, f) => tally(f, votes),
  )
  const done = judged.filter(Boolean)
  for (const f of done) {
    record.skeptics += f.skeptics
    record[f.outcome] += 1
    if (f.outcome === 'confirmed') {
      f.fixed = false
      S.confirmed.push(f)
    }
    else if (f.outcome === 'unverified') S.unverified.push(f)
    else {
      S.refuted.push({ round, source: f.source, title: f.title, file: f.file, reason: f.votes.find((v) => v.startsWith('refuted')) || f.votes[0], followUp: f.followUp })
      if (f.followUp) S.followUps.push({ ...f, kind: 'coverage-gap' })
    }
  }
  return done
}

const confirmedSpec = (judged) => judged.filter((f) => f.outcome === 'confirmed' && f.kind === 'spec-contradiction')
const titles = (fs) => fs.map((f) => `"${f.title}"`).join(', ')

/* ------------------------------------------------------------------------------- the prompts ----- */

function reviewPrompt(lens, round) {
  const def = LENSES[lens]
  const focus = A.lenses && A.lenses[lens] ? `\n\n## For this task, also\n\n${A.lenses[lens]}` : ''
  // The test-builder's findings are its own: no app-builder's reviewer is shown them.
  const own = (list) => list.filter((f) => f.source !== TEST_BUILDER)
  const seen = [
    ...own(S.confirmed).map((f) => `- [confirmed${f.fixed ? ' and fixed' : ''}] ${f.title} (${f.file})`),
    ...own(S.refuted).map((f) => `- [refuted] ${f.title} (${f.file})`),
    ...own(S.unverified).map((f) => `- [unverified, with the parent] ${f.title} (${f.file || f.command})`),
    ...own(S.followUps).map((f) => `- [returned for filing] ${f.title} (${f.file})`),
    ...own(S.unplanned).map((f) => `- [returned to the parent] ${f.title} (${f.file})`),
  ]
  const prior = seen.length ? `\n\n## Judged already; raise one again only with new evidence\n\n${seen.join('\n')}` : ''
  const fixNote = round > 1 && S.lastFix ? `\n\n## The fix after round ${round - 1} reported\n\n${S.lastFix.summary}` : ''
  const red = def.red ? `\n\n## The build's red records\n\n${S.build.red.map((r) => `- ${r.scenario} (${r.command}): ${r.failure}`).join('\n') || 'None.'}` : ''
  return [
    rules(),
    '',
    `You are an independent reviewer of task ${A.task.id}, through one lens only: ${def.label}. You change nothing in the repository. Report only real findings, each with evidence a reader can check again: the file and line, or the command and what it printed.`,
    '',
    KIND_RULE,
    '',
    taskBlock(),
    '',
    `## Your lens: ${def.label}`,
    '',
    def.prompt + focus + red + settledBlock() + prior + fixNote,
  ].join('\n')
}

/** The app-builder's part, for a kind the test-builder runs for: empty for any other kind. */
function appBuilderBlock() {
  if (!I) return ''
  return [
    '',
    '## You are the app-builder',
    '',
    `You write the code and its unit, functional, integration and mutation tests. Contract, fitness and E2E tests are the test-builder's, under ${I.dir}: never read, run or change a file there, or it proves nothing independent of you.`,
    "Cover each scenario's variants with functional tests before any integration test, each behaviour at the lowest layer that can observe it.",
    "Each test sets up its own state, through the Binding Surface's seeding interface where there is one, and uses no other test's data. Stub an external dependency behind an interface; a separate-process stub only where that cannot work, validated against its contract artifact where it has one.",
  ].join('\n')
}

function buildPrompt() {
  const guide = A.guide ? `\n\n## The parent session's guide\n\n${A.guide}` : ''
  return [
    rules(),
    '',
    taskBlock() + guide + settledBlock() + appBuilderBlock(),
    '',
    '## The scenarios this task names',
    '',
    A.scenarios.map((s) => `- ${s}`).join('\n') || 'None.',
    '',
    '## How to work',
    '',
    "Read the task, the delta specs and the design first. Before you change the code under test, give each scenario above its test and run the task's proof: each must fail on the scenario's THEN, not on an error before it. Return each failure as a red record, with the scenario as written above and the command. A scenario whose proof passes first, because the code already has its behaviour, goes under alreadyGreen instead, with the command and what shows it.",
    '',
    "Then build what the task asks, and run every proof it names until each passes as measured. Regenerate every derived artifact the change touches. A defect in your own work is fixed, never reported.",
    '',
    'Report as findings only what you found and did not fix, by this rule:',
    '',
    KIND_RULE,
    '',
    'Return every file you created or changed, each proof you ran with its real output trimmed to what matters, and each decision you made that the design left to the build.',
  ].join('\n')
}

function fixPrompt(defects) {
  const list = defects
    .map((f, i) => `${i + 1}. [${f.severity}] ${f.title} (${f.file})\n   Against: ${f.against}\n   Evidence: ${f.evidence}\n   Proposed fix: ${f.fix}`)
    .join('\n\n')
  return [
    rules(),
    '',
    taskBlock() + settledBlock() + appBuilderBlock(),
    '',
    '## Fix these confirmed defects, and nothing else',
    '',
    list,
    '',
    FIX_TAIL,
    '',
    KIND_RULE,
  ].join('\n')
}

const FIX_TAIL = "Then run every proof the task names again, and return their real output. Report as findings only what you could not fix without contradicting the specs, and what you found outside this task, by this rule:"

/* ------------------------------------------------------------------ the independent tests ----- */

/** A fence longer than any run of backticks in `text`, so no file's text can close it. */
function fenced(text) {
  const runs = text.match(/`+/g) || []
  const fence = '`'.repeat(Math.max(3, ...runs.map((r) => r.length + 1)))
  return `${fence}\n${text}\n${fence}`
}

/** FNV-1a over the UTF-16 code units of `s`, as Setup's command computes it. */
function fnv(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

const fill = (path, app) => path.split('{change}').join(A.change).split('{app}').join(app)
const under = (path, root) => path === root || path.startsWith(root + '/')
const idsOf = (scenarios) => scenarios.map((s) => ID_TOKEN.exec(s)).filter(Boolean).map((m) => m[1])
const testIds = (content) => [...content.matchAll(TEST_NAME)].flatMap((m) => m[1].split(',').map((id) => id.trim()))

/** Setup's command: the inputs the policy allows, with the epic's children, and a checksum over both. */
function inputsCommand() {
  const epic = /\.\d+$/.test(A.task.id) ? A.task.id.replace(/\.\d+$/, '') : ''
  const js = [
    "const fs=require('fs'),cp=require('child_process');",
    `const sub=(p)=>p.split('{change}').join('${A.change}').split('{app}').join('${A.app}');`,
    "const roots=require('./tools/lib/policy.ts').readPolicy('.').independentInputs.map(sub);",
    "const walk=(p)=>!fs.existsSync(p)?[]:fs.statSync(p).isDirectory()?fs.readdirSync(p).filter((n)=>!n.startsWith('.')).flatMap((n)=>walk(p+'/'+n)):[p];",
    'const paths=[...new Set(roots.flatMap(walk))].sort();',
    "const files=paths.map((path)=>{const t=fs.readFileSync(path,'utf8');return {path,text:path.endsWith('.mjs')?t.slice(0,t.indexOf('*/')+2):t}});",
    `const tasks='${epic}'?JSON.parse(cp.execFileSync('bd',['list','--parent','${epic}','--all','--json','-n','0']).toString()).map((t)=>({id:t.id,status:t.status,title:t.title,description:t.description||''})):[];`,
    'const s=JSON.stringify({files,tasks});let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}',
    'console.log(JSON.stringify({files,tasks,fnv:h}))',
  ].join('')
  return `node --no-warnings -e "${js}"`
}

/**
 * Setup's inputs, checked: the files under the paths the policy allows, the task list, and the
 * refs to cite; or the reason they cannot be used.
 */
function readInputs(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return { problem: `Setup's inputs are not the JSON its command prints: ${JSON.stringify(String(text).slice(0, 200))}` }
  }
  if (!isPlainObject(parsed) || !Array.isArray(parsed.files) || !Array.isArray(parsed.tasks) || !Number.isInteger(parsed.fnv)) {
    return { problem: "Setup's inputs do not hold files, tasks and a checksum" }
  }
  if (fnv(JSON.stringify({ files: parsed.files, tasks: parsed.tasks })) !== parsed.fnv) {
    return { problem: "Setup's copy of the test-builder's inputs does not match the checksum its command printed, so it was not copied verbatim" }
  }
  const roots = policy.independentInputs.map((p) => fill(p, A.app))
  const files = []
  for (const f of parsed.files) {
    if (roots.some((root) => under(f.path, root))) files.push(f)
    else log(`Dropped from the test-builder's inputs: ${f.path}, under no path \`independentInputs\` gives`)
  }
  return { files, tasks: parsed.tasks }
}

/** The refs the tests of this task may cite: its IDs, the Binding Surface, and each contract operation. */
function refsToCite(files, ids) {
  const refs = []
  for (const id of ids) refs.push(...(id.startsWith('NFR-') ? [id] : [`${id}:happy`, `${id}:negative`]))
  const surface = `apps/${A.app}/binding-surface.md`
  if (files.some((f) => f.path === surface)) refs.push(`surface:${surface}`)
  for (const f of files.filter((f) => under(f.path, `apps/${A.app}/contracts`) && f.path.endsWith('.json'))) {
    for (const m of f.text.matchAll(/"operationId"\s*:\s*"([A-Za-z0-9_.-]+)"/g)) refs.push(`contract:${f.path}#${m[1]}`)
  }
  return refs
}

function testBuilderPrompt(rewrite) {
  const tasks = I.tasks.map((t) => `- ${t.id} [${t.status}] ${t.title}\n${t.description.replace(/^/gm, '    ')}`).join('\n')
  const redo = rewrite
    ? `\n\n## Rewrite these, and return each whole\n\n${rewrite.map((r) => `### ${r.path}\n\n${r.reason}\n\n${fenced(r.content)}`).join('\n\n')}`
    : ''
  return [
    `You are the test-builder of task ${A.task.id} of the product change ${A.change}, for the app ${A.app}. Your instructions are your agent file's; everything you may read is below.`,
    '',
    taskBlock(),
    '',
    '## The IDs this task names',
    '',
    A.scenarios.filter((s) => ID_TOKEN.test(s)).map((s) => `- ${s}`).join('\n'),
    '',
    '## Where your files go',
    '',
    `${I.dir}/<runAt>/<layer>/<name>.test.js, <layer> one of ${policy.independentLayers.join(', ')}; your earlier files are among the inputs.`,
    '',
    '## The hashes to cite',
    '',
    I.cites.join('\n') || 'None.',
    '',
    "## The change's tasks",
    '',
    tasks || 'None.',
    '',
    '## The inputs',
    '',
    I.files.map((f) => `### ${f.path}\n\n${fenced(f.text)}`).join('\n\n'),
  ].join('\n') + redo
}

/** When a test-builder's file runs: `build` only at a layer the architect runs, declared to run at build. */
const stageOf = (f) => (policy.architectRunLayers.includes(f.layer) && f.runAt === 'build' ? 'build' : 'verify')

/**
 * Why the test-builder's files cannot be written where it put them, or null. The directory after
 * `I.dir` is the file's stage, so a package script can run the build stage alone.
 */
function misplaced(files) {
  const shape = new RegExp(`^${I.dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(build|verify)/(${policy.independentLayers.join('|')})/[^/]+\\.test\\.js$`)
  const bad = files.filter((f) => {
    const m = shape.exec(f.path)
    return !m || m[1] !== stageOf(f) || m[2] !== f.layer
  })
  return bad.length
    ? `the test-builder returned ${bad.map((f) => `${f.path} (${f.layer}, ${stageOf(f)})`).join(', ')}, outside ${I.dir}/<stage>/<layer>/<name>.test.js`
    : null
}

/** A relative path with its `.` and `..` segments resolved, as a file system resolves them. */
const resolved = (path) => path.split('/').reduce((parts, seg) => (seg === '..' ? parts.slice(0, -1) : seg === '.' || seg === '' ? parts : [...parts, seg]), []).join('/')

/**
 * The app-builder's files under any app's `independentTestDir`, or null. The match ignores case,
 * since a file system that ignores case (macOS's default) holds one directory under both spellings.
 */
function intrudes(filesChanged, who) {
  const any = new RegExp(`^${policy.independentTestDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\{app\\}', '[^/]+')}(?:/|$)`, 'i')
  const hit = filesChanged.map((file) => resolved(normalise(file))).filter((path) => any.test(path))
  return hit.length ? `${who} changed ${hit.join(', ')}, under the test-builder's directory` : null
}

const runCommand = (path) => `node scripts/run-tests.mjs "${path}"`

function runPrompt(files) {
  return [
    `Work in ${A.worktree}. Run, for task ${A.task.id}'s architect, tests another agent wrote against the code as it stands, changing nothing else.`,
    '',
    '1. Write each file below at its path, exactly as given.',
    '2. Run each command below; run one that fails once more, at once, and never a third time.',
    `3. Remove what you wrote: \`git restore -- <path>\` for a tracked file, delete the rest, then run \`git status --porcelain -- ${I.dir}\`.`,
    '',
    "Return each file's attempts in order, each passed or not, with its output trimmed to what failed; what `node -p process.platform` and `node --version` print; and, as status, what step 3 printed last, verbatim.",
    '',
    '## The commands',
    '',
    files.map((f) => `- ${runCommand(f.path)}`).join('\n'),
    '',
    '## The files',
    '',
    files.filter((f) => !f.earlier).map((f) => `### ${f.path}\n\n${fenced(f.content)}`).join('\n\n'),
  ].join('\n')
}

function architectPrompt(f, result) {
  const tries = result.attempts.map((a, i) => `Attempt ${i + 1}, ${a.passed ? 'passed' : 'failed'}:\n${fenced(a.output)}`).join('\n\n')
  return [
    rules(),
    '',
    `You are the architect of task ${A.task.id}. This test, written from the specs, the design and the Binding Surface (apps/${A.app}/binding-surface.md) alone, failed against the build. Give the failure one route:`,
    '',
    '- rewrite-test: the test contradicts the scenario or NFR it references, or depends on something the Binding Surface does not declare.',
    '- fix-app: the test is consistent with its references, and the code is not.',
    '- re-design: both are consistent with the text, or the text is ambiguous or contradictory, or an NFR is unattainable.',
    '',
    "Return the route; id, the one ID of the test's names it violates; expected, the sentence of the delta specs or the design stating the behaviour, copied exactly; observed, what the application did, as behaviour, never the test's code, an assertion or a stack frame; lowerLayer, for fix-app, the lowest layer at which a test could observe the defect, or empty; contradicts, for rewrite-test, the line of the test, or the sentence of the specs, design or Binding Surface, that shows it wrong, copied exactly; and reason, for the parent. Change nothing.",
    '',
    `## The test: ${f.path} (${f.layer})`,
    '',
    fenced(f.content),
    '',
    '## How it failed',
    '',
    tries,
  ].join('\n')
}

function redesignPrompt(t, content, i, n) {
  return [
    rules(),
    '',
    `You are skeptic ${i} of ${n} on the architect's call that a failing test of task ${A.task.id} needs a re-design pass. Judge it against the delta specs, the design and the Binding Surface alone, and change nothing.`,
    '',
    '- upheld: neither the test nor the code can hold as the text is written: it is ambiguous or contradictory, or the NFR is unattainable.',
    '- refuted: the test or the code is wrong against the text as written.',
    '- unverified: you could not establish either; say what stopped you.',
    '',
    `ID: ${t.id}`,
    `Expected, as written: ${t.expected}`,
    `The architect's reason: ${t.reason}`,
    '',
    `## The test: ${t.path}`,
    '',
    fenced(content),
  ].join('\n')
}

const STACK_FRAME = /^at\s|(?:file:\/\/|\/)\S*:\d+:\d+|\bAssertionError\b|\bassert(?:\.\w+)*\s*\(|\bexpect\s*\(/
const QUOTABLE = /\w+\W+\w+/
const PLATFORM = /^(?:darwin|linux|win32)$/
const NODE_VERSION = /^v\d+\.\d+\.\d+$/
/** Text with its whitespace removed, so a quote with its spaces moved still matches. */
const squash = (text) => text.replace(/\s+/g, '')

/**
 * The observed text with every line dropped that quotes the test, an assertion or a stack frame. A
 * line or literal of the test that the inputs outside the test-builder's directory also state, such
 * as a request a scenario names, is the app-builder's to read, and does not drop a line.
 */
function screen(observed, f) {
  const shared = I.files.filter((x) => !under(x.path, I.dir)).map((x) => squash(x.text))
  const literals = [...f.content.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map((m) => m[2])
  const quotable = [...f.content.split('\n'), ...literals]
    .map(squash)
    .filter((s) => QUOTABLE.test(s) && !shared.some((x) => x.includes(s)))
  const name = f.path.split('/').pop()
  let dropped = 0
  const kept = []
  for (const line of observed.split('\n')) {
    const t = line.trim()
    const s = squash(t)
    if (!t) continue
    const quotes = STACK_FRAME.test(t) || t.includes(name) || quotable.some((q) => s.includes(q) || (QUOTABLE.test(s) && q.includes(s)))
    if (quotes) dropped++
    else kept.push(t)
  }
  return { text: kept.join(' '), dropped }
}

/** The app-builder's feedback on one failure, built from the four fields alone. */
function feedback(t, i, env) {
  const observed = t.screened.text || 'withheld: every line quoted the test, an assertion or a stack frame'
  const lines = [`${i + 1}. ${t.id}`, `   Expected, as written: ${t.expected}`, `   Observed: ${observed}`, `   Environment: ${env}, orchestration level ${t.level}`]
  if (t.lowerLayer) lines.push(`   Add the lowest-layer test that reproduces it, a ${t.lowerLayer} test, and see it fail before you fix it.`)
  return lines.join('\n')
}

function architectFixPrompt(routes, env) {
  return [
    rules(),
    '',
    taskBlock() + settledBlock() + appBuilderBlock(),
    '',
    '## Fix the application where it fails these, and nothing else',
    '',
    'Each is a behaviour a test you do not see found wrong: its ID, what the text asks, what the application did, and where.',
    '',
    routes.map((t, i) => feedback(t, i, env)).join('\n\n'),
    '',
    FIX_TAIL,
    '',
    KIND_RULE,
  ].join('\n')
}

/* ---------------------------------------------------------------------------------- the run ----- */

const badArgs = argsProblem()
if (badArgs) return refuse(badArgs)

phase('Setup')
const setup = await agent(
  [
    `Work in ${A.worktree}. Run each of these, and return what each prints, verbatim, even where it looks wrong.`,
    '',
    `1. policyJson: node --no-warnings tools/lib/policy.ts ${POLICY_KEYS.join(' ')}`,
    '2. toplevel: git rev-parse --show-toplevel',
    '3. branch: git branch --show-current',
    `4. listeners: ${LISTENING}.`,
    ...(A.app === undefined ? [] : [`5. inputsJson, the one line this prints: ${inputsCommand()}`]),
    '',
    'Change nothing and stop nothing.',
  ].join('\n'),
  { label: 'setup', phase: 'Setup', schema: setupSchema(), effort: 'low' },
)
if (!setup) return refuse('the Setup agent returned nothing, so tools/policy/ was not read')
const read = readPolicy(setup)
if (read.problem) return refuse(read.problem, setup.listeners)
policy = read.policy
before = setup.listeners
const lensKeys = policy.buildReviewLenses[A.kind]
const majors = policy.buildReviewMajorSeverities
const maxRounds = policy.buildReviewMaxRounds
log(`Task ${A.task.id} (${A.kind}): lenses ${lensKeys.join(', ')}; at most ${maxRounds} round(s)`)

if (policy.buildIndependentKinds.includes(A.kind)) {
  const inputs = readInputs(setup.inputsJson)
  if (inputs.problem) return refuse(inputs.problem, setup.listeners)
  const dir = fill(policy.independentTestDir, A.app)
  const ids = idsOf(A.scenarios)
  I = { app: A.app, dir, ids, files: inputs.files, tasks: inputs.tasks, cites: [] }
  S.independent = { app: A.app, dir, skipped: null, complete: null, files: [], e2e: [], rounds: [], untriaged: [] }
  if (!ids.length) {
    S.independent.skipped = 'the task names no scenario or NFR by its ID'
    log(`No test-builder: ${S.independent.skipped}`)
  } else {
    const refs = refsToCite(I.files, ids)
    const cited = await agent(`Work in ${A.worktree}. Run this, and return everything it prints, verbatim, even where it fails: node scripts/test-trace.mjs cite ${refs.join(' ')}`, {
      label: 'cite',
      phase: 'Setup',
      schema: CITE_SCHEMA,
      effort: 'low',
    })
    const printed = new Set(cited ? cited.output.split('\n').map((l) => l.trim()) : [])
    I.cites = refs.map((ref) => [...printed].find((l) => l.startsWith(`${ref}@`) && /@[0-9a-f]+$/.test(l))).filter(Boolean)
    const uncited = refs.filter((ref) => !I.cites.some((c) => c.startsWith(`${ref}@`)))
    if (uncited.length) log(`No hash printed for ${uncited.join(', ')}; the test-builder may not cite them`)
  }
}

phase('Build')
const tested = I && I.ids.length
const [built, tests] = await parallel([
  () => agent(buildPrompt(), { label: 'build', phase: 'Build', schema: BUILD_SCHEMA }),
  async () => (tested ? await agent(testBuilderPrompt(null), { label: TEST_BUILDER, phase: 'Build', schema: TESTS_SCHEMA, agentType: TEST_BUILDER }) : null),
])
if (!built) return finish('agent-died', 'the builder returned nothing, so nothing was built or reviewed')
S.build = { ...work(built), red: built.red, alreadyGreen: built.alreadyGreen }
const buildRound = newRound(0, tests ? ['build', TEST_BUILDER] : ['build'])
buildRound.raised = built.findings.length + (tests ? tests.findings.length : 0)
for (const g of built.alreadyGreen) S.unverified.push(greenFinding(g))
buildRound.unverified += built.alreadyGreen.length
const buildToConfirm = [
  ...route(built.findings.map((f) => ({ ...f, raisedBy: ['build'] })), buildRound, 0, 'build'),
  ...(tests ? route(tests.findings.map((f) => ({ ...f, raisedBy: [TEST_BUILDER] })), buildRound, 0, TEST_BUILDER) : []),
]
if (buildToConfirm.length) {
  const judged = await judge(buildToConfirm, buildRound, 0)
  const spec = confirmedSpec(judged)
  if (spec.length) return finish('spec-contradiction', `the build found ${spec.length} spec contradiction(s) the skeptics confirmed: ${titles(spec)}; no reviewer ran`)
}
const recorded = new Set([...built.red, ...built.alreadyGreen].map((r) => r.scenario.trim()))
const notRed = policy.buildRedFirstKinds.includes(A.kind) ? A.scenarios.filter((s) => !recorded.has(s.trim())) : []
if (notRed.length) {
  return finish('not-red', `the builder returned no red record and no already-green report for ${notRed.length} scenario(s): ${titles(notRed.map((s) => ({ title: s.trim() })))}; no reviewer ran`)
}
const buildFailing = built.proofs.filter((p) => !p.passed)
if (buildFailing.length) {
  return finish('proof-failing', `the build's proof(s) ${buildFailing.map((p) => p.command).join(', ')} did not pass; no reviewer ran`)
}
if (tested && !tests) {
  return finish(
    'agent-died',
    `the test-builder returned nothing; an \`agentType\` is resolved from the agents of the checkout the calling session started in, which must hold .claude/agents/${TEST_BUILDER}.md`,
  )
}
if (I) {
  const bad = intrudes(built.filesChanged, 'the app-builder') || (tests && misplaced(tests.files))
  if (bad) return finish('not-independent', `${bad}; no reviewer ran`)
}
if (tests) {
  S.independent.files = tests.files
  S.independent.complete = tests.complete
  S.independent.e2e = tests.files.filter((f) => stageOf(f) === 'verify').map((f) => f.path)
  if (!tests.complete) log('The test-builder did not declare its tests complete')
}

let reviewEnd = ['round-limit', `no round ran: \`buildReviewMaxRounds\` is ${maxRounds}`]
for (let round = 1; round <= maxRounds; round++) {
  const record = newRound(round, lensKeys)
  phase('Review')
  const reviews = await parallel(
    lensKeys.map((lens) => () => agent(reviewPrompt(lens, round), { label: `review ${lens} r${round}`, phase: 'Review', schema: REVIEW_SCHEMA })),
  )
  S.fixUnreviewed = false
  record.lensesMissing = lensKeys.filter((_, i) => !reviews[i])
  if (record.lensesMissing.length === lensKeys.length) {
    return finish('agent-died', `every reviewer of round ${round} returned nothing, so ${round === 1 ? 'the build' : 'the last fix'} is unreviewed`)
  }
  const raw = []
  reviews.forEach((r, i) => {
    if (r) for (const f of r.findings) raw.push({ ...f, raisedBy: [lensKeys[i]] })
  })
  record.raised = raw.length
  const merged = await merge(raw, round)
  record.merged = raw.length - merged.length
  const toConfirm = route(merged, record, round, 'review')
  const judged = toConfirm.length ? await judge(toConfirm, record, round) : []
  log(`Round ${round}: ${record.raised} raised, ${record.merged} merged away, ${toConfirm.length} to skeptics: ${record.confirmed} confirmed, ${record.refuted} refuted, ${record.unverified} unverified`)

  const spec = confirmedSpec(judged)
  if (spec.length) {
    return finish('spec-contradiction', `round ${round} confirmed ${spec.length} spec contradiction(s): ${titles(spec)}; nothing was fixed after them`)
  }

  const defects = judged.filter((f) => f.outcome === 'confirmed' && f.kind === 'defect')
  if (defects.length) {
    phase('Fix')
    const fix = await agent(fixPrompt(defects), { label: `fix r${round}`, phase: 'Fix', schema: WORK_SCHEMA })
    if (!fix) return finish('agent-died', `the fixer of round ${round} returned nothing, so its ${defects.length} confirmed defect(s) are unfixed`)
    S.lastFix = work(fix)
    S.fixUnreviewed = true
    record.fixed = defects.length
    for (const d of defects) d.fixed = true
    const intruded = I && intrudes(fix.filesChanged, `the fixer of round ${round}`)
    if (intruded) return finish('not-independent', intruded)
    const fixToConfirm = route(fix.findings.map((f) => ({ ...f, raisedBy: [`fix r${round}`] })), record, round, 'fix')
    if (fixToConfirm.length) {
      const fixSpec = confirmedSpec(await judge(fixToConfirm, record, round))
      if (fixSpec.length) {
        return finish('spec-contradiction', `the fix of round ${round} found ${fixSpec.length} spec contradiction(s) the skeptics confirmed: ${titles(fixSpec)}`)
      }
    }
    const fixFailing = fix.proofs.filter((p) => !p.passed)
    if (fixFailing.length) {
      return finish('proof-failing', `after the fix of round ${round}, the proof(s) ${fixFailing.map((p) => p.command).join(', ')} did not pass`)
    }
  }

  const major = defects.filter((f) => majors.includes(f.severity))
  const missing = record.lensesMissing.length
    ? `; the ${record.lensesMissing.join(', ')} reviewer(s) returned nothing, so the round saw less than the policy asks`
    : ''
  if (!major.length) {
    const fixed = defects.length ? `, and the ${defects.length} it did confirm were fixed` : ''
    reviewEnd = ['nothing-major', `round ${round} confirmed no ${majors.join(' or ')} defect${fixed}${missing}`]
    break
  }
  if (round === maxRounds) {
    reviewEnd = ['round-limit', `round ${round}, the last of ${maxRounds}, confirmed ${major.length} ${majors.join(' or ')} defect(s) and they were fixed; that fix is unreviewed${missing}`]
  }
}

if (!I) return finish(...reviewEnd)

/*
 * The architect: run the test-builder's tests, route each failure, act on the routes. Every
 * build-stage file an earlier task committed, as Setup read it, runs beside this task's: `earlier`
 * files are run where they stand, never written or removed, and come back to the parent only rewritten.
 * `exempt` holds their paths, so a rewrite, stored without `earlier`, keeps the exemption (the header's
 * Running paragraph). A task naming no ID has no test-builder files of its own, so the earlier ones run
 * alone; with no earlier one either, nothing is left to run and the review's end is the run's.
 */
const taskFiles = tests ? tests.files : []
const buildDir = `${I.dir}/build/`
const earlier = I.files
  .filter((x) => x.path.startsWith(buildDir) && /\.test\.js$/.test(x.path) && !taskFiles.some((f) => f.path === x.path))
  .map((x) => ({ path: x.path, layer: x.path.slice(buildDir.length).split(/\//)[0], runAt: 'build', content: x.text, earlier: true }))
if (!tests && !earlier.length) return finish(...reviewEnd)
const files = new Map([...earlier, ...taskFiles].map((f) => [f.path, f]))
const exempt = new Set(earlier.map((f) => f.path))
const allowed = new Set([...I.ids, A.task.id])
const env = { platform: '', node: '' }
const levelOf = (f) => (/trace-defaults:[^\n]*\blevel=(\d)/.exec(f.content) || [])[1] || policy.testTraceLayers[f.layer] || 1
const appLayers = Object.keys(policy.testTraceLayers).filter((l) => !policy.independentLayers.includes(l))
const flat = (text) => text.replace(/\s+/g, ' ').trim()
const specTexts = I.files.filter((x) => under(x.path, `openspec/changes/${A.change}`)).map((x) => flat(x.text))

/** The architect's answer, held to what code can check; an answer that fails is untriaged. */
const triage = (t, f) => {
  const record = { path: f.path, layer: f.layer, by: 'architect', route: null, id: '', expected: '', observed: '', screened: null, lowerLayer: '', level: levelOf(f), reason: '' }
  const why = !t
    ? 'the architect returned nothing'
    : !testIds(f.content).includes(t.id.trim())
      ? `it names ${t.id}, which the test's names do not carry`
      : !flat(t.expected) || !specTexts.some((s) => s.includes(flat(t.expected)))
        ? 'its expected text is not found verbatim in the delta specs or the design'
        : t.lowerLayer.trim() && !appLayers.includes(t.lowerLayer.trim())
          ? `its lower layer ${t.lowerLayer} is not one the app-builder writes (${appLayers.join(', ')})`
          : t.route === 'rewrite-test' && (!flat(t.contradicts) || ![f.content, ...I.files.map((x) => x.text)].some((s) => flat(s).includes(flat(t.contradicts))))
            ? 'its contradicted text is not found verbatim in the test or the inputs'
            : null
  if (why) {
    S.independent.untriaged.push({ path: f.path, why })
    return { ...record, reason: `untriaged: ${why}` }
  }
  const lowerLayer = t.route === 'fix-app' ? t.lowerLayer.trim() : ''
  // The test-builder is told only the ID and a quote it could read already: never the architect's words.
  const redo = t.route === 'rewrite-test' ? `${t.id.trim()} is violated here: "${flat(t.contradicts)}"` : ''
  return { ...record, route: t.route, id: t.id.trim(), expected: flat(t.expected), observed: t.observed, screened: screen(t.observed, f), lowerLayer, redo, reason: t.reason }
}

for (let round = 1; round <= policy.buildArchitectMaxRounds; round++) {
  phase('Architect')
  const last = round === policy.buildArchitectMaxRounds
  const record = { round, ran: [], passed: [], failed: [], flaky: [], routes: [] }
  S.independent.rounds.push(record)
  const runnable = [...files.values()].filter((f) => stageOf(f) === 'build')
  const rewrite = []
  const toRun = []
  for (const f of runnable) {
    const ids = testIds(f.content)
    const stray = ids.filter((id) => !allowed.has(id))
    if (!exempt.has(f.path) && (!ids.length || stray.length)) {
      const reason = ids.length ? `its tests name ${stray.join(', ')}, which task ${A.task.id} does not` : 'no test in it carries a name the convention reads'
      record.routes.push({ path: f.path, route: 'rewrite-test', by: 'code', reason })
      rewrite.push({ path: f.path, reason, content: f.content })
    } else toRun.push(f)
  }
  if (toRun.length) {
    const ran = await agent(runPrompt(toRun), { label: `run a${round}`, phase: 'Architect', schema: RUN_SCHEMA })
    if (!ran) {
      return finish('agent-died', `the runner of architect round ${round} returned nothing, so the test-builder's files may be left under ${I.dir}: remove them before any fix`)
    }
    if (ran.status.trim()) return finish('not-independent', `the runner of architect round ${round} left the test-builder's files in the worktree: ${ran.status.trim()}`)
    // The environment reaches the fixer, so it is built from values code accepts, never the runner's words.
    env.platform = PLATFORM.test(ran.platform.trim()) ? ran.platform.trim() : 'unknown'
    env.node = NODE_VERSION.test(ran.node.trim()) ? ran.node.trim() : 'unknown'
    const resultOf = (f) => ran.results.find((r) => normalise(r.path) === f.path) || { attempts: [] }
    for (const f of toRun) {
      record.ran.push(f.path)
      const attempts = resultOf(f).attempts
      if (attempts[0] && attempts[0].passed) record.passed.push(f.path)
      else if (attempts[1] && attempts[1].passed) record.flaky.push(f.path)
      else record.failed.push(f.path)
    }
    const failing = toRun.filter((f) => !record.passed.includes(f.path))
    const triaged = await pipeline(
      failing,
      (f) => agent(architectPrompt(f, resultOf(f)), { label: `architect a${round}: ${f.path}`, phase: 'Architect', schema: TRIAGE_SCHEMA }),
      (t, f) => triage(t, f),
    )
    record.routes.push(...triaged.filter(Boolean))
  }
  log(`Architect round ${round}: ${record.ran.length} run, ${record.passed.length} passed, ${record.failed.length} failed, ${record.flaky.length} flaky, ${rewrite.length} sent back unrun`)
  if (!record.routes.length) return finish(reviewEnd[0], `${reviewEnd[1]}; the ${record.passed.length} test-builder file(s) run here passed`)

  const redesigns = record.routes.filter((t) => t.route === 're-design')
  if (redesigns.length) {
    const n = policy.buildReviewSkeptics.blocker
    const judged = await pipeline(
      redesigns,
      (t) =>
        parallel(
          Array.from({ length: n }, (_, i) => () =>
            agent(redesignPrompt(t, files.get(t.path).content, i + 1, n), { label: `redesign ${i + 1}/${n} a${round}: ${t.path}`, phase: 'Architect', schema: VERDICT_SCHEMA }),
          ),
        ),
      (votes, t) => Object.assign(t, { outcome: tally(t, votes).outcome, skeptics: n }),
    )
    const confirmed = judged.filter((t) => t && t.outcome === 'confirmed')
    if (confirmed.length) {
      return finish('re-design', `architect round ${round}: ${n} skeptics confirmed a re-design pass for ${confirmed.map((t) => `${t.id} (${t.path})`).join(', ')}; nothing was fixed after it`)
    }
  }
  const fixes = record.routes.filter((t) => t.route === 'fix-app')
  rewrite.push(...record.routes.filter((t) => t.route === 'rewrite-test' && t.by !== 'code').map((t) => ({ path: t.path, reason: t.redo, content: files.get(t.path).content })))
  if (last || (!fixes.length && !rewrite.length)) break

  if (fixes.length) {
    const fix = await agent(architectFixPrompt(fixes, `${env.platform}, Node ${env.node}`), { label: `fix a${round}`, phase: 'Architect', schema: WORK_SCHEMA })
    if (!fix) return finish('agent-died', `the fixer of architect round ${round} returned nothing, so ${fixes.length} failure(s) are unfixed`)
    S.lastFix = work(fix)
    S.fixUnreviewed = true
    const intruded = intrudes(fix.filesChanged, `the fixer of architect round ${round}`)
    if (intruded) return finish('not-independent', intruded)
    const fixToConfirm = route(fix.findings.map((f) => ({ ...f, raisedBy: [`fix a${round}`] })), newRound(`a${round}`, [`fix a${round}`]), round, 'fix')
    if (fixToConfirm.length) {
      const fixSpec = confirmedSpec(await judge(fixToConfirm, S.rounds[S.rounds.length - 1], round))
      if (fixSpec.length) return finish('spec-contradiction', `the fix of architect round ${round} found ${fixSpec.length} spec contradiction(s) the skeptics confirmed: ${titles(fixSpec)}`)
    }
    const fixFailing = fix.proofs.filter((p) => !p.passed)
    if (fixFailing.length) return finish('proof-failing', `after the fix of architect round ${round}, the proof(s) ${fixFailing.map((p) => p.command).join(', ')} did not pass`)
  }

  if (rewrite.length) {
    const again = await agent(testBuilderPrompt(rewrite), { label: `${TEST_BUILDER} a${round}`, phase: 'Architect', schema: TESTS_SCHEMA, agentType: TEST_BUILDER })
    if (!again) return finish('agent-died', `the test-builder of architect round ${round} returned nothing, so ${rewrite.length} test(s) were not rewritten`)
    const bad = misplaced(again.files)
    if (bad) return finish('not-independent', bad)
    for (const f of again.files) files.set(f.path, f)
    S.independent.files = [...files.values()].filter((f) => !f.earlier)
    S.independent.complete = again.complete
    S.independent.e2e = S.independent.files.filter((f) => stageOf(f) === 'verify').map((f) => f.path)
  }
}

const lastRound = S.independent.rounds[S.independent.rounds.length - 1]
return finish(
  'architect-failing',
  `at architect round ${lastRound.round} of at most ${policy.buildArchitectMaxRounds}, ${lastRound.failed.length + lastRound.flaky.length} test-builder file(s) still fail and ${lastRound.routes.filter((t) => t.by === 'code').length} were sent back unrun: ${lastRound.routes.map((t) => `${t.path} (${t.route === 're-design' ? `re-design, ${t.outcome || 'unjudged'}` : t.route || 'untriaged'})`).join(', ')}`,
)
