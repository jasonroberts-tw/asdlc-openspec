/**
 * Builds a knowledge graph of this repository with graphify into the PRIMARY checkout's gitignored
 * `graphify-out/`, and registers graphify's MCP server for that graph at Claude Code's local scope,
 * so a session anywhere in this repository, a linked worktree's included, can query it
 * (`docs/decisions.md` § D-20). The code layer comes from parsing source files, with no LLM; the
 * document layer comes from graphify's `claude-cli` backend, one `claude -p` call per chunk, billed to
 * the person's own Claude plan. It is an operator command, not an emitter or a gate: what it writes is
 * never committed, and no job runs it.
 *
 * THE FAILURES IT EXISTS TO PREVENT, each measured on 2026-10-01 against graphify 0.9.73
 * (asdlc-openspec-rsc).
 *
 * First, ERODING THE DOCUMENT LAYER. The wrong fix came first: graphify's own README, its git hooks
 * and its CLAUDE.md block all refresh a graph with `graphify update`, and a session suggested a pull
 * alias that ran it. Run twice on a clone with a copy of a skill-built graph, it took concept nodes
 * from 157 to 22 and links between documents and code from 898 to 156, and its shrink guard did not
 * refuse. `update` parses Markdown as code and decides whether a node came from the parser or an LLM
 * by the shape of its `source_location`, then deletes the "parser" items of each file it re-parses
 * (graphify's build.py lines 39-53, watch.py lines 1018-1063). So this script never runs `update`:
 * it builds with `extract`, which parses only code and re-sends only changed documents, and last of
 * all it stamps `_origin: "semantic"` on every item a document produced, which the tier test reads
 * first. A copy stamped that way kept all 249 of its LLM nodes and 878 of its LLM edges outside the
 * edited files through two updates, where the unstamped control fell to 108 and 280.
 *
 * Second, A PARTIAL GRAPH REPORTED AS SUCCESS. When every chunk fails, `extract` exits 1 and writes
 * nothing. When only some fail, it prints a warning and writes the graph it has unless that is
 * smaller than the one already there (graphify's cli.py lines 4113-4123 and 4566-4593), so its exit
 * code alone can read a partial graph as built. This script exits 1 on that warning as on any
 * non-zero exit (`CLAUDE.md` § The gate ladder: a tool found and then failing is a failure).
 *
 * Third, CHUNK SESSIONS LOADING THIS REPOSITORY. Each `claude -p` call starts a Claude Code session in
 * graphify's working directory. From inside this repository each would load `CLAUDE.md`, the hooks,
 * the Stop hook's gates and the graphify MCP server itself. So graphify runs from an empty directory
 * outside any repository, with `CLAUDE_CODE_SAFE_MODE=1`, which turns off the person's own plugins,
 * hooks and MCP servers and keeps their plan's auth. The same one-file chunk took 37,111 input tokens
 * without safe mode and 16,885 with it.
 *
 *   node scripts/code-graph.mjs [--code-only] [--force] [--mcp-only] [--no-mcp]
 *   npm run code-graph               build, then register the MCP server
 *   npm run code-graph:mcp           register the MCP server only (--mcp-only)
 *
 *   --code-only   parse code only: no LLM call, and no community naming when none is saved yet
 *   --force       rebuild everything, re-sending every document to the LLM
 *   --mcp-only    skip the build and only register the server
 *   --no-mcp      build and leave Claude Code's configuration alone
 *
 * `CODE_GRAPH_ROOT` names a checkout to build in place of the primary one, for a by-hand run against
 * a scratch clone. Exit status: 0 built (and registered); 1 a step failed; 2 a prerequisite is missing
 * or a flag is wrong. It has no `--selftest`: `CLAUDE.md` § Standing rules for prompts and gates asks
 * one of a gate, and this is an operator command whose every step is an external tool.
 *
 * WHAT IT NEEDS. graphify with its MCP extra at the version `graphifyVersion` in `tools/policy.json`
 * pins (`uv tool install "graphifyy[mcp]==<version>"`); the `claude` CLI, logged in to a plan, unless
 * `--code-only --no-mcp`; the network, for the document layer. It writes the graph into the primary
 * checkout whichever checkout runs it, and a `graphify` entry into `~/.claude.json` under the primary
 * checkout's path, which Claude Code also reads for that repository's linked worktrees. Measured cost:
 * the first build by graphify's agent skill, 57 documents, made 3,649,692 tokens of calls, $10.40 at
 * Langfuse's prices for Opus (session 56c6cce4, 2026-09-30); a first build by this script is not yet
 * measured. A build with nothing changed sends nothing to the LLM, and `--code-only` took 2.24 s cold.
 * Written for macOS and Linux; not run on Windows.
 */
