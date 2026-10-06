/**
 * The agents' GitHub App tokens, for `git` and `gh` in the dev container (`docs/decisions.md`
 * § D-51). It mints an installation access token for the App `githubAppId` names, on the
 * installation `githubAppInstallationId` names (`tools/policy/tool-settings.json`), for the one
 * repository `githubAppTokenRepository` names, signing the request with the App's private key: the
 * one `.pem` file in the directory `GITHUB_APP_KEY_DIR` names, which
 * `.devcontainer/devcontainer.json` mounts read-only. It keeps the token in a file only
 * its user can read, and hands it out again until fewer than `githubAppTokenRefreshSeconds` of its
 * hour are left; then it mints a fresh one, so a session longer than the token's hour needs no
 * restart. It serves the token two ways:
 *
 *   - `token` prints it. `.devcontainer/gh` runs `gh` with it as `GH_TOKEN`, read afresh for every
 *     command, since `gh` reads no credential helper.
 *   - `git-credential get` answers git's credential protocol with it, as `x-access-token`, for
 *     `https://github.com` alone, and says nothing for any other host or protocol, so the token never
 *     goes to another host. `erase`, which git sends after GitHub refuses a credential, drops the
 *     kept token, so the next `get` mints afresh; `store` does nothing. The image makes
 *     `.devcontainer/git-credential-github-app`, which runs it, git's one helper for github.com, and
 *     rewrites `ssh://git@github.com/` and `git@github.com:` to HTTPS, so the tracker's Dolt remote,
 *     which runs `git` against an SSH address, reaches GitHub through it too.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet: it came with the container that acts as the
 * App (asdlc-openspec-owva.4). Were it wrong, a session past its first hour would be refused its next
 * push or `gh` call, which reads as a network or permission fault rather than an expired token; a
 * kept token another user could read, or one answered for another host, would hand the App's
 * identity to them; and a key directory holding two keys would sign with whichever it read first,
 * and be refused whenever that one was revoked. A token asked for with no repository reached all 8
 * the installation covered on 2026-10-06, where this one alone was meant (asdlc-openspec-t4cz). So it
 * refuses a key directory without exactly one `.pem`, a policy without its four keys, and an answer
 * from GitHub without a token and its expiry, each by its reason, and never prints the key or the
 * token in a refusal.
 *
 * INVOCATION.
 *
 *   node scripts/github-app-token.mjs token                     prints a token
 *   node scripts/github-app-token.mjs git-credential <action>   git's credential helper: get, store
 *                                                               or erase, the attributes on stdin
 *   mise run github-app-token:selftest                          its cases, over a stubbed GitHub
 *   GITHUB_APP_TOKEN_ROOT=<dir>    reads the policy of a doctored copy
 *   GITHUB_APP_API_URL=<url>       another API than https://api.github.com, the selftest's stub
 *   GITHUB_APP_TOKEN_CACHE=<file>  where the token is kept; by default
 *                                  `$XDG_CACHE_HOME/github-app-token/<installation>.json`, under
 *                                  `~/.cache` where that is unset
 *
 * NEEDS. The App's private key under `GITHUB_APP_KEY_DIR`, and GitHub's API over the network, both of
 * which the dev container gives it. Its selftest needs neither, so it is a pre-push job and a
 * `verify.yml` step: it makes a key with `node:crypto`, serves GitHub's endpoint from a stub on
 * loopback, and runs `git credential fill` and `.devcontainer/gh` through real `git` and `sh`, which
 * it skips, saying why, on Windows, where the container's wrappers never run.
 */
import { spawn } from 'node:child_process'
import { createPrivateKey, createSign, createVerify, generateKeyPairSync } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SCRATCH_GIT_ENV } from '../tools/lib/git-env.ts'
import { copyPolicy, editPolicy, readPolicy } from '../tools/lib/policy.ts'

const SELF = fileURLToPath(import.meta.url)
const REPO_ROOT = resolve(dirname(SELF), '..')
const ROOT = process.env.GITHUB_APP_TOKEN_ROOT ?? REPO_ROOT
const API = (process.env.GITHUB_APP_API_URL ?? 'https://api.github.com').replace(/\/+$/, '')
const NUMBER_KEYS = ['githubAppId', 'githubAppInstallationId', 'githubAppTokenRefreshSeconds']

// GitHub's own bounds on the JSON Web Token that asks for an installation token: `iat` set 60 s in
// the past against clock drift, and `exp` no more than ten minutes ahead, so `exp` is `iat` plus ten
// minutes (docs.github.com, "Generating a JSON Web Token (JWT) for a GitHub App", read 2026-10-06).
const JWT_BACKDATE_SECONDS = 60
const JWT_SPAN_SECONDS = 600
// The user name GitHub reads an installation token under over HTTPS ("Authenticating as a GitHub
// App installation", read 2026-10-06).
const GIT_USERNAME = 'x-access-token'

/** A refusal the command prints by its reason and exits 1 on, as opposed to a defect, which throws. */
class Refusal extends Error {}

const nowSeconds = () => Math.floor(Date.now() / 1000)

