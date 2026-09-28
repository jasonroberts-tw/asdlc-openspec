# Agentic Test Strategy

**Written:** 2026-09-28, from the strategy the maintainer supplied that day, as the epic `asdlc-openspec-j09` quotes it in its design field, and adopted by `docs/decisions.md` § D-13.

This is a dated record, and the home of no rule: the register, the gates and the skills win over it, and item 17 of D-13 names the home of each rule and the issue that lands it. A rule binds from the pull request that lands its home. The text below is the strategy as supplied. Where D-13 amends it, a blockquote that opens **Amended by D-13** follows the passage it changes and names the item.

This is a test strategy for an agentic test harness. It follows a spec-driven-development workflow defined by these stages: Explore->Propose->Design->Plan->Build->Verify->Finalize

## Scope

In scope: test types, test ownership, traceability, test data, environments, the Build-internal triage loop, and the conditions under which Verify rejects a change.

Out of scope, defined elsewhere: gate definitions, waivers, and failure loops between stages (including what happens after Verify escalates to the architect).

Where "Proposal" appears in the tables below, it means proposal.md and all spec.md files for the change.

## Stages

| Stage    | Input                                                                                                                   | Output                                                                   | Purpose                                                                                                                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Explore  | Prompt                                                                                                                  | findings.md                                                              | analyze, interrogate, and research the problem space. Findings are persisted under the change-id so later stages can reference them                                                                                      |
| Propose  | Prompt, findings.md                                                                                                     | proposal.md, spec.md*                                                    | define a change to be made (keyed by 'change-id'). one or more capabilities defined in proposal.md. one spec.md per capability, defined by one or more requirements, which in turn have one or more scenarios          |
| Design   | Proposal, findings.md, additional NFRs/context                                                                          | design.md, contract artifacts                                            | Component design: scope of the change, patterns, conventions, data models, dependencies, external contracts, architecture, NFRs with IDs, and the Binding Surface. Additional NFRs/context are recorded with their source |
| Plan     | Proposal, design.md, contract artifacts                                                                                 | task list (beads)                                                        | creates the task list, mapping Scenarios and NFRs to tasks                                                                                                                                                               |
| Build    | Proposal, design.md, contract artifacts, task list                                                                      | application code, test code, traceability record                         | executes tasks                                                                                                                                                                                                           |
| Verify   | Proposal, design.md, contract artifacts, task list, traceability record, application code, test code, regression suite | verification report (test status per ID, gap analysis, verdict)          | independently re-runs all tests for the change plus the regression suite, and checks coverage obligations. If the change is rejected, escalates to the architect with the report                                        |
| Finalize | change-id, accepted verification report                                                                                 | archived change, updated living specs, updated regression suite          | the exit gate. Merges spec deltas into the living specs, retires or re-keys affected tests, and archives the change (e.g. 'Done')                                                                                        |

> **Amended by D-13, items 2 and 4.** Explore is optional, and it is the existing `explore` skill, not a seventh stage. Where an explore brief preceded a change, Propose commits it in the change's folder as `findings.md`. Propose, not Design, writes the NFRs, as spec requirements with IDs; Design refers to them by ID.

Contract artifacts produced during Design (e.g. OpenAPI, AsyncAPI, JSON Schema) are fully binding and machine-readable.

> **Amended by D-13, items 13 and 15.** Contract artifacts live in the product tree, under `apps/<app>/contracts/`. Every operation of one cites the scenario IDs it serves, and states nothing its scenarios do not.

## Definitions

### Structural constructs

System: multiple components that work in concert to perform and record operations
Component: a process-bounded program within a system
Command: an activity performed by a component that may change state
Query: an activity performed by a component that reads a Read Model without changing state
Routine: the underlying code used by components, typically classes, modules, and functions.
Read Model: a public data model supplied by a Component
Aggregate: a composed data model that encapsulates a component's transactional integrity boundary
Event: a fact that has occurred within a domain
Policy: a mapping of an Event to a Command

### Dependency categories

Infrastructure: a data or messaging technology the System runs on (database, broker, cache, blob store)
External system: a dependency the System does not own or deploy
External dependency (of a component): anything reached across the component's process boundary, i.e. another component, infrastructure, or an external system

### Specification and delivery constructs

