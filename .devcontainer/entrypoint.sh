#!/usr/bin/env bash
# The three setup steps that cannot be image layers, because each one reads the repository and the
# repository is a bind mount that does not exist at build time:
#
#   1. `npm ci`                   -- node_modules holds native binaries, so it belongs to the
#                                    container's platform, not the host's. This is also why
#                                    README.md tells people never to share a clone between Windows
#                                    and WSL.
#   2. the git hooks              -- the five `hook.asdlc-*` entries in the repository's config,
#                                    which run scripts/git-hooks.mjs at each event.
#   3. the beads issue database   -- a Dolt DB under .beads/embeddeddolt/, not in git.
#
# ...a warning when the image's tools lag `mise.toml`, since it installs none, and a warning when Vale
# cannot load `.vale.ini`. Its styles are what `vale sync` downloads into the
# repository, once, and a person runs it (.devcontainer/README.md): this script does not...
#
# ...and the wiring for the credential mounts declared in devcontainer.json, which is here for the
# same reason: it depends on what those mounts actually brought in, which is a fact about the host
# and unknown at build time.
#
# ...and the two Claude Code plugins .claude/settings.json enables, beads@beads-marketplace and
# vale@agent-tools, for both reasons: the marketplaces they come from are registered in the mounted
# ~/.claude, and a project-scope install record names the clone's path, a bind mount.
#
# Wired to ENTRYPOINT by the Dockerfile so that devcontainer.json needs no lifecycle command. Runs
# on every container start, which is why every step below is idempotent and cheap when there is
# nothing to do.
#
# Nothing here is allowed to fail the container. This is the process that starts the shell you would
# use to fix a setup problem; exiting non-zero would lock you out of it. Every step warns and
# carries on.

set -uo pipefail

log() { printf '\033[36m[devcontainer]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[devcontainer]\033[0m %s\n' "$*"; }

# The clone, once setup() has found it; plugins() installs into it.
workspace=''

