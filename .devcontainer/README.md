# `.devcontainer/` — the whole machine setup, as an image

**The "new machine setup" half of the root `README.md`, baked into a container, in which an agent
session acts as the agents' GitHub App and holds none of your logins.** With Docker and the Dev
Containers CLI (`npm install -g @devcontainers/cli`), the prerequisites are the clone and the App's
key (§ Giving it the App's key):

```bash
git clone https://github.com/<owner>/<repository>.git
devcontainer up --workspace-folder <repository>
devcontainer exec --workspace-folder <repository> claude
```

A clone that already has a container, from before agents acted as the App (`docs/decisions.md`
§ D-51), starts it again with `--remove-existing-container`: `devcontainer up` starts an existing
container as it was made, with the mounts of the `devcontainer.json` it was made from. One made from
the old file still bind-mounts your `~/.config/gh`, `~/.claude` and `~/.claude.json`, and `gh` in it
reads your login, as a container of 2026-09-25 did after the change merged. `docker ps --filter
label=devcontainer.local_folder=<clone>` shows a clone's container and when it was made.

Start it on a clone of its own, with no linked worktrees, and not on the checkout your sessions on
the host use. The container bind-mounts the clone, `.git` included, so a `git switch` there switches
the host's checkout too. Worse, it cannot see the host paths the clone's worktrees live at: on
2026-10-06 a container started on the primary checkout left git with no record of any of the
worktrees under `.claude/worktrees/` (`asdlc-openspec-486e`).

The first build takes several minutes and is cached afterwards. You get the toolchain the root
`mise.toml` pins (Node, Python, `bd`, `gh`, Vale, uv and graphify), Claude Code, and the two plugins
`.claude/settings.json` enables, `beads@beads-marketplace` and `vale@agent-tools`. The image
registers their marketplaces, and `entrypoint.sh` installs each plugin for the clone at start.

| File | What it holds |
|---|---|
| `Dockerfile` | Every tool, as a layer. The base image's major tag is at the top; every other version is in the root `mise.toml`, installed through `mise.lock` by the mise the Dockerfile copies in (`docs/decisions.md` § D-31), and graphify's dependencies through its uv lock under `.mise/locks/` (§ D-35). After a pin moves, rebuild. It also makes `git` and `gh` act as the App, through the two files below, and keeps `git gc` from pruning the host's worktrees (§ The host's worktrees, seen from the container). |
| `Dockerfile.dockerignore` | What the build may read from the repository's root, its context: `mise.toml`, `mise.lock`, the uv locks under `.mise/locks/`, `entrypoint.sh` and the two wrappers, and nothing else. |
| `devcontainer.json` | Almost nothing: a pointer at the Dockerfile and its context, the `remoteUser`, the App's key mounted read-only, a volume for Claude Code's state, and the variables that name the clone, the key's directory and that volume to what runs inside. |
| `entrypoint.sh` | The three setup steps that read the repository, which is a bind mount and does not exist at build time; a warning while a tool `mise.toml` pins is missing from the image; a warning while Vale cannot load `.vale.ini`; a warning while the App cannot mint a token; the App's bot account as git's commit identity, when none is set; and, where either is missing, each plugin's marketplace and its project-scope install for the clone. |
| `gh` | `gh` as the App: ahead of mise's on PATH, it runs it with a token `scripts/github-app-token.mjs` mints, read for each command. |
| `git-credential-github-app` | git's one credential helper for `https://github.com`, which hands git's request to `scripts/github-app-token.mjs`. |

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

