# asdlc-openspec-5yan · writing-for-agents is not adopted: the branch review's rubric takes its prohibition lever, two skills leave the model's reach, the prompt gate budgets files beside a skill, and the mattpocock-skills plugin is off here

**Recorded 2026-10-10**, carried by `asdlc-openspec-5yan`. The maintainer chose it on 2026-10-10, in
conversation, from the brief that issue holds: its option C, trimmed, with eli5 and typesafe-ai
hidden and the plugin turned off. The session chose the words, the rubric item's wording and the
split into four issues.

**Builds on / amends:** Builds on D-12, under which a prompt an edit would take past its budget is
consolidated first; on D-20 and D-30, which each decided a third party's prompt text on its own,
D-20 refusing to vendor graphify's skill and D-30 adapting OpenSpec's explore template; on D-37,
which made `.claude/agents/branch-reviewer.md` the rubric's one home; and on D-44, whose item 2
leaves a plugin's skill out of the prompts a run's analysis lists. It amends no entry.

**Decision.**

The candidate is writing-for-agents, a skill of mattpocock/skills, which the brief on
`asdlc-openspec-5yan` assessed. It is not vendored, and no plugin that carries it is enabled here.
Four pieces of work take from it what this repository lacks:

1. **The branch reviewer's context-engineering rubric gains one item: a prohibition names the act
   wanted in its place.** No item of the rubric says this today. No item about stopping points is
   added, because the rubric's item "An instruction is actionable" already asks "when to stop" and
   watches for "a step whose outcome nobody checks". `asdlc-openspec-5yan.1` carries it.
2. **The skill descriptions are pruned by the candidate's rules for pointers, and measured before
   and after.** Each description puts its leading word first, holds one trigger per branch, and
   drops what the skill's body already says. Those are the three rules of the candidate's section
   on context pointers, in the plugin's 1.2.3 build, read 2026-10-10. eli5 and typesafe-ai set `disable-model-invocation: true`, so a person starts each
   one by typing its name. human-plan stays where the model can start it. `asdlc-openspec-5yan.2`
   carries it.
3. **The prompt gate holds each markdown file beside a skill's `SKILL.md` to a budget row of its
   own.** A file that is not markdown, such as a `LICENSE`, stays uncounted.
   `asdlc-openspec-5yan.3` carries it.
4. **The `mattpocock-skills` plugin is turned off in this repository**, by
   `"mattpocock-skills@claude-plugins-official": false` under `enabledPlugins` in
   `.claude/settings.json`. A skill from it that is wanted here comes in on its
   own, as a tracked skill. `asdlc-openspec-5yan.4` carries it.

**Why.** The maintainer named three problems: prompts mislead agents, prompts keep growing, and the
skill list costs context (the brief's "Why it is open"). The brief found that most of the prompt
review's findings fall under none of the candidate's levers (its Rationale, item 1). It measured
neither the candidate's cost in tokens nor its effect on what a session writes (its Trials). So
this record takes only what the brief traced to a gap here, and puts it in homes that exist:

- The prohibition lever has no home here, and the branch review applies its rubric at every push.
- The rules for pointers need applying once, to the descriptions every session loads.
- The candidate advises moving reference text into a file beside a skill. The prompt gate counts no
  such file (the header of `scripts/check-prompts.mjs`, under WHAT IS NOT CHECKED). So that advice
  would move words out of every budget without removing them.
- The maintainer's user settings enable `mattpocock-skills@claude-plugins-official` (read
  2026-10-10, outside this repository). So the plugin loaded the candidate into the maintainer's
  sessions here from a home no tracked file holds (`CLAUDE.md` § Rules for agents live in tracked
  files, and nowhere else). The candidate's `SKILL.md` in the plugin's 1.2.3 build, read the same
  day, does not open with the line that says `CLAUDE.md` wins. No prompt review here can change its
  text (D-44 item 2). The maintainer, 2026-10-10: "I will pull skills in individually as needed
  rather than as a bundle".

The alternatives that lost:

- **Not adopting anything.** Nothing would land. But the prohibition lever and the rules for
  pointers would stay unheld, and the plugin would keep loading the candidate here.
- **Vendoring an adaptation as a skill, as D-30 did for explore.** A session that edits a prompt
  would get the levers while it drafts. But its `SKILL.md` would outgrow every skill here, every
  edit of a prompt would load it, and its advice to move text beside a skill would escape the budgets until
  item 3 lands.
- **The invocation lever alone.** It touches only the third problem.
- **A second rubric item, on stopping points**, which the brief's option C held. It restates an
  item the rubric already has.
- **Keeping the plugin on**, so that its other skills, such as grilling and tdd, stay here. Item 3
  would close the budget gap either way. But the candidate would keep reaching sessions here from a
  home no tracked file holds.

Where it loses:

- **A new skill's first draft gets no help.** Say a session writes a new skill whose draft says
  "never run X". The branch reviewer flags the line at push, so the session rewrites it in a second
  round. A vendored skill, loaded before the first draft, would have named the act wanted the first
  time. If new skills land often, those rounds cost more than the vendored skill's words.
- **The rubric item can cost words and prevent nothing.** No measure of that is defined yet. The
  brief sorted finding keys by cause with a model's judgement, which no command re-derives, and no
  row of `count-index.md` § Rates and metrics counts a cause. So a person reads the findings after
  item 1 lands (`mise run prompt-runs --only held`). If half-obeyed prohibitions keep arriving, the
  item goes.
- **A hidden skill runs only when a person remembers it.** A reply that was too dense gets no
  plain version until the maintainer types `/eli5`. A session building a feature that needs a
  model's typed judgement cannot start typesafe-ai itself, so the skill runs only when a person
  types `/typesafe-ai`.
- **The plugin's other skills go too**, because `enabledPlugins` switches a whole plugin. Grilling,
  tdd and the rest stop here until each comes in on its own.
- **Two effects are not verified against the CLI.** One is that `disable-model-invocation` keeps a
  skill's description out of a session and blocks the model's call
  (https://code.claude.com/docs/en/skills, read 2026-10-10). The other is that a project's `false`
  overrides a user's `true` in `enabledPlugins`. Items 2 and 4 each report what the CLI did.

**What changed.**

- **`docs/decisions/`:** this record.
- **Outside this tree, in the tracker:** `asdlc-openspec-5yan.1`, `.2`, `.3` and `.4` filed as
  children of `asdlc-openspec-5yan`, the third `related` to `asdlc-openspec-n164`.

**Figures.**

- 1,777 words in the candidate's `SKILL.md` at upstream commit 321658273cb1: the brief's count, by
  `wc -w` on that file with its frontmatter, which is how the header of `scripts/check-prompts.mjs`
  defines a word. This record did not re-derive it.
- 1,624 words in `.claude/skills/bead/SKILL.md`, the most of any skill at ee4f3f7:
  `node scripts/check-prompts.mjs --counts`.