setup() {
  local repo="${REPO_WORKSPACE:-}"

  # Which mounted directory is this repository? Named by package.json rather than by path, because
  # the mount point is the clone's directory name and people clone into whatever they like. The
  # marker is package.json's "name", "asdlc-openspec": a rename there is a rename here. Until
  # 2026-09-25 this matched the placeholder "<package-name>", which no package.json carried, so
  # every container skipped setup with a warning that read like a mount problem (asdlc-openspec-opg).
  if [ -z "$repo" ]; then
    local candidate
    for candidate in /workspaces/*/; do
      if grep -Eqs '"name"[[:space:]]*:[[:space:]]*"asdlc-openspec"' "${candidate}package.json"; then
        repo="${candidate%/}"
        break
      fi
    done
  fi

  if [ -z "$repo" ] || [ ! -d "$repo" ]; then
    warn 'workspace not found; skipping setup (set REPO_WORKSPACE if it is mounted elsewhere)'
    return 0
  fi

  cd "$repo" || return 0
  workspace="$repo"

  # The image installed the toolchain from `mise.toml` and `mise.lock` when it was built (the
  # Dockerfile), so a pin moved since then is missing here, and mise would install it over the
  # network at its first use. Say so, and install nothing: a rebuild is the fix.
  if command -v mise >/dev/null 2>&1 && [ -n "$(mise ls --current --missing --no-header 2>/dev/null)" ]; then
    warn 'a tool mise.toml pins is missing from this image -- rebuild the container (`mise ls --missing` names it)'
  fi

  # `npm ci`, but only when it would change something. The marker records the lockfile hash the
  # current node_modules was installed from, so a rebuild after a dependency bump reinstalls, and an
  # ordinary container restart costs one checksum. `ci` and not `install`: package-lock.json is
  # authoritative and CI installs the same way.
  local marker='node_modules/.devcontainer-lock-hash'
  local want have
  want="$(sha256sum package-lock.json 2>/dev/null | cut -d' ' -f1)"
  have="$(cat "$marker" 2>/dev/null)"
  if [ -n "$want" ] && [ "$want" != "$have" ]; then
    log 'npm ci'
    if npm ci; then
      printf '%s' "$want" >"$marker"
    else
      warn 'npm ci failed -- fix the cause and run it again yourself'
    fi
  fi

  # The git hooks (docs/decisions.md § D-19). `npm ci` above runs this install through
  # package.json's `prepare`; it runs again here because a start that skipped `npm ci` would
  # otherwise leave a clone with no hooks. `bd hooks install` is not run: the tracker's jobs in
  # git-hooks.yml are its git integration, and a section bd wrote into .git/hooks would run bd a
  # second time after them (docs/decisions.md § D-22).
  if [ -f scripts/git-hooks.mjs ]; then
    node scripts/git-hooks.mjs --install >/dev/null 2>&1 \
      || warn 'installing the git hooks failed -- run `mise run hooks:install` to see why'
  fi

  # The Dolt remote is already configured in .beads/config.yaml (refs/dolt/data on the GitHub
  # remote), so hydrating needs credentials for that remote. Until `gh auth login` has been run it
  # cannot work, which is a hint and not an error. Never `bd init` -- that creates a new tracker
  # rather than joining this one.
  if [ ! -d .beads/embeddeddolt ]; then
    log 'hydrating the beads issue database'
    bd bootstrap >/dev/null 2>&1 \
      || warn 'bd bootstrap failed -- run `gh auth login`, then `bd bootstrap` (never `bd init`)'
  fi

  # Vale's styles are downloaded into the clone by `vale sync`, which needs the network, so this
  # warns rather than runs it. Without them the vale@agent-tools hook answers every edit with E201,
  # which reads like a check that ran; `vale ls-config` fails the same way, and names no path here.
  if command -v vale >/dev/null 2>&1 && [ -f .vale.ini ] && ! vale ls-config >/dev/null 2>&1; then
    warn 'Vale cannot load .vale.ini, so no prose is checked -- run `vale sync` once (it needs the network)'
  fi

}

# The mounts declared in devcontainer.json carry your host logins in; this makes them usable. Each
# check exists because the corresponding failure is silent and looks like something else.
credentials() {
  # A bind mount whose source does not exist on the host is created by the daemon as an empty
  # root-owned directory, and the tool that owns it then fails on a write it should have been able
  # to make. `vscode` has passwordless sudo in this base image.
  local path
  for path in "$HOME/.claude" "$HOME/.config/gh"; do
    if [ -d "$path" ] && [ ! -w "$path" ]; then
      warn "taking ownership of $path (it arrived root-owned, so the host path was missing)"
      sudo chown -R "$(id -u):$(id -g)" "$path" 2>/dev/null || warn "chown $path failed"
    fi
  done

  # Same cause, worse symptom: Claude Code reads ~/.claude.json as a file, and a directory there is
  # a parse error rather than a missing login.
  if [ -d "$HOME/.claude.json" ]; then
    warn '~/.claude.json is a directory -- your host has no ~/.claude.json for the mount to bind.'
    warn 'Run `claude` once on the host, or drop that mount from .devcontainer/devcontainer.json.'
  fi

  # Teaches git to use gh's token, which is what makes `git push` and `gh pr create --base main` work
  # over https without a second credential. Idempotent; writes the container's own ~/.gitconfig,
  # which is why that file is deliberately NOT mounted from the host.
  if gh auth status >/dev/null 2>&1; then
    gh auth setup-git >/dev/null 2>&1 || warn 'gh auth setup-git failed'
  else
    warn 'gh is not authenticated -- run `gh auth login`, or see the ~/.config/gh mount in devcontainer.json'
  fi

  # ~/.gitconfig is container-local for the reason given above, so an identity set on the host does
  # not reach here, and a commit made without one is a commit nobody can attribute.
  if [ -z "$(git config --global user.email)" ]; then
    warn 'git identity unset: git config --global user.name "..." && git config --global user.email "you@example.com"'
  fi
}

# The two plugins .claude/settings.json enables. A plugin loads only when its marketplace is
# registered *and* Claude Code holds an install record for it: on 2026-10-03 a host with the beads
# marketplace registered and no record loaded none of the plugin's hooks, skills or agent, and only
# /plugin said so (asdlc-openspec-7us). The image registers both marketplaces, but the mounted
# ~/.claude hides that copy, and the record a project-scope install writes names the clone's path,
# which the image never sees: so both are checked here against what ~/.claude holds, the record
# against this clone's path. It runs after credentials(), which makes ~/.claude writable, and with
# `bd` on PATH, which the beads plugin's hook runs (`bd prime`). No `-y`, so that an install that
# would run a command it displays is left to a person. That `claude plugin install` without `-y` and
# without a terminal refuses such an install is NOT VERIFIED: the lane that wrote this function
# (asdlc-openspec-7us) ran it against a stub `claude`, never a real one, and built no container.
# asdlc-openspec-xw8z carries the check, in a built container with the host's ~/.claude mounted.
plugins() {
  if [ -z "$workspace" ] || ! cd "$workspace" 2>/dev/null; then
    return 0
  fi
  # Listed once each, so a start with everything in place costs two calls. plugin() reads both.
  local markets installed
  markets="$(claude plugin marketplace list --json 2>/dev/null)"
  installed="$(claude plugin list --json 2>/dev/null)"
  plugin beads-marketplace gastownhall/beads beads@beads-marketplace
  plugin agent-tools vale-cli/agent-tools vale@agent-tools
}

# plugin <marketplace> <its source> <plugin id>: register the marketplace when ~/.claude lacks it,
# then install the plugin at project scope when no record names this clone.
#
# The `--json` fields read below, a marketplace's `.name` and an installed plugin's `.id`, `.scope`
# and `.projectPath`, are NOT VERIFIED against a real `claude` either, for the same reason, and only
# `projectPath` has a source, Claude Code's plugin commands reference (§ plugin list), which
# asdlc-openspec-xw8z cites. A field misnamed reads as absent, so each start would add the
# marketplace again or reinstall the plugin and log it, which xw8z's second start would show.
plugin() {
  local market="$1" source="$2" id="$3"
  if ! printf '%s' "$markets" | jq -e --arg m "$market" 'any(.[]; .name == $m)' >/dev/null 2>&1; then
    if ! claude plugin marketplace add "$source" >/dev/null 2>&1; then
      warn "could not add the $market plugin marketplace -- \`claude plugin marketplace add $source\`"
      return 0
    fi
  fi
  if ! printf '%s' "$installed" | jq -e --arg id "$id" --arg path "$PWD" \
    'any(.[]; .id == $id and .scope == "project" and .projectPath == $path)' >/dev/null 2>&1; then
    log "installing the $id plugin for this clone"
    claude plugin install "$id" --scope project >/dev/null 2>&1 \
      || warn "could not install the $id plugin -- run \`claude plugin install $id --scope project\` in $PWD"
  fi
}

setup || true
credentials || true
plugins || true

# Last, so that anything above it reads as a warning about a container that is otherwise ready.
log 'ready: bd ready | mise run gates | claude'

exec "$@"
