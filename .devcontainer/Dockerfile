# The whole "new machine setup" of README.md, baked into an image.
#
# Everything a person would otherwise do by hand -- the toolchain `mise.toml` pins (Node, Python,
# `bd`, `gh` and Vale), Claude Code and the tracker's plugin marketplace -- is a layer here rather
# than a devcontainer.json `feature` or `postCreateCommand`. That is deliberate: features resolve at
# container-create time over the network and fail differently on every machine, and a
# `postCreateCommand` re-runs on every rebuild. A layer is built once, cached, and identical for
# everyone. devcontainer.json next to this file does little but point at it.
#
# The only steps NOT in a layer are the three that need the repository itself, which is a bind mount
# that does not exist at build time: `npm ci`, the git hooks, and hydrating the issue database.
# Those live in entrypoint.sh, which this file copies in and wires to ENTRYPOINT -- so the setup is
# still owned by the image, and devcontainer.json still has no lifecycle command in it.
#
# Versions are the base tag below, and `mise.toml`, whose every tool installs here through
# `mise.lock` (docs/decisions.md § D-31); this file states no tool's version. The build context is
# the repository's root, so the image can read those two files, and `Dockerfile.dockerignore` beside
# this file admits them and the entrypoint and nothing else. After a pin moves, rebuild: entrypoint.sh
# warns while the image's tools lag `mise.toml`.

# The base image's major version, on its Ubuntu 24.04 codename tag. `3-noble` takes every 3.x
# release devcontainers/images publishes and never crosses a major. The codename form is the tag that
# image's manifest builds (`${VERSION}-${VARIANT}`, in its src/base-ubuntu/manifest.json). Until
# 2026-10-01 this line named `ubuntu-24.04`, a form upstream renamed (devcontainers/images#1630), and
# that tag stayed on image 2.0.5 with Git 2.51.1, older than the 2.54 that config-based hooks need
# (asdlc-openspec-tvy). A major tag stops moving the same way when the next major ships, and nothing
# says so: `2-noble` has resolved to 2.1.8 since 3.0.0 shipped. So bump the major here by hand when a
# new one appears, after reading that release's history file in devcontainers/images for what it
# changes. List the majors with
# `curl -s https://mcr.microsoft.com/v2/devcontainers/base/tags/list | jq -r '.tags[]' | grep -E '^[0-9]+-noble$'`.
# Chosen by the maintainer on 2026-10-01 over `noble`, which crosses majors unasked, and over a pinned
# digest, which never moves until bumped. Read 3 there that day: image 3.0.8, Git 2.55.0.
FROM mcr.microsoft.com/devcontainers/base:3-noble

ENV DEBIAN_FRONTEND=noninteractive

# Observed on bd 1.2.2, and not re-measured on the release `mise.toml` now pins: bd sniffs terminal
# capability by writing OSC 11 to the tty and exiting without reading the reply; the terminal's answer
# lands in the shell's input queue and is executed as if typed (`11: command not found`). NO_COLOR
# makes it skip the probe entirely. Same reason as the NO_COLOR on every bd job in git-hooks.yml --
# CI=1 and BD_NO_COLOR=1 do not work.
ENV NO_COLOR=1