import { spawn, spawnSync } from 'node:child_process'
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const POLICY_PATH = resolve(HERE, '..', 'tools', 'policy.json')
const OUT = 'graphify-out'
const SERVER = 'graphify'
const INCOMPLETE = [
  /semantic chunk\(s\) failed/,
  /semantic extraction is incomplete/,
  /produced no nodes and are absent from the graph/,
]

class Stop extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function parseArgs(argv) {
  const flags = { codeOnly: false, force: false, mcpOnly: false, noMcp: false }
  for (const arg of argv) {
    if (arg === '--code-only') flags.codeOnly = true
    else if (arg === '--force') flags.force = true
    else if (arg === '--mcp-only') flags.mcpOnly = true
    else if (arg === '--no-mcp') flags.noMcp = true
    else throw new Stop(2, `unknown argument ${arg}; usage: code-graph.mjs [--code-only] [--force] [--mcp-only] [--no-mcp]`)
  }
  if (flags.mcpOnly && flags.noMcp) throw new Stop(2, '--mcp-only and --no-mcp leave nothing to do')
  if (flags.mcpOnly && (flags.codeOnly || flags.force)) throw new Stop(2, '--mcp-only builds nothing, so --code-only and --force do not apply')
  return flags
}

function readPolicy() {
  const policy = JSON.parse(readFileSync(POLICY_PATH, 'utf8'))
  for (const key of ['graphifyVersion', 'graphifyClaudeCliModel', 'graphifySemanticExtensions']) {
    if (policy[key] === undefined) throw new Stop(2, `tools/policy.json has no \`${key}\``)
  }
  return policy
}

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (r.status !== 0) throw new Stop(1, `git ${args.join(' ')} failed in ${cwd}: ${r.stderr.trim()}`)
  return r.stdout.trim()
}

/** The checkout to build: `CODE_GRAPH_ROOT`, else the primary checkout, found the way `scripts/new-worktree.sh` finds it. */
function resolveRoot() {
  if (process.env.CODE_GRAPH_ROOT) return resolve(process.env.CODE_GRAPH_ROOT)
  return dirname(git(HERE, ['rev-parse', '--path-format=absolute', '--git-common-dir']))
}

function onPath(name) {
  for (const dir of (process.env.PATH || '').split(delimiter)) {
    if (!dir) continue
    const candidate = join(dir, name)
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // not here
    }
  }
  return null
}

function installLine(policy) {
  return `uv tool install "graphifyy[mcp]==${policy.graphifyVersion}" --force`
}

