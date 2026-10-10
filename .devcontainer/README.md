# `.devcontainer/` — the whole machine setup, as an image

**The "new machine setup" half of the root `README.md`, baked into a container that works in a clone
of its own, in which an agent session acts as the agents' GitHub App and holds none of your
logins, and no credential of yours but the TypeSafe key you choose to pass in.** With Docker and the
Dev Containers CLI (`npm install -g @devcontainers/cli`), the prerequisites are a clone, for the
configuration, and the App's key (§ Giving it the App's key):

```bash
git clone https://github.com/<owner>/<repository>.git
devcontainer up --workspace-folder <repository>
devcontainer exec --workspace-folder <repository> claude
```

A clone that already has a container from before the container worked in a clone of its own
(`docs/decisions.md` § D-54) starts it again with `--remove-existing-container`: `devcontainer up`
starts an existing container as it was made, with the mounts of the `devcontainer.json` it was made
from. One made before D-54 still bind-mounts the folder, with every harm § The container's clone
names. One made before agents acted as the App (§ D-51) also bind-mounts your `~/.config/gh`,
`~/.claude` and `~/.claude.json`, and `gh` in it reads your login, as a container of 2026-09-25 did
after that change merged.
`docker ps -a --filter label=devcontainer.local_folder=<the clone's absolute path>` shows a clone's
container, stopped or running, and when it was made: `devcontainer up` starts a stopped one too.
When in doubt, pass `--remove-existing-container`. It rebuilds the container, which discards its
`~/.gitconfig` and its kept token, both of which the next start sets again; the clone and Claude
Code's state are in volumes, and stay. A container made since the App keeps Claude Code's state in
its volume. One made before it kept that state in your host's `~/.claude`, so its new volume starts
empty and asks for a login.

## The container's clone

The container works in a clone of its own, in a volume, `workspace-<id>`, one per folder given to
the CLI, and mounts no host checkout: `devcontainer.json` sets `workspaceMount` empty
(`docs/decisions.md` § D-54). Until then the CLI bind-mounted that folder, `.git` and `.beads/`
included. Through that mount, on 2026-10-06, a container started on the primary checkout:

- unregistered every worktree under `.claude/worktrees/` (`asdlc-openspec-486e`);
- corrupted the tracker's database, which it and the host wrote at once, since Docker's mount
  carries neither side's lock to the other (`asdlc-openspec-9a2a`).

Code a session wrote there was also code the host then ran (`asdlc-openspec-3901`). Now the folder
given to the CLI supplies only this configuration and the build's context, so any clone will do,
the one your sessions on the host use included. The build reads that folder's `mise.toml` and locks,
so build from one near `main`: the entrypoint warns when the image lacks a tool the clone's
`mise.toml` pins.

- **The first start clones `main`** from GitHub over HTTPS with no token, since the repository is
  public. The entrypoint takes the address from `githubAppRepositoryOwner` and
  `githubAppTokenRepository` in the copy of `tools/policy/tool-settings.json` that the image carries.
  Later starts leave the clone as it is: a session pulls.
- **Work goes in and out through GitHub.** A session pushes its branch as the App, and you pull it
  on the host. An edit you make on the host reaches a session only once you push it and the session
  pulls. `devcontainer exec --workspace-folder <clone> bash` opens a shell in the container's clone.
  A VS Code attach brings your logins in while it is attached (§ Start it without VS Code).
- **The volume holds the only copy of what a session has not pushed.** `docker volume rm` on it, or
  a reset of Docker or Rancher Desktop, deletes it.
- **The tracker's database and `node_modules` are the clone's own.** The entrypoint makes them at the
  first start, and the tracker syncs with the host's through its Dolt remote, as a second machine's
  does. Two sides that change the same issue between pulls conflict. The second side's push is
  refused, and its `bd dolt pull` stops with "merge conflicts in issues require operator
  resolution", leaving its database as it was, so its tracker writes wait on a person. `CLAUDE.md`
  § The task store says what a session does with a refused push. A person recovers that side with
  `bd dolt pull --strategy theirs`, then `bd dolt push`. The pull merges, keeping every commit on
  that side, and takes the remote's version of the conflicting issue alone, so that side's change to
  it is made again afterwards. A reset of that side's `main` to the remote's discards every commit
  the remote lacks instead, as one did on 2026-10-06 to two notes another session had written
  meanwhile. Both were seen on 2026-10-06 (asdlc-openspec-vvns).