Capability: a unit of change described in proposal.md
Requirement: a statement of required behavior within a capability's spec.md
Scenario: a concrete example of a requirement with a stable ID, classified as either a success scenario or a failure scenario (its specified outcome is a rejection or error)
NFR: a non-functional requirement with a stable ID, defined in design.md
Task: a unit of planned work in the task list, with an ID
Implementation element: a named code or configuration unit added or changed by a task, identified by path and symbol (e.g. a Routine, Command handler, Policy, Aggregate, Read Model, Event type, schema, or configuration key)
Binding Surface: the parts of the design that tests may depend on (see below)
Traceability record: a machine-readable record, per change-id, linking Scenarios, NFRs, tasks, implementation elements, tests, and test results

> **Amended by D-13, items 1, 2 and 15.** A Scenario's ID is a token in its header, `#### Scenario: [<PREFIX>-NNN] <title>`. An NFR is not defined in design.md: it is a spec requirement, `### Requirement: [NFR-<PREFIX>-NNN] <title>`, which the archive merges into the living spec like any requirement. Each app's Binding Surface is one hand-maintained file, `apps/<app>/binding-surface.md`.

### Test classifications

Happy-path test: a test asserting the specified outcome of a Scenario. For a failure scenario, this is the specified rejection or error.
Negative test: a test asserting that behavior outside the Scenario's conditions does not produce its outcome. For a success scenario, this is an invalid or disallowed input being rejected. For a failure scenario, this is a near-boundary valid input not being rejected.

## Traceability

Scenario and NFR IDs are stable for the life of the System, including after archive.

1. Every Scenario must resolve to one or more tasks.
2. Every NFR must resolve to one or more fitness functions, or to one or more tasks with at least one test referencing that NFR.
3. Every task must reference at least one Scenario or NFR.
4. Every completed task must resolve to one or more implementation elements.
5. Every implementation element added or changed by the change must resolve to at least one task. Unmapped elements are reported in the gap analysis.
6. Every operation and message in the contract artifacts must be covered by at least one contract test.
7. Every test must reference at least one Scenario, task, or NFR ID. Mutation runs are exempt and instead reference the test suite they target.
8. The traceability record stores, for each test, the version of each artifact it was generated against.

Verification must record the resulting test status against each of these identifiers in the verification report.

> **Amended by D-13, items 6 and 11.** Rule 3 binds tasks labelled `asset:product`; a plan lists every other task as exempt. A reworded Scenario header is a removal and an addition: the old ID retires and is never reused, and the new Scenario takes the next ID. A modified Scenario is a new body under the same header.

### Scenario coverage

Each Scenario must have at least one happy-path test and at least one negative test. Only functional, integration, contract, and E2E tests count toward this obligation; unit tests do not.

> **Amended by D-13, items 5, 7, 10 and 14.** A Scenario's happy-path test may declare its negative test not applicable, with the reason, and the verification report lists the declaration as an advisory item. An NFR's Scenarios owe neither test: a fitness function, or a test that references the NFR, satisfies rule 2. A Scenario no harness here can observe is proved by an automated test in a real browser, never by hand. The calculator's existing gaps sit in a ratchet baseline that may fall and never rise.

## Relationships & Responsibilities