/** The four policy keys this reads: three whole numbers above 0 and a repository's bare name, or a refusal naming those that are not. */
function settings(root) {
  const policy = readPolicy(root)
  const bad = NUMBER_KEYS.filter((key) => !Number.isInteger(policy[key]) || policy[key] <= 0)
  if (bad.length > 0) {
    throw new Refusal(`${bad.map((key) => `\`${key}\``).join(', ')} must each be a whole number above 0 in tools/policy/ under ${root}`)
  }
  const repository = policy.githubAppTokenRepository
  if (typeof repository !== 'string' || !/^[\w.-]+$/.test(repository)) {
    throw new Refusal(`\`githubAppTokenRepository\` must be a repository's bare name in tools/policy/ under ${root}, not ${JSON.stringify(repository ?? null)}`)
  }
  return { appId: policy.githubAppId, installationId: policy.githubAppInstallationId, refreshSeconds: policy.githubAppTokenRefreshSeconds, repository }
}

/** The App's private key: the one `.pem` file in `GITHUB_APP_KEY_DIR`. Its contents never reach a message. */
function readKey() {
  const dir = process.env.GITHUB_APP_KEY_DIR
  if (!dir) throw new Refusal("GITHUB_APP_KEY_DIR is not set: it names the directory holding the App's private key, which .devcontainer/devcontainer.json mounts read-only")
  let names
  try {
    names = readdirSync(dir)
  } catch (error) {
    throw new Refusal(`cannot read the key directory ${dir}: ${error.code ?? error.message}`)
  }
  const pems = names.filter((name) => name.endsWith('.pem')).sort()
  if (pems.length !== 1) {
    throw new Refusal(`${dir} holds ${pems.length} .pem files${pems.length > 0 ? ` (${pems.join(', ')})` : ''}, where it must hold the App's one private key (.devcontainer/README.md)`)
  }
  const path = join(dir, pems[0])
  try {
    return createPrivateKey(readFileSync(path))
  } catch (error) {
    throw new Refusal(`${path} is not a private key Node can read: ${error.code ?? 'unreadable'}`)
  }
}

const base64url = (data) => Buffer.from(data).toString('base64url')

/** The JSON Web Token that asks GitHub for an installation token, signed RS256 as the App. */
function appJwt(key, appId) {
  const iat = nowSeconds() - JWT_BACKDATE_SECONDS
  const head = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify({ iat, exp: iat + JWT_SPAN_SECONDS, iss: appId }))
  const signature = createSign('RSA-SHA256').update(`${head}.${body}`).sign(key)
  return `${head}.${body}.${base64url(signature)}`
}

/**
 * A fresh installation token from GitHub, with the instant it expires, asked for the one repository
 * the policy names: without a body, a token reaches every repository the installation covers.
 */
async function mint({ appId, installationId, repository }) {
  const url = `${API}/app/installations/${installationId}/access_tokens`
  const headers = {
    Authorization: `Bearer ${appJwt(readKey(), appId)}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'asdlc-openspec/github-app-token',
  }
  let response
  try {
    response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ repositories: [repository] }) })
  } catch (error) {
    throw new Refusal(`could not reach ${url}: ${error.cause?.code ?? error.message}`)
  }
  const text = await response.text()
  let body = null
  try {
    body = JSON.parse(text)
  } catch {
    // An answer that is not JSON is reported by its status and its first characters, below.
  }
  if (response.status !== 201) throw new Refusal(`GitHub answered ${response.status} to ${url}: ${body?.message ?? text.slice(0, 200)}`)
  // Described, never echoed: an answer with a token and a bad expiry would print the token.
  if (typeof body?.token !== 'string' || body.token === '' || Number.isNaN(Date.parse(body?.expires_at))) {
    const tokenSays = typeof body?.token === 'string' && body.token !== '' ? 'a token' : 'no token'
    throw new Refusal(`GitHub's answer from ${url} holds no token and expiry: ${tokenSays}, and expires_at ${JSON.stringify(body?.expires_at ?? null)}`)
  }
  return { token: body.token, expiresAt: body.expires_at }
}

/** Where the token is kept. */
function keptPath(installationId) {
  if (process.env.GITHUB_APP_TOKEN_CACHE) return process.env.GITHUB_APP_TOKEN_CACHE
  return join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'github-app-token', `${installationId}.json`)
}

function readKept(path) {
  try {
    const kept = JSON.parse(readFileSync(path, 'utf8'))
    if (typeof kept?.token === 'string' && !Number.isNaN(Date.parse(kept?.expiresAt))) return kept
  } catch {
    // None kept, or one that does not parse: either way a fresh one is minted.
  }
  return null
}

/** Keeps the token in a file of mode 600, in a directory of mode 700, written whole and renamed into place. */
function keep(path, kept) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const scratch = `${path}.${process.pid}.tmp`
  rmSync(scratch, { force: true })
  writeFileSync(scratch, `${JSON.stringify(kept)}\n`, { mode: 0o600 })
  renameSync(scratch, path)
}