The first build takes several minutes and is cached afterwards. You get the toolchain the root
`mise.toml` pins (Node, Python, `bd`, `gh`, Vale, uv and graphify), Claude Code, and the two plugins
`.claude/settings.json` enables, `beads@beads-marketplace` and `vale@agent-tools`. The image
registers their marketplaces, and `entrypoint.sh` installs each plugin for the clone at start.

| File | What it holds |
|---|---|
| `Dockerfile` | Every tool, as a layer. The base image's major tag is at the top; every other version is in the root `mise.toml`, installed through `mise.lock` by the mise the Dockerfile copies in (`docs/decisions.md` § D-31), and graphify's dependencies through its uv lock under `.mise/locks/` (§ D-35). After a pin moves, rebuild. It also makes `git` and `gh` act as the App, through the two files below, keeps `git gc` from pruning the host's worktrees (§ The host's worktrees, seen from the container), and carries `tools/policy/tool-settings.json`, which names the repository the entrypoint clones. |
| `Dockerfile.dockerignore` | What the build may read from the repository's root, its context: `mise.toml`, `mise.lock`, the uv locks under `.mise/locks/`, `entrypoint.sh`, the two wrappers and `tools/policy/tool-settings.json`, and nothing else. |
| `devcontainer.json` | Almost nothing: a pointer at the Dockerfile and its context, the `remoteUser`, and no workspace mount. It mounts the App's key read-only, a volume for Claude Code's state and one for the container's clone. Its variables name the clone, the key's directory and that volume to what runs inside, and pass your terminal's `COLORTERM` in (§ Color and the status line), and your TypeSafe key once you set it (§ TypeSafe's key). |
| `entrypoint.sh` | At the first start, the container's clone, made in its volume. Then the three setup steps that read the clone, which does not exist at build time, and the App's bot account as git's commit identity, when none is set. Where either is missing, each plugin's marketplace and its project-scope install for the clone; Langfuse's plugin at user scope, configured from a `langfuse.json` beside the App's key when the host gives one, and disabled when it does not; and the status line, when Claude Code's settings set none. It warns while a tool `mise.toml` pins is missing from the image, while Vale cannot load `.vale.ini`, and while the App cannot mint a token. |
| `gh` | `gh` as the App: ahead of mise's on PATH, it runs it with a token `scripts/github-app-token.mjs` mints, read for each command. |
| `git-credential-github-app` | git's one credential helper for `https://github.com`, which hands git's request to `scripts/github-app-token.mjs`. |
| `statusline.sh` | Claude Code's status line in the container: the project, its branch, the model, the effort, the context left, the cost and the tokens. Run from the clone, so an edit needs no rebuild. |

## Why the split is where it is

**Setup goes in a layer, not in a lifecycle command.** `features` resolve over the network every
time a container is created and fail differently on every machine; a `postCreateCommand` re-runs on
every rebuild. A layer is built once and is identical for everyone. If you add a tool, pin it in
`mise.toml`, run `mise install`, then `mise lock --platform` with the platforms
`toolchainLockPlatforms` names, as the header of `mise.toml` says, and commit what they write: the
image's mise layer installs it. `entrypoint.sh` never installs a tool
itself; it warns while the image lags `mise.toml`, because a rebuild is how the container catches up.
Until then a shim installs the moved pin over the network at its first use, the entrypoint's
`npm ci` among them, and `mise run` installs every missing pin before any task, whatever it runs.

`entrypoint.sh` holds only what cannot be an image layer: the container's clone, `npm ci` (whose
`node_modules` carries native binaries and so belongs to the container's platform), installing the
git hooks' config entries, and hydrating the Dolt issue database. It is wired to `ENTRYPOINT` so
`devcontainer.json` needs no lifecycle command, runs on every start, and is idempotent. **Nothing
in it may fail the container**: this is the process that starts the shell you would use to fix a
setup problem, so every step warns and carries on.

**Vale's styles come from the clone, not the image.** The image carries `vale`, pinned in the root
`mise.toml`. The packages `.vale.ini` names are what `vale sync` downloads into the clone, which
the image cannot see at build time; `Layout`, the one style the clone tracks, comes with it. Run
`vale sync` once in the container, for each new workspace volume: it needs the network, and the
styles land in the clone, so a rebuild keeps them. `entrypoint.sh` does not run it. It warns at
start while `vale ls-config` cannot load `.vale.ini`.

## What the container no longer shares, and why

A session in the container acts as the agents' GitHub App, which GitHub tells apart from you, and as
nobody else (`docs/decisions.md` § D-51). So `devcontainer.json` mounts none of your `~/.config/gh`,
`~/.ssh`, `~/.claude` or `~/.claude.json`, and passes no `GH_TOKEN` through:

- **Your `gh` login, or a `GH_TOKEN`**, would let a session merge past the trunk's ruleset with its
  admin bypass, approve the pull request that ruleset requires an approval on, or edit or delete the ruleset
  (`docs/decisions.md` § R-02). The App holds no bypass and no permission to do any of the three.
- **Your `~/.ssh`**, or an SSH agent, would let `git` push as you.
- **Your `~/.claude`**, mounted read-write, would let a session write a hook into your
  `settings.json` that your next session on the host runs, with your logins.
- **Your checkout**, mounted read-write, would let a session write a git hook's command, a Claude
  Code hook or a script those hooks run, which the host then runs with your logins
  (`asdlc-openspec-3901`). It also shared the host's `.git` and tracker database, the harms
  § The container's clone names. Since D-54 the container works in a clone of its own.

One credential of yours does come in, once you set it: your TypeSafe key (§ TypeSafe's key). It
reaches nothing of GitHub's. The maintainer chose on 2026-10-10 to pass the host's own key, over a
key made for the container (`docs/decisions/asdlc-openspec-llbi.md` § Decision).

What the container keeps of its own:

- **Claude Code's state** lives in a volume of the container's own, `claude-code-<id>`, one per
  clone, with `CLAUDE_CONFIG_DIR` pointing into it, so `.claude.json` lands there too. A new volume
  starts as a copy of the image's `~/.claude`, which has both plugin marketplaces registered, and
  keeps your login, history and plugins across a rebuild. Log in once, in the container: run
  `claude` and follow its login. No session in the container has logged in yet, so that a login
  there lasts across a rebuild is not yet seen. `docker volume rm` on the volume drops it.
- **The commit identity is the App's bot account**, not yours, which does not come across. At each
  start with no `user.email` set, `entrypoint.sh` sets `user.name` to `githubAppBotLogin` and
  `user.email` to its noreply address, `<githubAppBotUserId>+<githubAppBotLogin>@users.noreply.github.com`,
  the form GitHub documents, so GitHub attributes the container's commits to the App. It leaves an
  email already set there, and a rebuild, which discards `~/.gitconfig`, gets it set again. An
  email in the clone's own `.git/config` outranks it, and the entrypoint warns of one. The commits
  carry no Verified badge, since nothing signs them.

## Giving it the App's key

The App's private key is the one credential of GitHub's the container holds. The other two are
optional: the keys of a Langfuse project of the container's own (§ Langfuse tracing), and your
TypeSafe key, which comes from your terminal and not from this directory (§ TypeSafe's key). On the
host:

1. Generate a private key on the App's settings page on GitHub. Its id and installation are
   `githubAppId` and `githubAppInstallationId` in `tools/policy/tool-settings.json`.
2. Keep it in a directory of its own, `~/.asdlc-agent-j/`, of mode 700, holding that one `.pem`
   file, of mode 600, and nothing else but the optional `langfuse.json`, outside `~/.config/gh`,
   `~/.claude` and the clone.
3. Start the container. `devcontainer.json` mounts the directory read-only at
   `/home/vscode/.github-app`. `scripts/github-app-token.mjs` refuses a directory holding no `.pem`,
   or more than one, by its reason, and `entrypoint.sh` warns at start when no token mints.

The directory must exist before the first start: Docker refuses to start a container whose bind
mount names a source that does not exist ("bind source path does not exist", tried on 2026-10-06).
Without the App's key, an empty directory starts the container, in which `git` and `gh` cannot
reach GitHub and the entrypoint says so.

A key generated afresh replaces the old file in the directory; delete the old one on GitHub, and
the next token minted is signed with the new one.

## How `git` and `gh` act as the App

`scripts/github-app-token.mjs` mints an installation token from the key, for this repository alone
(`githubAppTokenRepository`), keeps it where only its user reads it, and mints a fresh one once
fewer than `githubAppTokenRefreshSeconds` of its hour are left, so a session longer than an hour
needs no restart. Its header says what it answers.

- **`git`** asks `git-credential-github-app` for `https://github.com`, the one helper it reaches:
  the image names it in the environment's config scope, which git reads after every file, after an
  empty helper that drops each helper a config file named before it, one a VS Code attach writes
  among them. The image's system config reads `ssh://git@github.com/` and `git@github.com:` as
  HTTPS, so the tracker's Dolt remote, `git+ssh://git@github.com/...` in `.beads/config.yaml`,
  reaches GitHub through the helper too: Dolt drops the `git+` and runs `git` against
  `ssh://git@github.com/...` (`GIT_TRACE` of `bd dolt pull`, bd 1.3.0, 2026-10-06).
- **`gh`** is this directory's `gh`, ahead of mise's on PATH, which reads a token for each command and
  runs mise's `gh` with it as `GH_TOKEN`.

The App holds Actions: read, so a re-run of a review that did not complete is yours: `open-pr` § 7
hands you the command. It holds no Workflows permission, so a commit that changes
`.github/workflows/` is yours to push too (`docs/decisions.md` § D-51, which records that loss as
unchecked). Neither refusal has yet been seen from the container.

## The host's worktrees, seen from the container

It sees none. The container's clone is its own (§ The container's clone), so its `.git` holds no
record of a worktree made on the host, and nothing git does there reaches the host's records.

Until D-54 the container bind-mounted the host's checkout. Each linked worktree made on the host was
then registered under a host path the container could not see, so git there read every one as
stale. A prune there unregistered it on the host too, and git and bd stopped working in it
(asdlc-openspec-486e). The defences D-53 records for that stay:

- `scripts/prune-worktree-branches.mjs` refuses while a stale record's parent directory is missing
  too;
- `scripts/hooks/guard-git.mjs` refuses a session's `git worktree prune`;
- the image sets `gc.worktreePruneExpire` to `never`.

They matter for a container made before D-54, which keeps the bind mount until it is recreated with
`--remove-existing-container`.

## Start it without VS Code

VS Code's Dev Containers extension copies your `~/.gitconfig` into the container, shares the git
credentials you have entered on the host with it, and forwards your SSH agent when one runs
(https://code.visualstudio.com/remote/advancedcontainers/sharing-git-credentials, read 2026-10-06),
and that page names no setting, in `devcontainer.json` or anywhere, that turns any of them off. A
container VS Code attaches to therefore holds your logins while it is attached, for every process
in it. The Dev Containers CLI brought none of them in: in a container it started on 2026-10-06,
`ssh-add -l` reached no agent, and git's only helper for github.com was the App's. Start the
container an agent works in with the Dev Containers CLI, as above. Its clone is in a volume, not on
the host: reach it with `devcontainer exec`, and move work between it and your checkouts through
GitHub (§ The container's clone).

## Color and the status line

**Color comes from your terminal.** `docker exec` gives a session `TERM=xterm` and nothing else,
which Claude Code reads as 16 colors, so `devcontainer.json` passes your `COLORTERM` through
(`truecolor` in most terminals that support it), read at each `devcontainer exec`. It does not pass
`TERM`, since the image has no terminfo for many a terminal's own, `xterm-ghostty` among them. Until
2026-10-06 the image set `NO_COLOR=1` for every process, and Claude Code shows no color at all while
it is set (`asdlc-openspec-ikr3`). It is now set for `bd` alone, by an alias in the interactive
shell, for the terminal probe the Dockerfile describes. The gates and git hooks set it on their own
`bd` calls.

**The status line is `statusline.sh`.** At each start, `entrypoint.sh` sets `statusLine` in the
volume's `settings.json` to run it from the clone, but only while that file sets none. A status line
you set in the container (`/statusline`, or `statusLine` in that file) stays. To have none, set
`"statusLine": {"type": "command", "command": "true"}`, a command that prints nothing: one you
delete comes back at the next start.

## The plugins

A plugin's marketplace registration and its install record live in the volume. The image registers
both marketplaces, so a new volume starts with them, and `entrypoint.sh` installs both plugins for
the clone's path, `/workspaces/asdlc-openspec`, when no record names it. On 2026-10-06 a container
built from this directory, with Claude Code 2.1.291, logged both installs at its first start, listed
both plugins enabled at project scope, and logged no install at its second (`asdlc-openspec-owva.4`).
A container that cloned into its volume logged both installs at its first start too
(`asdlc-openspec-vvns`).

## Langfuse tracing

Sessions in the container are traced to a Langfuse project of the container's own, never to the
project your host's sessions trace to, so no container session holds a key that reads your own
traces (`docs/decisions/asdlc-openspec-ic9h.md` § Decision, item 6). Tracing is off until you give
the container that project's keys. To turn it on:

1. Create a project for the container in Langfuse Cloud, US region, and an API key pair for it.
2. Put `langfuse.json` in `~/.asdlc-agent-j/`, beside the App's key, of mode 600, holding the three
   values Langfuse's plugin takes, each a non-empty string, and nothing else:

   ```json
   {"LANGFUSE_PUBLIC_KEY": "pk-lf-...", "LANGFUSE_SECRET_KEY": "sk-lf-...", "LANGFUSE_BASE_URL": "https://us.cloud.langfuse.com"}
   ```

   `scripts/github-app-token.mjs` reads only the directory's `.pem` file, so the two sit side by side.
   The maintainer chose that on 2026-10-09 over a directory of its own. Docker refuses to start a
   container whose bind mount has no source, so a second mount would have stopped every host that
   lacked it.
3. Start the container. At each start, `entrypoint.sh`'s `tracing` step does three things:
   - it registers Langfuse's plugin marketplace, `langfuse/Claude-Observability-Plugin`, when the
     volume's `~/.claude` lacks it;
   - it installs `langfuse-observability@langfuse-observability` at user scope, when no record
     names it, and enables it when it is installed and disabled;
   - it passes the file's three values, and nothing else of the file, to
     `claude plugin configure --values-stdin`.

   It logs whether tracing is on, and prints none of the values.

With no file, or one it cannot read, the step disables the plugin when it is installed and enabled,
and logs that tracing is off. The configured values stay in the volume, so an enabled plugin would
go on tracing every session with them. A host that never gave the file has no plugin installed, and
starts as before.

Where the values land, in a container with no keychain: `configure` writes the secret key to
`~/.claude/.credentials.json`, mode 600, and the public key and the base URL to
`~/.claude/settings.json` (plugin 1.2.1, verified against the CLI, 2.1.295, by the probes of
`asdlc-openspec-ic9h.1`). They stay there when you remove `langfuse.json`, and the next start
disables the plugin. `claude plugin disable` set its `enabled` to false (verified against the CLI,
2.1.295), and whether a disabled plugin's hook stops sending is not verified against the CLI. The
plugin's hook needs `uv` or Python 3.10 or newer, which mise's shims give a session in the clone. Whether a
container's session reaches Langfuse is the check of `asdlc-openspec-ic9h.12`, a person's step: no
container has been built with the file yet.

## TypeSafe's key

Every tool that calls TypeSafe reads `TYPESAFE_API_KEY` from its environment (`tools/lib/typesafe.ts`).
In the container, `devcontainer.json`'s `remoteEnv` sets it from `DEVCONTAINER_TYPESAFE_API_KEY`, a
variable of the container's own, in the terminal that runs `devcontainer exec`. Without it, each of
those tools skips and says why, and `change-verify` runs without its clause check (`docs/decisions.md`
§ D-42). To give the container your key:

1. In the profile of the shell you run `devcontainer exec` from, after the line that sets
   `TYPESAFE_API_KEY`, copy it into the container's variable. In PowerShell:

   ```powershell
   $env:DEVCONTAINER_TYPESAFE_API_KEY = $env:TYPESAFE_API_KEY
   ```

   In a POSIX shell: `export DEVCONTAINER_TYPESAFE_API_KEY="$TYPESAFE_API_KEY"`.
2. Open a new terminal, and run `devcontainer exec` as before. A container needs no rebuild.

How it behaves:

- **It is read at each `devcontainer exec`**, from the terminal that runs it, as `COLORTERM` is
  (§ Color and the status line). So a rotated key reaches the next session.
- **A terminal without the variable starts a session with the key empty.** The CLI gives an unset
  `${localEnv:...}` as an empty string (`lookupValue` in `src/spec-common/variableSubstitution.ts`
  of the Dev Containers CLI, v0.89.0), and the client reads an empty key as none. To start a session
  with no key, run `devcontainer exec` from a terminal where `DEVCONTAINER_TYPESAFE_API_KEY` is
  unset.
- **The host shows the key while a command runs.** The CLI passes it as
  `docker exec -e TYPESAFE_API_KEY=<the key>` (`toDockerExecArgs` in
  `src/spec-shutdown/dockerUtils.ts`), so the host's process list holds it for as long as that
  session or shell runs. The metadata label the CLI writes, which `docker inspect` shows, holds the
  configuration from before substitution, so it carries `${localEnv:...}` as written and not the key
  (`getDevcontainerMetadataLabel` in `src/spec-node/imageMetadata.ts`).
- **Every process an `exec` starts holds it**, a session's commands and hooks among them, so a
  session that prints its environment prints the key.
- **It is your host's own key**, as the maintainer chose on 2026-10-10: a leak from the container is
  revoked on the key your host uses (`docs/decisions/asdlc-openspec-llbi.md` § Decision).
