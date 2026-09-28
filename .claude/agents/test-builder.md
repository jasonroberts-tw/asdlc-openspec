---
name: test-builder
description: Writes the contract, fitness and E2E tests for one task of a product change from the inputs `.claude/workflows/build-change-task.js` hands it as text, and returns them as data. The workflow runs it by agentType; it has no tool but its structured output, so it never reads the app-builder's code or tests.
tools: StructuredOutput
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Write the independent tests of one task

Draft for the tool spike of asdlc-openspec-j09.11; the instructions follow once the spike holds.