/** The kept token while more than the refresh margin of it is left, or else a fresh one, kept. */
async function token(config) {
  const path = keptPath(config.installationId)
  const kept = readKept(path)
  if (kept && Date.parse(kept.expiresAt) - Date.now() > config.refreshSeconds * 1000) return kept
  const fresh = await mint(config)
  keep(path, fresh)
  return fresh
}

/** Git's credential attributes, `key=value` a line, up to a blank line or the end. */
function attributes(text) {
  const found = {}
  for (const line of text.split('\n')) {
    if (line === '') break
    const at = line.indexOf('=')
    if (at > 0) found[line.slice(0, at)] = line.slice(at + 1)
  }
  return found
}

async function stdinText() {
  let text = ''
  for await (const chunk of process.stdin) text += chunk
  return text
}

/**
 * One action of git's credential protocol. Anything but `https://github.com` gets no answer and
 * reads neither the policy nor the key, so git asks no further and the token goes nowhere else.
 */
async function gitCredential(action) {
  const asked = attributes(await stdinText())
  if (asked.protocol !== 'https' || asked.host !== 'github.com') return ''
  if (action === 'get') {
    const { token: secret, expiresAt } = await token(settings(ROOT))
    return `username=${GIT_USERNAME}\npassword=${secret}\npassword_expiry_utc=${Math.floor(Date.parse(expiresAt) / 1000)}\n`
  }
  if (action === 'erase') rmSync(keptPath(settings(ROOT).installationId), { force: true })
  // `store`, and any action git adds later, which a helper is to ignore.
  return ''
}

const USAGE = 'usage: node scripts/github-app-token.mjs token | git-credential <get|store|erase> | --selftest'

async function main(argv) {
  const [command, action] = argv
  try {
    if (command === 'token' && argv.length === 1) {
      process.stdout.write(`${(await token(settings(ROOT))).token}\n`)
      return 0
    }
    if (command === 'git-credential' && action !== undefined && argv.length === 2) {
      process.stdout.write(await gitCredential(action))
      return 0
    }
  } catch (error) {
    if (!(error instanceof Refusal)) throw error
    console.error(`github-app-token: ${error.message}`)
    return 1
  }
  console.error(`github-app-token: ${USAGE}`)
  return 2
}

/* --------------------------------------------------------------------------------- selftest ----- */

/**
 * A stub of GitHub's endpoint on loopback. It records every request with the problems of its JSON
 * Web Token, checked against the public key and the App the live policy names, and answers as
 * `state.mode` says: `ok`, a token for an hour; `short`, one for a minute; `refuse`, a 401; `empty`,
 * a 201 with no token.
 */
function stubGitHub(publicKey, appId) {
  const state = { mode: 'ok', minted: 0, requests: [] }
  const server = createServer((request, response) => {
    let sent = ''
    request.on('data', (chunk) => (sent += chunk))
    request.on('end', () => {
      let repositories = null
      try {
        repositories = JSON.parse(sent).repositories ?? null
      } catch {
        // No body, or one that is not JSON: recorded as asking for no repository.
      }
      state.requests.push({ method: request.method, url: request.url, accept: request.headers.accept, repositories, problems: jwtProblems(request.headers.authorization, publicKey, appId) })
      const send = (status, body) => {
        response.writeHead(status, { 'content-type': 'application/json' })
        response.end(JSON.stringify(body))
      }
      if (state.mode === 'refuse') return send(401, { message: 'A JSON web token could not be decoded' })
      if (state.mode === 'empty') return send(201, { expires_at: new Date(Date.now() + 3600_000).toISOString() })
      if (state.mode === 'bad-expiry') return send(201, { token: 'ghs_STUB_SECRET', expires_at: 'not-a-date' })
      state.minted += 1
      const life = state.mode === 'short' ? 60_000 : 3600_000
      return send(201, { token: `ghs_stub${state.minted}`, expires_at: new Date(Date.now() + life).toISOString() })
    })
  })
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done({ server, state, url: `http://127.0.0.1:${server.address().port}` })))
}

/** What is wrong with a request's JSON Web Token, as GitHub would judge it: none, when GitHub would take it. */
function jwtProblems(authorization, publicKey, appId) {
  const match = /^Bearer ([\w-]+)\.([\w-]+)\.([\w-]+)$/.exec(authorization ?? '')
  if (!match) return [`no Bearer JSON Web Token: ${authorization}`]
  const [, head, body, signature] = match
  const problems = []
  const decode = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
  let header
  let claims
  try {
    header = decode(head)
    claims = decode(body)
  } catch (error) {
    return [`the JSON Web Token does not decode: ${error.message}`]
  }
  if (header.alg !== 'RS256') problems.push(`alg ${header.alg}, not RS256`)
  if (!createVerify('RSA-SHA256').update(`${head}.${body}`).verify(publicKey, Buffer.from(signature, 'base64url'))) problems.push("the signature is not the App key's")
  const { iat, exp, iss } = claims
  const now = nowSeconds()
  if (String(iss) !== String(appId)) problems.push(`iss ${iss}, not the App ${appId}`)
  if (!(iat <= now)) problems.push(`iat ${iat} is after now, ${now}`)
  if (!(exp > now && exp <= now + JWT_SPAN_SECONDS)) problems.push(`exp ${exp} is not within ten minutes after now, ${now}`)
  if (!(exp - iat <= JWT_SPAN_SECONDS)) problems.push(`exp - iat is ${exp - iat}, over ten minutes`)
  return problems
}