`entrypoint.sh` holds only what cannot be an image layer — `npm ci` (whose `node_modules` carries
native binaries and so belongs to the container's platform), installing the git
hooks' config entries, and hydrating the Dolt issue database. It is wired to `ENTRYPOINT` so `devcontainer.json`
needs no lifecycle command, runs on every start, and is idempotent. **Nothing in it may fail the
container**: this is the process that starts the shell you would use to fix a setup problem, so
every step warns and carries on.

**Vale's styles come from the clone, not the image.** The image carries `vale`, pinned in the root
`mise.toml`. The packages `.vale.ini` names are what `vale sync` downloads into the clone, which
the image cannot see at build time; `Layout`, the one style the clone tracks, comes with it. A clone
synced on the host brings its styles in through the bind
mount. Otherwise, run `vale sync` once in the container: it needs the network, and the styles land
in the clone, so a rebuild keeps them. `entrypoint.sh` does not run it. It warns at start while
`vale ls-config` cannot load `.vale.ini`.

## What the container no longer shares, and why

A session in the container acts as the agents' GitHub App, which GitHub tells apart from you, and as
nobody else (`docs/decisions.md` § D-51). So `devcontainer.json` mounts none of your `~/.config/gh`,
`~/.ssh`, `~/.claude` or `~/.claude.json`, and passes no `GH_TOKEN` through:

- **Your `gh` login, or a `GH_TOKEN`**, would let a session merge past the trunk's ruleset with its
  admin bypass, set the `pr-review` status that ruleset requires, or edit or delete the ruleset
  (`docs/decisions.md` § R-02). The App holds no bypass and no permission to do any of the three.
- **Your `~/.ssh`**, or an SSH agent, would let `git` push as you.
- **Your `~/.claude`**, mounted read-write, would let a session write a hook into your
  `settings.json` that your next session on the host runs, with your logins.

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
  identity already set, and a rebuild, which discards `~/.gitconfig`, gets it set again. The
  commits carry no Verified badge, since nothing signs them.

## Giving it the App's key

The App's private key is the one credential the container holds. On the host:

1. Generate a private key on the App's settings page on GitHub. Its id and installation are
   `githubAppId` and `githubAppInstallationId` in `tools/policy/tool-settings.json`.
2. Keep it in a directory of its own, `~/.asdlc-agent-j/`, of mode 700, holding that one `.pem`
   file, of mode 600, outside `~/.config/gh`, `~/.claude` and the clone.
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

Each linked worktree made on the host is registered under its host path, which the container cannot
see, so git in the container reads every one as stale (`git worktree list` marks it `prunable`). A
prune there unregisters it on the host too, and git and bd stop working in it (asdlc-openspec-486e).
Nothing this repository runs prunes such a record: `scripts/prune-worktree-branches.mjs` refuses
while a stale record's parent directory is missing too, and the image sets `gc.worktreePruneExpire`
to `never`, so `git gc` keeps them. So, on a clone with linked worktrees:

- **Start no container whose image lacks that setting.** `git config gc.worktreePruneExpire` in the
  container prints `never`, the value git uses. If it prints nothing, rebuild first. If it prints
  another value, a config the clone shares with the host overrides it: remove it there.
- **Never run `git worktree prune` in the container.** `scripts/hooks/guard-git.mjs` refuses one a
  Claude Code session types, and nothing refuses one you type.

Some routes stay open to a session there, and `asdlc-openspec-15gm` carries them:
`git -c gc.worktreePruneExpire=now gc`, a value in the clone's `.git/config` that outranks the
image's, a git alias, and `git worktree remove` naming a host path. **Until that issue closes, start
a container on a clone with no linked worktrees** where you can, and on one with them only with the
setting checked as above.

## Start it without VS Code

VS Code's Dev Containers extension copies your `~/.gitconfig` into the container, shares the git
credentials you have entered on the host with it, and forwards your SSH agent when one runs
(https://code.visualstudio.com/remote/advancedcontainers/sharing-git-credentials, read 2026-10-06),
and that page names no setting, in `devcontainer.json` or anywhere, that turns any of them off. A
container VS Code attaches to therefore holds your logins while it is attached, for every process
in it. The Dev Containers CLI brought none of them in: in a container it started on 2026-10-06,
`ssh-add -l` reached no agent, and git's only helper for github.com was the App's. Start the
container an agent works in with the Dev Containers CLI, as above, and edit the clone on the host,
where it is bind-mounted from.

## The plugins

A plugin's marketplace registration and its install record live in the volume. The image registers
both marketplaces, so a new volume starts with them, and `entrypoint.sh` installs both plugins for
the clone's path, `/workspaces/<name>`, when no record names it. On 2026-10-06 a container built from
this directory, with Claude Code 2.1.291, logged both installs at its first start, listed both
plugins enabled at project scope, and logged no install at its second (`asdlc-openspec-owva.4`).

The container is Linux, so the root `README.md` caveat applies: a clone used from the container
should not also be built on Windows.