# --- base packages ------------------------------------------------------------------------------
# build-essential: some npm dependencies still compile on install. curl: the Claude Code installer
# below.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
        gnupg \
        jq \
        less \
        unzip \
    && rm -rf /var/lib/apt/lists/*

# --- mise ---------------------------------------------------------------------------------------
# mise itself, at the release every workflow's `jdx/mise-action` pins, which `npm run
# check:toolchain` holds equal to this tag, copied from mise's own image as its documentation does.
# The digest pins the image as the workflows' `sha256` pins their binary: a tag can be moved to
# another image, and a digest cannot. Read on 2026-10-03 from ghcr.io's manifest for the tag; when
# the tag moves, read the new one with `docker buildx imagetools inspect ghcr.io/jdx/mise:<tag>`.
COPY --from=ghcr.io/jdx/mise:2026.10.0@sha256:5253aad873240675097e6229786dff87d54a9ac9d52917e42903de37511f74b3 /usr/local/bin/mise /usr/local/bin/mise

# --- git configuration --------------------------------------------------------------------------
# The workspace is a bind mount owned by the host user, whose uid rarely matches the container's;
# without safe.directory git calls the whole repository untrusted and every hook fails.
# core.autocrlf input backs .gitattributes' `eol=lf` -- scripts/*.sh must stay LF or bash dies on
# an invisible carriage return.
RUN git config --system --add safe.directory '*' \
    && git config --system core.autocrlf input

# --- workspace setup, deferred to container start ------------------------------------------------
# npm ci, the git hooks and the issue database all read files that arrive only when the workspace is
# mounted, so they cannot be layers. ENTRYPOINT is how they stay in the image anyway: the
# devcontainer CLI replaces the container's *command* with a sleep, and leaves the image's
# entrypoint alone.
COPY .devcontainer/entrypoint.sh /usr/local/bin/workspace-entrypoint
RUN chmod 0755 /usr/local/bin/workspace-entrypoint

USER vscode

# --- the toolchain `mise.toml` pins ---------------------------------------------------------------
# Every tool, as the user the container runs as, each verified against `mise.lock`: `--locked`
# refuses a tool the lock does not cover for this platform. They install under that user's home,
# which no mount covers (devcontainer.json mounts only `~/.claude`, `~/.claude.json` and
# `~/.config/gh`).
#
# The shims go on PATH through ENV, not `mise activate`, which is a shell function, as nvm is: it
# exists only in an interactive shell, and every hook, the ENTRYPOINT and `docker exec` would miss
# it. A shim takes its version from the `mise.toml` above the directory it runs in, and only a
# trusted one: devcontainer.json trusts the clone's own folder through MISE_TRUSTED_CONFIG_PATHS,
# since nothing can answer a shim's prompt to trust it, and nothing wider, so a repository cloned
# beside it under /workspaces is not trusted unasked.
#
# No global default is set, so a bare `node` in a directory with no `mise.toml` above it fails and
# says "No version is set for shim: node" (asdlc-openspec-8juz.1, question 6). Every gate runs from
# the clone, and a shim hands the real tool directories to what it starts, so no gate meets that; a
# global default would be a second home for the pin.
ENV PATH="/home/vscode/.local/share/mise/shims:/home/vscode/.local/bin:${PATH}"
# `.mise/locks/` beside them: a `pypi:` tool's locked install reads its uv lock there (D-35).
COPY --chown=vscode:vscode mise.toml mise.lock /tmp/toolchain/
COPY --chown=vscode:vscode .mise/locks /tmp/toolchain/.mise/locks
RUN MISE_TRUSTED_CONFIG_PATHS=/tmp/toolchain mise -C /tmp/toolchain install --locked \
    && MISE_TRUSTED_CONFIG_PATHS=/tmp/toolchain mise -C /tmp/toolchain exec -- \
        sh -c 'node -v && npm -v && python --version && vale --version && bd --version && gh --version && uv --version && GRAPHIFY_NO_AUTO_REFRESH=1 graphify --version' \
    && rm -rf /tmp/toolchain

# --- Claude Code ---------------------------------------------------------------------------------
# Deliberately unpinned: it updates itself, so a pin here would only ever be stale. Its own installer,
# into the user's home, rather than a global npm package, which lives inside one Node install and
# would vanish when `mise.toml` moves the Node pin.
RUN curl -fsSL https://claude.ai/install.sh | bash \
    && claude --version

# .claude/settings.json (committed) enables `beads@beads-marketplace`, but the marketplace itself is
# a per-user registration, and without it the beads skills do not show up. Non-fatal, and
# belt-and-braces: an image build that cannot reach GitHub should still produce a working container,
# and devcontainer.json's ~/.claude mount hides this copy whenever it is present. entrypoint.sh asks
# `claude plugin marketplace list` at start and adds it if whatever ended up at ~/.claude does not
# have it.
RUN claude plugin marketplace add gastownhall/beads || true

ENTRYPOINT ["/usr/local/bin/workspace-entrypoint"]
CMD ["sleep", "infinity"]
