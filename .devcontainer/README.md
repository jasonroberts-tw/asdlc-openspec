# `.devcontainer/` — the whole machine setup, as an image

**The "new machine setup" half of the root `README.md`, baked into a container.** With Docker, VS
Code and the Dev Containers extension, the only prerequisite is the clone:

```bash
git clone https://github.com/<owner>/<repository>.git
code <repository>           # then: "Reopen in Container" when VS Code offers
```

The first build takes several minutes and is cached afterwards. You get the toolchain the root
`mise.toml` pins (Node, Python, `bd`, `gh` and Vale), Claude Code and the tracker's plugin
marketplace.

| File | What it holds |
|---|---|
| `Dockerfile` | Every tool, as a layer. The base image's major tag is at the top; every other version is in the root `mise.toml`, installed through `mise.lock` by the mise the Dockerfile copies in (`docs/decisions.md` § D-29). After a pin moves, rebuild. |
| `Dockerfile.dockerignore` | What the build may read from the repository's root, its context: `mise.toml`, `mise.lock` and `entrypoint.sh`, and nothing else. |
| `devcontainer.json` | Almost nothing: a pointer at the Dockerfile and its context, the `remoteUser`, three bind mounts, one passthrough env var, and the one folder whose `mise.toml` mise trusts, the workspace's own. |
| `entrypoint.sh` | The three setup steps that read the repository, which is a bind mount and does not exist at build time; a warning while a tool `mise.toml` pins is missing from the image; and a warning while Vale cannot load `.vale.ini`. |

## Why the split is where it is

**Setup goes in a layer, not in a lifecycle command.** `features` resolve over the network every
time a container is created and fail differently on every machine; a `postCreateCommand` re-runs on
every rebuild. A layer is built once and is identical for everyone. If you add a tool, pin it in
`mise.toml` and run `mise lock`: the image's mise layer installs it. `entrypoint.sh` never installs a
tool; it warns while the image lags `mise.toml`, because a rebuild, not the network at start, is how
the container catches up.

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

**The mounts are the one thing an image cannot bake**, because a login is yours and not the
project's. `~/.claude`, `~/.claude.json` and `~/.config/gh` are bind-mounted from the host, so:

- **Run `claude` and `gh` on the host once before you first open the container.** Docker answers a
  bind mount whose source is missing by creating it as an empty root-owned *directory*, and
  `~/.claude.json` then exists as a directory where a file belongs. `entrypoint.sh` detects both and
  says so, but the fix is on the host.
- Container sessions **share** your host's Claude Code state — history, projects, plugins. The mount
  is read-write because Claude Code rewrites `.credentials.json` on token refresh.
- On a Windows host, `gh` keeps its config in `%APPDATA%\GitHub CLI`, so that mount lands empty; set
  `GH_TOKEN` before launching VS Code and `devcontainer.json` passes it through. Your git identity
  does not come across — set `user.name` and `user.email` in the container once.

The container is Linux, so the root `README.md` caveat applies: a clone used from the container
should not also be built on Windows.