/** A child process, run without blocking the stub it talks to: its status and what it printed. */
function run(command, args, { env, input = '', cwd = REPO_ROOT }) {
  return new Promise((done) => {
    const child = spawn(command, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (data) => (stdout += data))
    child.stderr.on('data', (data) => (stderr += data))
    child.on('error', (error) => done({ status: null, stdout, stderr: `${stderr}${error.message}` }))
    child.on('close', (status) => done({ status, stdout, stderr }))
    child.stdin.end(input)
  })
}

const GITHUB = 'protocol=https\nhost=github.com\n\n'
const DOCKERFILE = join(REPO_ROOT, '.devcontainer', 'Dockerfile')
const IMAGE_BIN = '/usr/local/lib/github-app/bin/'

/**
 * The image's git config for github.com as the Dockerfile writes it: its `git config --system --add`
 * lines for `credential.` and `url.` keys, and the `GIT_CONFIG_*` variables its ENV lines set, with
 * the image's path of the wrappers read as this checkout's `.devcontainer/`, which the Dockerfile
 * copies there. Read from the Dockerfile, so a case run over it fails once a line it holds changes.
 */
function imageGitConfig() {
  const text = readFileSync(DOCKERFILE, 'utf8')
  const local = `${join(REPO_ROOT, '.devcontainer')}/`
  const unquote = (value) => value.replace(/^'(.*)'$/, '$1').replace(/^"(.*)"$/, '$1')
  const system = [...text.matchAll(/git config --system --add (\S+) ('[^']*'|"[^"]*"|\S+)/g)]
    .map(([, key, value]) => [key, unquote(value).replaceAll(IMAGE_BIN, local)])
    .filter(([key]) => /^(credential|url)\./.test(key))
  const env = {}
  for (const [, block] of text.matchAll(/^ENV ((?:[^\n]*\\\n)*[^\n]*)$/gm)) {
    for (const [, key, value] of block.replace(/\\\n/g, ' ').matchAll(/(GIT_CONFIG_\w+)=("[^"]*"|\S*)/g)) env[key] = unquote(value).replaceAll(IMAGE_BIN, local)
  }
  const copies = /^COPY \.devcontainer\/gh \.devcontainer\/git-credential-github-app \/usr\/local\/lib\/github-app\/bin\/$/m.test(text)
  return { system, env, copies }
}

/**
 * The environment of a git run under the image's config: its system lines as the system file, its
 * variables as given, and a global file whose helper stands for one a later scope adds, as VS Code's
 * does. That helper logs each action it is asked to a marker file, and answers `get` with the
 * maintainer's credential. Returns the environment and the marker, or the problem that stops it.
 */
async function imageGitEnv(ctx) {
  const { system, env, copies } = imageGitConfig()
  if (!copies) return { problem: `.devcontainer/Dockerfile no longer copies the two wrappers to ${IMAGE_BIN}` }
  if (system.length === 0 || env.GIT_CONFIG_COUNT === undefined) return { problem: `.devcontainer/Dockerfile holds ${system.length} git config line(s) for credential. or url., and ${env.GIT_CONFIG_COUNT === undefined ? 'no' : 'a'} GIT_CONFIG_COUNT` }
  const systemFile = join(ctx.dir, 'gitconfig-system')
  const globalFile = join(ctx.dir, 'gitconfig-global')
  const marker = join(ctx.dir, 'later-helper.log')
  writeFileSync(systemFile, '')
  writeFileSync(globalFile, '')
  const later = `!f() { echo "$1" >> '${marker}'; if [ "$1" = get ]; then printf 'username=maintainer\\npassword=MAINTAINER_PAT\\n'; fi; }; f`
  for (const [file, key, value] of [...system.map(([key, value]) => [systemFile, key, value]), [globalFile, 'credential.helper', later]]) {
    const r = await run('git', ['config', '--file', file, '--add', key, value], { env: SCRATCH_GIT_ENV, cwd: ctx.dir })
    if (r.status !== 0) return { problem: `git config --file could not write ${key}: ${r.stderr.trim()}` }
  }
  return { env: { ...ctx.gitEnv, ...env, GIT_CONFIG_SYSTEM: systemFile, GIT_CONFIG_GLOBAL: globalFile, GITHUB_APP_WORKSPACE: REPO_ROOT, GIT_TERMINAL_PROMPT: '0' }, marker }
}

/**
 * The cases. Each gets a fresh kept-token path and the stub reset to `ok`, then runs its steps
 * through `ctx`, and returns null when it holds or a sentence saying how it does not.
 */
function cases() {
  const helper = (ctx, args, extra = {}) => run(process.execPath, [SELF, ...args], { env: { ...ctx.env, ...extra.env }, input: extra.input ?? '' })
  const tokenRun = (ctx, extra) => helper(ctx, ['token'], extra)
  const get = (ctx, input = GITHUB, extra = {}) => helper(ctx, ['git-credential', 'get'], { ...extra, input })
  const said = (r) => `exited ${r.status}: ${`${r.stdout}${r.stderr}`.trim()}`
  const refused = (r, pattern, ctx, calls = 0) =>
    r.status === 1 && pattern.test(r.stderr) && r.stdout === '' && ctx.stub.requests.length === calls && !existsSync(ctx.kept) ? null : `${said(r)}, after ${ctx.stub.requests.length} call(s) to GitHub, ${existsSync(ctx.kept) ? 'a token kept' : 'none kept'}`
  return [
    {
      name: "control: `token` mints one token, signed as GitHub asks, for the App's installation, and keeps it where only its user reads it",
      check: async (ctx) => {
        const r = await tokenRun(ctx)
        const [call] = ctx.stub.requests
        if (r.status !== 0 || r.stdout !== 'ghs_stub1\n') return said(r)
        if (ctx.stub.requests.length !== 1) return `${ctx.stub.requests.length} calls to GitHub, not 1`
        if (call.method !== 'POST' || call.url !== `/app/installations/${ctx.installationId}/access_tokens`) return `called ${call.method} ${call.url}`
        if (!/application\/vnd\.github\+json/.test(call.accept ?? '')) return `asked for ${call.accept}`
        if (JSON.stringify(call.repositories) !== JSON.stringify([ctx.repository])) return `asked for the repositories ${JSON.stringify(call.repositories)}, not [${JSON.stringify(ctx.repository)}] alone`
        if (call.problems.length > 0) return `GitHub would refuse its JSON Web Token: ${call.problems.join('; ')}`
        if (readKept(ctx.kept)?.token !== 'ghs_stub1') return 'kept no token'
        if (process.platform !== 'win32' && (statSync(ctx.kept).mode & 0o077) !== 0) return `kept it with mode ${(statSync(ctx.kept).mode & 0o777).toString(8)}`
        return null
      },
    },
    {
      name: 'a kept token is handed out again with no call to GitHub',
      check: async (ctx) => {
        const first = await tokenRun(ctx)
        const second = await tokenRun(ctx)
        return first.stdout === 'ghs_stub1\n' && second.stdout === 'ghs_stub1\n' && ctx.stub.requests.length === 1 ? null : `${said(first)}; then ${said(second)}; ${ctx.stub.requests.length} calls`
      },
    },
    {
      name: 'a kept token with less than `githubAppTokenRefreshSeconds` left is replaced by a fresh one',
      check: async (ctx) => {
        ctx.stub.mode = 'short'
        const first = await tokenRun(ctx)
        ctx.stub.mode = 'ok'
        const second = await tokenRun(ctx)
        return first.stdout === 'ghs_stub1\n' && second.stdout === 'ghs_stub2\n' && ctx.stub.requests.length === 2 && readKept(ctx.kept)?.token === 'ghs_stub2'
          ? null
          : `${said(first)}; then ${said(second)}; ${ctx.stub.requests.length} calls`
      },
    },
    {
      name: '`git-credential get` for https://github.com answers x-access-token, the token and its expiry',
      check: async (ctx) => {
        const r = await get(ctx)
        const expiry = Math.floor(Date.parse(readKept(ctx.kept)?.expiresAt) / 1000)
        return r.status === 0 && r.stdout === `username=x-access-token\npassword=ghs_stub1\npassword_expiry_utc=${expiry}\n` ? null : said(r)
      },
    },
    {
      name: '`git-credential get` for another host says nothing, calls nobody and reads no key',
      check: async (ctx) => {
        const r = await get(ctx, 'protocol=https\nhost=gitlab.com\n\n', { env: { GITHUB_APP_KEY_DIR: join(ctx.dir, 'no-such-directory') } })
        return r.status === 0 && r.stdout === '' && r.stderr === '' && ctx.stub.requests.length === 0 ? null : said(r)
      },
    },
    {
      name: '`git-credential get` for github.com over plain http says nothing',
      check: async (ctx) => {
        const r = await get(ctx, 'protocol=http\nhost=github.com\n\n')
        return r.status === 0 && r.stdout === '' && ctx.stub.requests.length === 0 ? null : said(r)
      },
    },
    {
      name: '`git-credential erase` drops the kept token, and the next `get` mints afresh',
      check: async (ctx) => {
        await tokenRun(ctx)
        const erase = await helper(ctx, ['git-credential', 'erase'], { input: `${GITHUB.trimEnd()}\nusername=x-access-token\npassword=ghs_stub1\n\n` })
        if (erase.status !== 0 || erase.stdout !== '' || existsSync(ctx.kept)) return `erase ${said(erase)}, ${existsSync(ctx.kept) ? 'the token still kept' : 'none kept'}`
        const r = await get(ctx)
        return /^password=ghs_stub2$/m.test(r.stdout) && ctx.stub.requests.length === 2 ? null : said(r)
      },
    },
    {
      name: '`git-credential erase` for another host leaves the kept token',
      check: async (ctx) => {
        await tokenRun(ctx)
        const erase = await helper(ctx, ['git-credential', 'erase'], { input: 'protocol=https\nhost=gitlab.com\n\n' })
        return erase.status === 0 && readKept(ctx.kept)?.token === 'ghs_stub1' ? null : `erase ${said(erase)}, ${existsSync(ctx.kept) ? 'a token kept' : 'none kept'}`
      },
    },
    {
      name: '`git-credential store` does nothing',
      check: async (ctx) => {
        await tokenRun(ctx)
        const store = await helper(ctx, ['git-credential', 'store'], { input: `${GITHUB.trimEnd()}\nusername=someone\npassword=another\n\n` })
        const r = await get(ctx)
        return store.status === 0 && store.stdout === '' && /^password=ghs_stub1$/m.test(r.stdout) && ctx.stub.requests.length === 1 ? null : `store ${said(store)}; then ${said(r)}`
      },
    },
    {
      name: 'GitHub refusing the token is refused, with its status and message, and nothing kept',
      check: async (ctx) => {
        ctx.stub.mode = 'refuse'
        return refused(await tokenRun(ctx), /GitHub answered 401 to .*: A JSON web token could not be decoded/, ctx, 1)
      },
    },
    {
      name: 'an answer from GitHub without a token is refused, and nothing kept',
      check: async (ctx) => {
        ctx.stub.mode = 'empty'
        return refused(await get(ctx), /GitHub's answer from .* holds no token and expiry/, ctx, 1)
      },
    },
    {
      name: 'an answer from GitHub with a token and an expiry that does not parse is refused, without printing the token',
      check: async (ctx) => {
        ctx.stub.mode = 'bad-expiry'
        const r = await tokenRun(ctx)
        return r.stderr.includes('ghs_STUB_SECRET') ? `printed the token: ${r.stderr.trim()}` : refused(r, /holds no token and expiry: a token, and expires_at "not-a-date"/, ctx, 1)
      },
    },
    {
      name: 'GitHub out of reach is refused, saying so',
      check: async (ctx) => refused(await tokenRun(ctx, { env: { GITHUB_APP_API_URL: ctx.closedUrl } }), /could not reach http:\/\/127\.0\.0\.1:\d+\/app\/installations\//, ctx),
    },
    {
      name: 'no GITHUB_APP_KEY_DIR is refused, calling nobody',
      check: async (ctx) => refused(await tokenRun(ctx, { env: { GITHUB_APP_KEY_DIR: '' } }), /GITHUB_APP_KEY_DIR is not set/, ctx),
    },
    {
      name: 'a key directory with no .pem is refused',
      check: async (ctx) => {
        const empty = join(ctx.dir, 'empty-keys')
        mkdirSync(empty)
        return refused(await tokenRun(ctx, { env: { GITHUB_APP_KEY_DIR: empty } }), /empty-keys holds 0 \.pem files, where it must hold the App's one private key/, ctx)
      },
    },
    {
      name: 'a key directory with two .pem files is refused, naming both',
      check: async (ctx) => {
        const two = join(ctx.dir, 'two-keys')
        mkdirSync(two)
        writeFileSync(join(two, 'a.pem'), ctx.pem)
        writeFileSync(join(two, 'b.pem'), ctx.pem)
        return refused(await tokenRun(ctx, { env: { GITHUB_APP_KEY_DIR: two } }), /two-keys holds 2 \.pem files \(a\.pem, b\.pem\)/, ctx)
      },
    },
    {
      name: 'a .pem that is not a private key is refused, without printing it',
      check: async (ctx) => {
        const bad = join(ctx.dir, 'bad-key')
        mkdirSync(bad)
        writeFileSync(join(bad, 'key.pem'), 'not-a-key-SECRET-TEXT\n')
        const r = await tokenRun(ctx, { env: { GITHUB_APP_KEY_DIR: bad } })
        return r.stderr.includes('SECRET-TEXT') ? `printed the file: ${r.stderr.trim()}` : refused(r, /key\.pem is not a private key Node can read/, ctx)
      },
    },
    {
      name: 'a policy without `githubAppId` is refused, naming it',
      doctor: (root) => editPolicy(root, (policy) => delete policy.githubAppId),
      check: async (ctx) => refused(await tokenRun(ctx), /^github-app-token: `githubAppId` must each be a whole number above 0 in tools\/policy\//, ctx),
    },
    {
      name: 'a policy without `githubAppTokenRepository` is refused, naming it, rather than mint a token for every repository',
      doctor: (root) => editPolicy(root, (policy) => delete policy.githubAppTokenRepository),
      check: async (ctx) => refused(await tokenRun(ctx), /`githubAppTokenRepository` must be a repository's bare name in tools\/policy\/ under .*, not null/, ctx),
    },
    {
      name: 'a policy whose `githubAppTokenRefreshSeconds` is 0 is refused, naming it',
      doctor: (root) => editPolicy(root, (policy) => (policy.githubAppTokenRefreshSeconds = 0)),
      check: async (ctx) => refused(await tokenRun(ctx), /`githubAppTokenRefreshSeconds` must each be a whole number above 0/, ctx),
    },
    {
      name: 'an unknown command prints the usage and exits 2',
      check: async (ctx) => {
        const r = await helper(ctx, ['mint'])
        return r.status === 2 && /usage: node scripts\/github-app-token\.mjs token/.test(r.stderr) && ctx.stub.requests.length === 0 ? null : said(r)
      },
    },
    {
      name: "real git, under the image's config as the Dockerfile writes it: GitHub's two SSH address forms, the first the one Dolt runs git against for the tracker's remote, read as HTTPS",
      wrapper: true,
      check: async (ctx) => {
        const image = await imageGitEnv(ctx)
        if (image.problem) return image.problem
        const urls = [
          ['ssh://git@github.com/jasonroberts-tw/asdlc-openspec.git', 'https://github.com/jasonroberts-tw/asdlc-openspec.git'],
          ['git@github.com:jasonroberts-tw/asdlc-openspec.git', 'https://github.com/jasonroberts-tw/asdlc-openspec.git'],
        ]
        for (const [from, to] of urls) {
          const r = await run('git', ['ls-remote', '--get-url', from], { env: image.env, cwd: ctx.dir })
          if (r.status !== 0 || r.stdout.trim() !== to) return `${from} read as ${said(r)}, not ${to}`
        }
        return null
      },
    },
    {
      name: "real git, under the image's config: `git credential fill` gets the App's token for github.com, and asks no helper a later scope adds",
      wrapper: true,
      check: async (ctx) => {
        const image = await imageGitEnv(ctx)
        if (image.problem) return image.problem
        const r = await run('git', ['credential', 'fill'], { env: image.env, input: GITHUB, cwd: ctx.dir })
        if (existsSync(image.marker)) return `asked the later scope's helper: ${readFileSync(image.marker, 'utf8').trim()}`
        return r.status === 0 && /^password=ghs_stub1$/m.test(r.stdout) ? null : said(r)
      },
    },
    {
      name: "real git, under the image's config: with the App unable to mint, git gets no credential, where a helper a later scope adds would hand it the maintainer's",
      wrapper: true,
      check: async (ctx) => {
        const image = await imageGitEnv(ctx)
        if (image.problem) return image.problem
        ctx.stub.mode = 'refuse'
        const r = await run('git', ['credential', 'fill'], { env: image.env, input: GITHUB, cwd: ctx.dir })
        if (r.stdout.includes('MAINTAINER_PAT')) return `git took the later scope's credential: ${said(r)}`
        if (existsSync(image.marker)) return `asked the later scope's helper: ${readFileSync(image.marker, 'utf8').trim()}`
        return r.status !== 0 ? null : said(r)
      },
    },
    {
      name: "real git, under the image's config: `git credential approve` hands the App's token to no helper a later scope adds",
      wrapper: true,
      check: async (ctx) => {
        const image = await imageGitEnv(ctx)
        if (image.problem) return image.problem
        const r = await run('git', ['credential', 'approve'], { env: image.env, input: `${GITHUB.trimEnd()}\nusername=x-access-token\npassword=ghs_stub1\n\n`, cwd: ctx.dir })
        if (existsSync(image.marker)) return `handed it to the later scope's helper, asked: ${readFileSync(image.marker, 'utf8').trim()}`
        return r.status === 0 ? null : said(r)
      },
    },
    {
      name: '.devcontainer/git-credential-github-app, named as the one helper by real git, gets the App\'s token for github.com',
      wrapper: true,
      check: async (ctx) => {
        const r = await run('git', ['-c', 'credential.helper=', '-c', `credential.helper=!sh '${join(REPO_ROOT, '.devcontainer', 'git-credential-github-app')}'`, 'credential', 'fill'], {
          env: { ...ctx.gitEnv, GITHUB_APP_WORKSPACE: REPO_ROOT },
          input: GITHUB,
          cwd: ctx.dir,
        })
        return r.status === 0 && /^username=x-access-token$/m.test(r.stdout) && /^password=ghs_stub1$/m.test(r.stdout) ? null : said(r)
      },
    },
    {
      name: '.devcontainer/git-credential-github-app, named the same way, gives another host nothing, so git has no password for it',
      wrapper: true,
      check: async (ctx) => {
        const r = await run('git', ['-c', 'credential.helper=', '-c', `credential.helper=!sh '${join(REPO_ROOT, '.devcontainer', 'git-credential-github-app')}'`, 'credential', 'fill'], {
          env: { ...ctx.gitEnv, GITHUB_APP_WORKSPACE: REPO_ROOT, GIT_TERMINAL_PROMPT: '0' },
          input: 'protocol=https\nhost=gitlab.com\n\n',
          cwd: ctx.dir,
        })
        return r.status !== 0 && !r.stdout.includes('ghs_stub') && ctx.stub.requests.length === 0 ? null : said(r)
      },
    },
    {
      name: '.devcontainer/gh runs the real gh with the token as GH_TOKEN, in the directory it was called from, with its arguments',
      wrapper: true,
      check: async (ctx) => {
        const r = await run('sh', [join(REPO_ROOT, '.devcontainer', 'gh'), 'pr', 'list', '--limit', '1'], { env: { ...ctx.gitEnv, ...ctx.ghEnv }, cwd: ctx.dir })
        return r.status === 0 && r.stdout === `ghs_stub1|${realpathSync(ctx.dir)}|pr list --limit 1\n` ? null : said(r)
      },
    },
    {
      name: '.devcontainer/gh runs no gh when no token can be minted, and prints why',
      wrapper: true,
      check: async (ctx) => {
        ctx.stub.mode = 'refuse'
        const r = await run('sh', [join(REPO_ROOT, '.devcontainer', 'gh'), 'pr', 'list'], { env: { ...ctx.gitEnv, ...ctx.ghEnv }, cwd: ctx.dir })
        return r.status !== 0 && r.stdout === '' && /GitHub answered 401/.test(r.stderr) ? null : said(r)
      },
    },
    {
      name: '.devcontainer/gh without GITHUB_APP_WORKSPACE runs no gh, and says what sets it',
      wrapper: true,
      check: async (ctx) => {
        const env = { ...ctx.gitEnv, ...ctx.ghEnv }
        delete env.GITHUB_APP_WORKSPACE
        const r = await run('sh', [join(REPO_ROOT, '.devcontainer', 'gh'), 'pr', 'list'], { env, cwd: ctx.dir })
        return r.status !== 0 && r.stdout === '' && /GITHUB_APP_WORKSPACE.*devcontainer\.json/.test(r.stderr) && ctx.stub.requests.length === 0 ? null : said(r)
      },
    },
  ]
}

async function selftest() {
  const base = mkdtempSync(join(tmpdir(), 'github-app-token-'))
  const results = []
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' })
  const live = readPolicy(REPO_ROOT)
  const stub = await stubGitHub(publicKey, live.githubAppId)
  // A port that nothing listens on: bound once, then let go.
  const closed = await new Promise((done) => {
    const probe = createServer().listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => done(`http://127.0.0.1:${port}`))
    })
  })
  try {
    const keyDir = join(base, 'keys')
    mkdirSync(keyDir)
    writeFileSync(join(keyDir, 'app.private-key.pem'), pem, { mode: 0o600 })
    const env = { ...SCRATCH_GIT_ENV }
    for (const key of Object.keys(env)) if (key.startsWith('GITHUB_APP_')) delete env[key]
    let index = 0
    for (const { name, doctor, check, wrapper } of cases()) {
      index += 1
      if (wrapper && process.platform === 'win32') {
        results.push({ name, ok: true, detail: 'skipped: the wrappers are POSIX sh the Linux container runs, and this host is Windows' })
        continue
      }
      const dir = join(base, `case-${index}`)
      const root = join(dir, 'root')
      mkdirSync(root, { recursive: true })
      copyPolicy(REPO_ROOT, root)
      if (doctor) doctor(root)
      const kept = join(dir, 'kept', 'token.json')
      Object.assign(stub.state, { mode: 'ok', minted: 0, requests: [] })
      const fakeGh = join(dir, 'gh')
      writeFileSync(fakeGh, '#!/bin/sh\nprintf \'%s|%s|%s\\n\' "$GH_TOKEN" "$(pwd -P)" "$*"\n', { mode: 0o755 })
      const ctx = {
        dir,
        kept,
        pem,
        stub: stub.state,
        closedUrl: closed,
        installationId: live.githubAppInstallationId,
        repository: live.githubAppTokenRepository,
        env: { ...env, GITHUB_APP_TOKEN_ROOT: root, GITHUB_APP_API_URL: stub.url, GITHUB_APP_KEY_DIR: keyDir, GITHUB_APP_TOKEN_CACHE: kept },
        gitEnv: { ...env, GITHUB_APP_TOKEN_ROOT: root, GITHUB_APP_API_URL: stub.url, GITHUB_APP_KEY_DIR: keyDir, GITHUB_APP_TOKEN_CACHE: kept, HOME: dir },
        ghEnv: { GITHUB_APP_WORKSPACE: REPO_ROOT, GITHUB_APP_REAL_GH: fakeGh },
      }
      let problem
      try {
        problem = await check(ctx)
      } catch (error) {
        problem = `threw ${error.name}: ${error.message}`
      }
      results.push({ name, ok: problem === null, detail: problem ?? 'holds' })
      if (name.startsWith('control') && problem !== null) {
        console.error(`selftest: the undoctored copy does not pass, so no case can be trusted: ${problem}`)
        return 1
      }
    }
  } finally {
    stub.server.close()
    rmSync(base, { recursive: true, force: true })
  }
  const failed = results.filter((result) => !result.ok)
  for (const { name, ok, detail } of results) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} -- ${detail}`)
  console.log(`github-app-token selftest: ${results.length - failed.length}/${results.length} cases hold, over a stubbed GitHub on loopback.`)
  return failed.length === 0 ? 0 : 1
}

if (process.argv[1] && resolve(process.argv[1]) === SELF) {
  process.exitCode = process.argv[2] === '--selftest' && process.argv.length === 3 ? await selftest() : await main(process.argv.slice(2))
}
