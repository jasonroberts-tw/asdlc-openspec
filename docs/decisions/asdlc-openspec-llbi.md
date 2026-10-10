# asdlc-openspec-llbi · Dev container sessions hold the host's TypeSafe key, which `remoteEnv` takes from `DEVCONTAINER_TYPESAFE_API_KEY` at each `devcontainer exec`

**Recorded 2026-10-10**, carried by `asdlc-openspec-llbi`. The maintainer made the four choices of
the Decision that day, in a session on the primary checkout, from options put to them with the case
where the recommended one loses. They chose item 2 against the session's recommendation. The session
chose the words, and the variable's name, which it proposed and the maintainer took.

**Builds on / amends:** amends D-51, whose item 3 says no host credential reaches the container's
sessions. Builds on D-42, whose client reads the key from the environment and skips when it is
blank, and on asdlc-openspec-ic9h, whose item 6 gave the container its first credential beside the
App's key.

**Decision.**

1. **The container's sessions hold `TYPESAFE_API_KEY` as an environment variable.** The client,
   `tools/lib/typesafe.ts`, reads it as it stands, and so does a script a session writes on
   `@typesafe-ai/sdk`.
2. **The key is the host's own**, not a key made for the container. So D-51 item 3 no longer holds
   for this one credential: a host credential reaches the container's sessions once the host sets it.
3. **`remoteEnv` in `.devcontainer/devcontainer.json` carries it, from `${localEnv:...}`.** The Dev
   Containers CLI resolves it at each `devcontainer exec`, from the terminal that runs it, so a
   rotated key needs no rebuild.
4. **The host variable is `DEVCONTAINER_TYPESAFE_API_KEY`**, a name of the container's own. A host's
   key enters a container only once someone sets that name on purpose. Unset, it arrives empty, and
   each tool that calls TypeSafe skips and says why (D-42 item 3).

**Why.** Until now no container session held a key. So D-42's loss "No key, no check" held for every
one of them: `change-verify` there never ran the clause check, and the four other tools that call
TypeSafe skipped. Each item turned an alternative down:

- **A file only the client reads**, named by a `TYPESAFE_API_KEY_FILE` (item 1). A session that ran
  `env` would print the path, not the key. But the SDK reads only the environment variable
  (`node_modules/@typesafe-ai/sdk/dist/index.mjs`, 0.6.0), so a script a session wrote on it would
  find no key. And unsetting the variable, D-42's way past an outage, would make the client read the
  file, which the read-only mount keeps in place.
- **A key of the container's own** (item 2), as the App's CI key, the prompt review's Anthropic key
  and the container's Langfuse project each are (`asdlc-openspec-ic9h.9`;
  `docs/decisions/asdlc-openspec-ic9h.md` § Decision, item 6). A leak from the container would be
  revoked alone. But TypeSafe's documentation says nothing of keys, only an unofficial source showed
  one account holding several, and a host would keep a second key. The maintainer chose the host's.
- **`containerEnv`** (item 3). The key would reach every process, the entrypoint's included, from
  whatever terminal ran `devcontainer up`. But it is read once, when the container is made. So a
  rotated key, or a first `up` from a terminal without it, would need
  `--remove-existing-container`, and the value would sit in the container's environment, which
  `docker inspect` shows.
- **A file in the key directory, beside the App's key**, which the entrypoint would turn into a
  variable (item 3), as it turns `langfuse.json` into the plugin's settings. No terminal would need
  the variable. But a variable the entrypoint exports reaches no `devcontainer exec`. So the key
  would have to be written into Claude Code's settings, which a person's `devcontainer exec bash`
  does not read. It would also need an entrypoint step and selftest cases, and the host would keep
  the key in two places.
- **The host's `TYPESAFE_API_KEY` under its own name** (item 4). No host would need a second
  variable. But a host that exports the key for other work would pass it into every container it
  builds, with no one choosing to.

Where it loses:

- **A session that prints its environment prints the key** into its transcript, and from there it
  can reach a tracker note or a pull request, both public. The prompt review's model step carries
  the same loss in CI (`docs/decisions/asdlc-openspec-ic9h.md`, its Where it loses).
- **A leak from the container is revoked on the host's key.** The host's sessions then call no
  TypeSafe until the host holds a new one, and CI too if its secret is the same key, which no
  record says.
- **A terminal without `DEVCONTAINER_TYPESAFE_API_KEY` starts a session with no key**, as does a
  new machine that exports `TYPESAFE_API_KEY` alone. Each tool then skips, and only the trace and
  the pull request's body say the clause check did not run (D-42).
- **The host's process list shows the key while each `devcontainer exec` runs**, since the CLI
  passes it as `docker exec -e`.
- **Every process an `exec` starts holds the key**, a session's hooks and the gates it runs among
  them. No gate calls TypeSafe (D-42 item 2), and a session on the maintainer's host already runs
  with the key set.

**What changed.**

- **`docs/decisions/`:** this record.
- **`docs/decisions.md`:** the amendment under D-51.
- **`.devcontainer/devcontainer.json`:** `TYPESAFE_API_KEY` in `remoteEnv`, and the comments that say
  what comes in from the host.
- **`.devcontainer/README.md`:** § TypeSafe's key, new. The thesis, the `devcontainer.json` row,
  § What the container no longer shares, and why, and § Giving it the App's key name the key.
- **`README.md`:** § Dev container names the key, and gains a step that sets it.
- **No code.** `tools/lib/typesafe.ts` reads the variable, and skips on a blank one, as before.

**Figures.**

- Five tools call TypeSafe: `git grep -l "import { createJudge }" -- scripts tools` lists six files,
  of which `tools/citations/support.selftest.ts` is a selftest, at this record's commit.
- The Dev Containers CLI, v0.89.0, read 2026-10-10 in its source and in its installed bundle:
  - it gives an unset `${localEnv:...}` as an empty string (`lookupValue` in
    `src/spec-common/variableSubstitution.ts`);
  - it passes each `remoteEnv` value as `docker exec -e NAME=value` (`toDockerExecArgs` in
    `src/spec-shutdown/dockerUtils.ts`);
  - its metadata label holds the configuration from before substitution
    (`getDevcontainerMetadataLabel` in `src/spec-node/imageMetadata.ts`).
- A session on the maintainer's host runs with `TYPESAFE_API_KEY` set: read 2026-10-10 with
  `node -e`, which printed only whether it was set.