| Construct  | Defined by              | Contains/owns                                        | Required test coverage                                                                     |
| ---------- | ----------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| System     | behavior                | Components                                           | E2E, fitness                                                                               |
| Component  | domain                  | Commands, Queries, Read Models, Aggregates, Policies | Integration, contract, fitness                                                             |
| Read Model | contract/API            | query/lookup logic                                   | contract, functional                                                                       |
| Aggregate  | transactional boundary  | State/invariants                                     | functional (invariants), integration (concurrent modification, version conflicts)          |
| Policy     | Event → Command mapping | Event listener / command dispatch                    | functional (mapping), integration (idempotency under redelivery, ordering where declared)  |
| Event      | domain                  | event data                                           | functional (construction/validation), contract (when published across a component boundary) |
| Command    | initiator + process     | Routines                                             | functional, mutation (targeting the command's handler and Routines)                        |
| Routine    | operation + structure   | Business logic/data mapping                          | unit, mutation                                                                             |

## Build Agents

app-builder: writes the application code and tests per the table below, and runs them as tasks/scenarios are completed.
test-builder: writes tests per the table below, in parallel with app-builder.
architect: orchestrates app-builder and test-builder, runs Build-time tests written by test-builder against code produced by app-builder, and re-runs the app-builder suite before Build exits.

> **Amended by D-13, item 16.** app-builder and test-builder are agents of the build workflow, `.claude/workflows/build-change-task.js`. The architect is that workflow's triage together with the session running `change-build`, which acts on the route the workflow returns. The verifier is the session running `change-verify`.

### Shared inputs

app-builder and test-builder receive the same inputs: the Proposal, design.md, contract artifacts, and the task list.

### Independence

- app-builder and test-builder operate independently. They never see each other's outputs.
- When the architect gives app-builder feedback on a failing architect-run test, the feedback is limited to: the violated Scenario or NFR ID, the expected behavior as written in the spec or design, the observed behavior, and the environment. Test source, assertion text, and stack frames from test code are never passed to app-builder.

### Binding Surface

design.md must contain a Binding Surface section. test-builder's tests may depend only on what it declares, and app-builder's code must conform to it. The Binding Surface includes at minimum:

- contract artifacts
- module/package boundaries and dependency rules that fitness functions will check
- entry points and start commands for each component
- configuration keys, environment variables, and ports
- readiness/health signals
- the test data seeding interface
- injection points for clock, randomness, and ID generation

A test that fails because it depends on something outside the Binding Surface is a test defect.

> **Amended by D-13, item 15.** The Binding Surface of each app is one hand-maintained file, `apps/<app>/binding-surface.md`, which Design edits on the change's branch. A change's design.md has a Binding Surface section naming what the change adds to that file or changes in it.

### Test ownership

| test        | Derived from                       | written-by   | run-by                             |
| ----------- | ---------------------------------- | ------------ | ---------------------------------- |
| unit        | Plan / implementation element      | app-builder  | app-builder; re-run by architect   |
| functional  | Proposal + Design                  | app-builder  | app-builder; re-run by architect   |
| integration | Design + Plan                      | app-builder  | app-builder; re-run by architect   |
| mutation    | Existing test suite                | app-builder  | app-builder; re-run by architect   |
| contract    | Contract artifacts + Proposal      | test-builder | architect                          |
| fitness     | Design (NFRs, Binding Surface)     | test-builder | architect or verifier              |
| E2E         | Proposal + Design                  | test-builder | verifier                           |

- Contract tests are written by test-builder so that the Binding Surface is never verified only by the agent that implements it. app-builder may additionally write consumer-side contract tests for dependencies it calls.
- Fitness functions execute during Build unless their declared execution environment is `verify` (e.g. heavy performance tests).
- The architect runs Build-time fitness functions and contract tests after each task closes that touches their scope, and runs the full set before Build exits.
- Failure path/error case tests must be included, satisfying the Scenario coverage rule above.
- app-builder may not delete, skip, or disable a test, or weaken its assertions, without a recorded architect decision. The architect checks the test inventory against the traceability record before Build exits.

### Architect triage loop

If a test the architect runs fails, the architect checks the test against the IDs it references: spec.md Scenarios for contract and E2E tests, design.md NFRs for fitness functions, and the Binding Surface for all of them. It then does one of three things:

| Finding                                                                                                 | Action                                                   |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| The test contradicts its referenced Scenario/NFR, or depends on something outside the Binding Surface   | instruct test-builder to rewrite/regenerate the test     |
| The test is consistent with its references and the application code is not                             | instruct app-builder to adjust its application logic    |
| Both are consistent with the text, the text is ambiguous or contradictory, or an NFR is unattainable    | initiate a re-design pass                                |
When the action is to instruct app-builder to adjust its application logic, and the defect can be observed at a lower layer than the failing test, the architect also instructs app-builder to add the lowest-layer test that reproduces it (see Test Pyramid: Agent responsibilities). The instruction describes the defect only by Scenario or NFR ID and observed behavior, within the limits in Independence.
### Re-design passes

- A re-design pass produces a new version of design.md (and contract artifacts, if affected).
- A re-design pass may not change spec.md. If a Scenario must change, the change returns to Propose.
- Tasks and tests referencing a changed or removed NFR, contract element, or Binding Surface element are reopened and regenerated. All others are retained.
- The traceability record is updated with the new artifact versions.

> **Amended by D-13, item 3.** An NFR is a spec requirement, so a re-design pass may not change an NFR either: if one must change, the change returns to Propose, as it does for a Scenario.

## Build exit criteria

Build is complete when all of the following hold:

1. All Plan tasks are closed, each closed task references its implementation element(s), and every implementation element changed in the change resolves to a task.
2. test-builder has declared test generation complete: every contract, fitness, and E2E test is generated and references its Scenario, task, or NFR ID.
3. The architect has re-run the app-builder suite and it passes, and the test inventory shows no unrecorded deletions, skips, or weakened assertions.
4. Mutation score for changed Commands and Routines meets the threshold in Thresholds.
5. All blocking architect-run tests (contract, and fitness not deferred to Verify) pass.
6. No architect decisions are open (no pending test rewrites, logic adjustments, or re-design passes).

E2E tests and Verify-deferred fitness functions must be generated before Build exits, but are executed in Verify.

## Verify

Verify is executed by a verifier agent that is independent of app-builder and test-builder.

The verifier runs, in fresh environments:

- every test for the change, of every type
- E2E tests and Verify-deferred fitness functions
- the regression suite: all tests from archived changes whose referenced IDs remain valid in the living specs

The verification report contains:

- test status recorded against every Scenario, NFR, task, and contract element ID
- a gap analysis listing: Scenarios missing a happy-path or negative test, NFRs without coverage, implementation elements not resolving to a task, contract elements without contract tests, and flaky tests
- per-layer test counts and runtimes.
- a verdict

The change is rejected if any blocking test fails, any coverage obligation is unmet, or any gap analysis item is not waived under the gate definitions. On rejection, the verifier escalates to the architect with the report.

> **Amended by D-13, item 16.** On rejection, the user picks the route the change goes back by, as `.claude/skills/change-verify/SKILL.md` § 6. Verdict has it.

## Finalize and the regression suite

- Spec deltas from the change are merged into the living specs.
- Tests referencing Scenarios or NFRs removed by the change are retired in the same change.
- Tests referencing Scenarios or NFRs modified by the change must have been regenerated in the change.
- The remaining tests from the change join the regression suite.

## Test types

| Test type   | Primary boundary                         | Primary purpose                                                                                           | Default dependency strategy                                                                                                                                                                                                       |
| ----------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | Routine / internal                       | Verify isolated routine behavior                                                                          | mock/stub                                                                                                                                                                                                                         |
| Functional  | Command, Query, or Event handling / internal | Verify behavior on invocation, directly or via a Policy reacting to an Event                          | mocked/stubbed at the external dependency interface                                                                                                                                                                               |
| Mutation    | Code mutation                            | Measure whether existing tests detect injected faults                                                     | same dependency model as target test suite                                                                                                                                                                                        |
| Integration | Component boundary / cross-component     | Verify component behavior with one external dependency. A component with N external dependencies has at least one integration test per dependency | component: the currently released version run as an ephemeral instance, or the in-dev instance if it is being changed in this change. infrastructure: ephemeral instance. external system: see selection order below |
| Contract    | Component API boundary / cross-component, synchronous (APIs) and asynchronous (published Events/messages) | Verify compatibility with a published contract artifact, as provider verification or consumer check | contract/provider stub generated from the contract artifact                                                                                                                                                                        |
| E2E         | System journey / cross-component         | Verify behavior across multiple components/workflows                                                      | real component topology; external systems replaced by separate-process stubs validated against their contract artifacts                                                                                                          |
| Fitness     | Architectural property                   | Verify architectural constraints/properties                                                               | *variable*, declared per function                                                                                                                                                                                                 |
## Test Pyramid

The test suite follows a test pyramid: most tests sit at the lowest layers, where they are fast, deterministic, and precise about what failed, with fewer tests at each layer above.

| Layer    | Test types            | Relative volume | Covers                                                                          |
| -------- | --------------------- | --------------- | ------------------------------------------------------------------------------- |
| 1 (base) | unit                  | most            | Routine logic, branches, data mapping                                           |
| 2        | functional            | many            | Commands, Queries, Policies, Aggregate invariants, and Scenario variants        |
| 3        | integration, contract | fewer           | behavior that depends on one real dependency or one published contract          |
| 4 (top)  | E2E                   | fewest          | journeys that span two or more components                                       |

Mutation and fitness tests are not layers. Mutation tests measure the strength of the layers they target. Fitness functions verify architectural properties and are sized by the NFRs, not by the pyramid.

### Guiding principles

1. **Test each behavior at the lowest layer that can observe it.** A test moves up a layer only when the behavior depends on something the lower layer replaces: a real dependency, a published contract, or a second component.
2. **Don't repeat assertions across layers.** A higher-layer test may pass through behavior already tested below, but its assertions target what only that layer can observe: wiring, compatibility, or the journey outcome.
3. **Scenario variants go down, journeys go up.** A Scenario's negative tests and edge cases belong at the functional layer. E2E tests cover one success path per cross-component journey, plus failure journeys only where the failure itself crosses a component boundary (e.g. compensation, or an Event that never arrives).
4. **Layers follow the environment ratchet.** A test that needs a higher orchestration level than its layer's default is a signal that it may be at the wrong layer.

### Agent responsibilities

- app-builder builds the base. When covering a Scenario, it writes functional tests for all variants before adding integration tests.
- test-builder cannot see the lower layers, so it limits E2E tests to cross-component journeys drawn from the Proposal and never tests single-component behavior end to end.
- A defect first caught at a higher layer indicates a missing lower-layer test. When the architect instructs app-builder to fix such a defect, it also instructs app-builder to add the lowest-layer test that reproduces it, within the feedback limits in Independence.

### Measuring the shape

- The verification report includes, per component, the test count and total runtime at each layer.
- The shape is advisory, not gated. There are no fixed ratios, because ratios invite padding the lower layers with low-value tests.
- Inversions, such as a component with more E2E tests than functional tests referencing its Scenarios, are listed in the gap analysis as advisory items.

External system selection order for integration tests:

1. the provider's sandbox, if it exists and is deterministic enough to assert against
2. a stub validated against the contract artifact
3. no integration test, with the justification recorded against the relevant NFR or Scenario in the traceability record

## Test data isolation

- Every test that reads or writes data establishes its own starting state and relies on no data from other tests.
- Test data is generated per test through the Binding Surface's seeding interface, from a seed recorded in the test results.

| Context                                                                      | Isolation mechanism                                                                                                        |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| unit, functional                                                             | in-memory fakes, created per test                                                                                          |
| integration within a single process and single transaction                   | ephemeral database-per-worker, with transactional rollback after each test                                                 |
| integration or E2E spanning multiple transactions, async processing, or multiple processes | ephemeral database-per-worker (integration) or environment-per-run (E2E), with per-test namespaced data (unique tenant/key prefix) or a reset between tests |
| messaging infrastructure                                                     | per-worker topics/queues or per-test namespaced routing, with consumers drained between tests                               |
| caches and blob stores                                                       | per-worker namespaces                                                                                                      |

## External dependency mocking

For unit, functional, and integration tests (for dependencies other than the one under test), prefer internal abstractions that mock external dependencies (i.e. an interface that can be stubbed). Only use separate-process stubs when there is a significant technical constraint.

Contract tests use the stub supplied by the contract tooling, in or out of process. E2E tests use separate-process stubs for external systems.

Every stub of an external dependency that has a contract artifact must be validated against that artifact.

## Environment orchestration rules

Follow a ratchet model, only moving up when the test requires it:

1. Test framework only
2. Framework + container(s)
3. Framework + container orchestration (docker compose or kubernetes)

Each test declares its level in its metadata. Default levels:

| Test type                    | Default level                        |
| ---------------------------- | ------------------------------------ |
| unit, functional, mutation   | 1                                    |
| integration, contract        | 2                                    |
| E2E                          | 3                                    |
| fitness                      | declared per function                |

A test that declares a level above its default must record the reason.

> **Amended by D-13, item 17.** Levels 2 and 3 are not adopted until a product needs them (`asdlc-openspec-sm3`).

## Determinism and flakiness

- Clock, randomness, and ID generation are injected through the Binding Surface and seeded per run. Seeds are recorded in the test results.
- There are no automatic retries. A test that fails and then passes on re-run is marked flaky, reported in the gap analysis, and treated as failing until triaged by the architect.

> **Amended by D-13, item 12.** The re-run is made once, by the agent that ran the failing test: the architect in Build and the verifier in Verify, never the test runner.
- Regenerated tests are recorded in the traceability record with the artifact versions they were generated against.

## Fitness Functions

Required fields:

| Field                  | Content                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| Property               | the architectural property being checked                                         |
| NFR ID(s)              | the NFR(s) this function verifies                                                |
| Measurement            | how the property is measured                                                     |
| Threshold / invariant  | the pass condition                                                               |
| Scope                  | System, component(s), or module set                                              |
| Execution environment  | `build` or `verify`, plus the orchestration level                                |
| Failure semantics      | `blocking` (fails Build/Verify) or `advisory` (reported only, never blocks)      |

Exit criteria and the Verify verdict apply only to `blocking` fitness functions. `advisory` results must still appear in the verification report.

## Thresholds

| Threshold                                       | value | Applies at    |
| ----------------------------------------------- | ----- | ------------- |
| Mutation score on changed Commands and Routines | ≥ 80% | Build, Verify |
| Line/branch coverage                            | ≥ 90% | Build, Verify |

> **Amended by D-13, items 8 and 9.** The thresholds, and a minimum sample for each rate, are keys of `tools/policy.json` once `asdlc-openspec-j09.10` lands them, and the table above is the strategy as supplied. Coverage is measured over the coverable lines and branches a branch adds or changes under `apps/`, against `origin/main`. Below a rate's minimum sample, the gate prints the counts and no rate, and fails on any surviving mutant or uncovered changed line not listed with a reason.