/** Start the server, ask for its tools over JSON-RPC, and expect `query_graph`: being on PATH proves nothing, the `mcp` package may be missing. */
function probeMcp(mcpBin, graphPath) {
  return new Promise((done) => {
    const child = spawn(mcpBin, [graphPath], { stdio: ['pipe', 'pipe', 'pipe'] })
    let buffer = ''
    let stderr = ''
    const finish = (ok, why) => {
      clearTimeout(timer)
      child.kill()
      done({ ok, why })
    }
    const timer = setTimeout(() => finish(false, 'no reply within 30 s'), 30000)
    child.on('error', (error) => finish(false, error.message))
    child.on('exit', (code) => finish(false, `exited ${code}: ${stderr.trim().split('\n').pop() || 'no output'}`))
    child.stderr.on('data', (d) => (stderr += d))
    child.stdout.on('data', (d) => {
      buffer += d
      let newline
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        if (!line) continue
        let message
        try {
          message = JSON.parse(line)
        } catch {
          continue
        }
        if (message.id === 1) {
          child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`)
          child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })}\n`)
        } else if (message.id === 2) {
          const names = (message.result?.tools || []).map((t) => t.name)
          finish(names.includes('query_graph'), `its tools are ${names.join(', ') || 'none'}`)
        }
      }
    })
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'code-graph', version: '1' } },
      })}\n`,
    )
  })
}

async function preflight(policy, flags, graphPath) {
  const tools = {}
  const needClaude = !flags.noMcp || (!flags.mcpOnly && !flags.codeOnly)
  tools.graphify = onPath('graphify')
  tools.mcp = onPath('graphify-mcp')
  tools.claude = needClaude ? onPath('claude') : null
  if (!tools.graphify || !tools.mcp) throw new Stop(2, `graphify is not on PATH. Install it: ${installLine(policy)}`)
  if (needClaude && !tools.claude) throw new Stop(2, 'the `claude` CLI is not on PATH; it extracts the documents and registers the server')
  const version = spawnSync(tools.graphify, ['--version'], { encoding: 'utf8', env: { ...process.env, GRAPHIFY_NO_AUTO_REFRESH: '1' } })
  const found = (version.stdout || '').trim().split(/\s+/).pop()
  if (found !== policy.graphifyVersion) {
    throw new Stop(2, `graphify ${found || '(unreadable)'} is installed; tools/policy.json pins ${policy.graphifyVersion}. Install it: ${installLine(policy)}`)
  }
  if (!flags.noMcp) {
    const probe = await probeMcp(tools.mcp, graphPath)
    if (!probe.ok) throw new Stop(2, `graphify-mcp does not serve the graph tools (${probe.why}). Install the MCP extra: ${installLine(policy)}`)
  }
  return tools
}

/** graphify's own hooks run `graphify update`, which erodes the document layer (the header). */
function refuseGraphifyHooks(root) {
  const hooks = git(root, ['rev-parse', '--path-format=absolute', '--git-path', 'hooks'])
  for (const name of ['post-commit', 'post-checkout']) {
    const path = join(hooks, name)
    if (existsSync(path) && /graphify/.test(readFileSync(path, 'utf8'))) {
      throw new Stop(1, `${path} runs graphify, whose rebuild erodes the document layer. Remove it: graphify hook uninstall`)
    }
  }
  const config = spawnSync('git', ['config', '--get-regexp', '^hook\\.'], { cwd: root, encoding: 'utf8' })
  if (/graphify/.test(config.stdout || '')) throw new Stop(1, `a hook.* key in git config runs graphify:\n${config.stdout.trim()}`)
}

/** graphify reads `graphify-out/memory/` as source, so a saved answer would come back as a document. */
function refuseMemory(outDir) {
  const memory = join(outDir, 'memory')
  if (existsSync(memory) && readdirSync(memory).length > 0) {
    throw new Stop(1, `${memory} holds saved answers, which graphify would read back in as documents. Move or delete it first.`)
  }
}

function lock(outDir) {
  mkdirSync(outDir, { recursive: true })
  const path = join(outDir, '.code-graph.lock')
  if (existsSync(path)) {
    const pid = Number(readFileSync(path, 'utf8'))
    let alive = false
    try {
      process.kill(pid, 0)
      alive = true
    } catch {
      // a lock left by a run that died
    }
    if (alive) throw new Stop(1, `another build (pid ${pid}) holds ${path}`)
  }
  writeFileSync(path, String(process.pid))
  return () => rmSync(path, { force: true })
}

/** Run a command with its output passed through, and return the text it printed. */
function runShown(cmd, args, options) {
  return new Promise((done, fail) => {
    const child = spawn(cmd, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] })
    let text = ''
    child.stdout.on('data', (d) => {
      process.stdout.write(d)
      text += d
    })
    child.stderr.on('data', (d) => {
      process.stderr.write(d)
      text += d
    })
    child.on('error', fail)
    child.on('close', (status) => done({ status, text }))
  })
}

async function runGraphify(root, policy, flags, tools) {
  const cwd = mkdtempSync(join(tmpdir(), 'code-graph-'))
  const env = {
    ...process.env,
    PYTHONHASHSEED: '0',
    GRAPHIFY_NO_AUTO_REFRESH: '1',
    GRAPHIFY_OUT: OUT,
    GRAPHIFY_CLAUDE_CLI_MODEL: policy.graphifyClaudeCliModel,
    CLAUDE_CODE_SAFE_MODE: '1',
  }
  try {
    const extract = ['extract', root, '--backend', 'claude-cli']
    if (flags.codeOnly) extract.push('--code-only')
    if (flags.force) extract.push('--force')
    const built = await runShown(tools.graphify, extract, { cwd, env })
    if (built.status !== 0) throw new Stop(1, `graphify extract exited ${built.status}`)
    const partial = INCOMPLETE.find((re) => re.test(built.text))
    if (partial) throw new Stop(1, `graphify extract built a partial graph (${partial.source}); re-run to retry the failed documents`)
    const cluster = ['cluster-only', root, '--backend', 'claude-cli']
    if (flags.codeOnly && !existsSync(join(root, OUT, '.graphify_labels.json'))) cluster.push('--no-label')
    const clustered = await runShown(tools.graphify, cluster, { cwd, env })
    if (clustered.status !== 0) throw new Stop(1, `graphify cluster-only exited ${clustered.status}`)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
}

/** Stamp every item a document produced as semantic, last, so `graphify update` would not delete it (the header). */
function stampOrigins(graphPath, policy) {
  const graph = JSON.parse(readFileSync(graphPath, 'utf8'))
  const semantic = new Set(policy.graphifySemanticExtensions)
  let stamped = 0
  for (const item of [...graph.nodes, ...(graph.links || graph.edges || [])]) {
    if (semantic.has(extname(String(item.source_file || '')).toLowerCase()) && item._origin !== 'semantic') {
      item._origin = 'semantic'
      stamped += 1
    }
  }
  if (stamped > 0) {
    const temp = `${graphPath}.code-graph.tmp`
    writeFileSync(temp, JSON.stringify(graph, null, 2))
    renameSync(temp, graphPath)
  }
  return stamped
}

/** Register the server at local scope for `root`, or leave a matching registration alone. Never prints `claude mcp get`'s output, which can hold another server's credentials. */
function registerMcp(root, tools, graphPath) {
  const run = (args) => spawnSync(tools.claude, ['mcp', ...args], { cwd: root, encoding: 'utf8' })
  const current = run(['get', SERVER])
  if (current.status === 0) {
    const text = current.stdout
    const local = /Scope:\s*Local/i.test(text)
    if (local && text.includes(tools.mcp) && text.includes(graphPath)) return 'already registered'
    if (local) {
      const removed = run(['remove', SERVER, '-s', 'local'])
      if (removed.status !== 0) throw new Stop(1, `claude mcp remove ${SERVER} -s local failed: ${removed.stderr.trim()}`)
    }
  }
  const added = run(['add', '--scope', 'local', SERVER, '--', tools.mcp, graphPath])
  if (added.status !== 0) throw new Stop(1, `claude mcp add failed: ${(added.stderr || added.stdout).trim()}`)
  return 'registered'
}

function summary(root, graphPath, policy) {
  if (!existsSync(graphPath)) return `no graph at ${graphPath} yet: run npm run code-graph`
  const graph = JSON.parse(readFileSync(graphPath, 'utf8'))
  const links = graph.links || graph.edges || []
  const types = new Set(policy.graphifySemanticExtensions)
  const semantic = graph.nodes.filter((n) => types.has(extname(String(n.source_file || '')).toLowerCase())).length
  const commit = graph.built_at_commit || graph.graph?.built_at_commit || git(root, ['rev-parse', '--short', 'HEAD'])
  return `${graph.nodes.length} nodes (${semantic} from documents), ${links.length} edges, built at ${String(commit).slice(0, 12)}`
}

async function main() {
  const flags = parseArgs(process.argv.slice(2))
  const policy = readPolicy()
  const root = resolveRoot()
  const outDir = join(root, OUT)
  const graphPath = join(outDir, 'graph.json')
  console.log(`code-graph: ${flags.mcpOnly ? 'registering' : 'building'} ${root} at ${git(root, ['rev-parse', '--short', 'HEAD'])}`)
  const tools = await preflight(policy, flags, graphPath)
  if (!flags.mcpOnly) {
    refuseGraphifyHooks(root)
    refuseMemory(outDir)
    const release = lock(outDir)
    try {
      await runGraphify(root, policy, flags, tools)
      const stamped = stampOrigins(graphPath, policy)
      console.log(`code-graph: stamped ${stamped} item(s) from documents as semantic`)
    } finally {
      release()
    }
  }
  if (!flags.noMcp) console.log(`code-graph: MCP server \`${SERVER}\` ${registerMcp(root, tools, graphPath)} for ${root}`)
  console.log(`code-graph: ${summary(root, graphPath, policy)}`)
}

main().catch((error) => {
  if (error instanceof Stop) {
    console.error(`code-graph: ${error.message}`)
    process.exit(error.code)
  }
  console.error(error)
  process.exit(1)
})
