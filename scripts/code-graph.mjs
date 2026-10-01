/**
 * Builds a knowledge graph of this repository with graphify into the PRIMARY checkout's gitignored
 * `graphify-out/`, and registers graphify's MCP server for that graph at Claude Code's local scope,
 * so a session anywhere in this repository, a linked worktree's included, can query it
 * (`docs/decisions.md` § D-20). The code layer comes from parsing source files, with no LLM; the
 * document layer and the community names come from graphify's `claude-cli` backend, one `claude -p`
 * call per chunk with the model `graphifyClaudeCliModel` names, on the person's own Claude plan. It is
 * an operator command, not an emitter or a gate: what it writes is never committed, and no job runs it.
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
 * it builds with `extract`, which parses only code and re-sends only changed documents, and whenever
 * the graph changed it stamps `_origin: "semantic"` on every item a language model produced, which
 * the tier test reads first. A copy stamped that way kept all 249 of its LLM nodes and 878 of its LLM
 * edges outside the edited files through two updates, where the unstamped control fell to 108 and
 * 280. The stamp is keyed on what made an item, not only on its file: the session's review found
 * graphify fills an LLM edge's `source_file` from a code endpoint when the model left it out
 * (graphify's build.py lines 1363-1371).
 *
 * Second, A PARTIAL GRAPH REPORTED AS SUCCESS. When every chunk fails, `extract` exits 1 and writes
 * nothing. When only some fail, or the semantic pass crashes after a chunk succeeded, it prints a
 * warning and writes the graph it has unless that is smaller than the one already there (graphify's
 * cli.py lines 4051-4057, 4113-4123 and 4566-4593), so its exit code alone can read a partial graph
 * as built. This script exits 1 on each such warning as on any non-zero exit (`CLAUDE.md` § The gate
 * ladder: a tool found and then failing is a failure), after stamping what graphify wrote.
 *
 * Third, CHUNK SESSIONS LOADING THIS REPOSITORY, OR BILLING SOMETHING ELSE. Each `claude -p` call
 * starts a Claude Code session in graphify's working directory. From inside this repository each
 * would load `CLAUDE.md`, the hooks, the Stop hook's gates and the graphify MCP server itself. So
 * graphify runs from an empty directory outside any repository, with `CLAUDE_CODE_SAFE_MODE=1`,
 * which turns off the person's own plugins, hooks and MCP servers and keeps their plan's auth. The
 * same one-file chunk took 37,111 input tokens without safe mode and 16,885 with it. The session's
 * review then found that every chunk inherited an exported `ANTHROPIC_API_KEY`, which `claude -p`
 * always uses when present, so a first build would have been billed to that key at API rates. The
 * script now withholds the variables `PLAN_OVERRIDES` lists. An `apiKeyHelper` or an `env` block in
 * the person's own Claude Code settings can still choose a key, and the script cannot see that.
 *
 * graphify names the communities with the model only while no names are saved. Later builds keep the
 * saved names and give a community that changed the name of its best-connected node, as they do
 * when a naming call failed; `graphify label <checkout> --backend claude-cli --model <model>` names
 * them all again, with the model.
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
 * or a flag is wrong. It has no `--selftest` yet: `CLAUDE.md` § Standing rules for prompts and gates
 * asks one of a gate, and this is an operator command. A stubbed selftest of its own logic, the
 * partial-extraction match and the stamp first, is asdlc-openspec-i3c.
 *
 * WHAT IT NEEDS. graphify with its MCP extra at the version `graphifyVersion` in `tools/policy.json`
 * pins (`uv tool install "graphifyy[mcp]==<version>"`); the `claude` CLI, logged in to a plan, unless
 * `--code-only --no-mcp`; the network, for the document layer. It writes the graph into the primary
 * checkout whichever checkout runs it, and a `graphify` entry into `~/.claude.json` under the primary
 * checkout's path, which Claude Code also reads for that repository's linked worktrees. Measured cost:
 * the first build by graphify's agent skill, 57 documents, made 3,649,692 tokens of calls, $10.40 at
 * Langfuse's prices for Opus (session 56c6cce4, 2026-09-30); a first build by this script is not yet
 * measured (asdlc-openspec-3rx). A build with nothing changed sends nothing to the LLM, and
 * `--code-only` took 2.24 s cold. Once a graph has a document layer, graphify keeps a dated backup
 * folder under `graphify-out/` for each day it builds, and nothing here removes them.
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
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const POLICY_PATH = resolve(HERE, '..', 'tools', 'policy.json')
const POLICY_KEYS = ['graphifyVersion', 'graphifyClaudeCliModel', 'graphifySemanticExtensions', 'graphifyOutDir', 'graphifyMcpServerName']
/** graphify's partial-extraction texts (its cli.py lines 4053, 4116-4123 and the chunk and coverage warnings of its llm.py). */
const INCOMPLETE = [
  /semantic chunk\(s\) failed/,
  /semantic extraction is incomplete/,
  /semantic extraction failed/,
  /produced no nodes and are absent from the graph/,
]
/** Node types graphify's parser never makes: only a language model does. */
const MODEL_ONLY_TYPES = new Set(['document', 'rationale', 'paper', 'image'])
/**
 * Variables that make `claude -p` bill something other than the person's plan. Claude Code's
 * authentication docs rank each above subscription OAuth, and say of `ANTHROPIC_API_KEY`: "In
 * non-interactive mode (`-p`), the key is always used when present." `CLAUDE_CODE_OAUTH_TOKEN`, the
 * plan's own token, is kept.
 */
const PLAN_OVERRIDES = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY']

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
  for (const key of POLICY_KEYS) {
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

function alive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** Take the build lock atomically; take over one whose holder is gone; give it back on Ctrl-C as at the end. */
function lock(outDir) {
  mkdirSync(outDir, { recursive: true })
  const path = join(outDir, '.code-graph.lock')
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      writeFileSync(path, String(process.pid), { flag: 'wx' })
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      const pid = Number(readFileSync(path, 'utf8').trim())
      if (Number.isInteger(pid) && pid > 0 && alive(pid)) {
        throw new Stop(1, `another build (pid ${pid}) holds ${path}; if none is running, delete it`)
      }
      rmSync(path, { force: true })
      continue
    }
    const release = () => rmSync(path, { force: true })
    const onSignal = (signal) => {
      release()
      process.exit(signal === 'SIGINT' ? 130 : 143)
    }
    process.once('SIGINT', onSignal)
    process.once('SIGTERM', onSignal)
    return () => {
      process.off('SIGINT', onSignal)
      process.off('SIGTERM', onSignal)
      release()
    }
  }
  throw new Stop(1, `could not take ${path}`)
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
    GRAPHIFY_OUT: policy.graphifyOutDir,
    GRAPHIFY_CLAUDE_CLI_MODEL: policy.graphifyClaudeCliModel,
    CLAUDE_CODE_SAFE_MODE: '1',
  }
  const withheld = PLAN_OVERRIDES.filter((key) => env[key] !== undefined)
  for (const key of withheld) delete env[key]
  if (withheld.length > 0) console.log(`code-graph: not passing ${withheld.join(', ')} to claude -p, so the build runs on your Claude plan`)
  try {
    const extract = ['extract', root, '--backend', 'claude-cli']
    if (flags.codeOnly) extract.push('--code-only')
    if (flags.force) extract.push('--force')
    const built = await runShown(tools.graphify, extract, { cwd, env })
    if (built.status !== 0) throw new Stop(1, `graphify extract exited ${built.status}`)
    const partial = INCOMPLETE.find((re) => re.test(built.text))
    if (partial) throw new Stop(1, `graphify extract built a partial graph (${partial.source}); re-run to retry the failed documents`)
    const cluster = ['cluster-only', root, '--backend', 'claude-cli', '--model', policy.graphifyClaudeCliModel]
    if (flags.codeOnly && !existsSync(join(root, policy.graphifyOutDir, '.graphify_labels.json'))) cluster.push('--no-label')
    const clustered = await runShown(tools.graphify, cluster, { cwd, env })
    if (clustered.status !== 0) throw new Stop(1, `graphify cluster-only exited ${clustered.status}`)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
}

/**
 * Stamp every item a language model produced as semantic, so `graphify update` would not delete it
 * (the header): a node from a document-type file or of a type the parser never makes, and an edge
 * from a document-type file or touching such a node, whose `source_file` graphify may have filled in
 * from a code endpoint.
 */
function stampOrigins(graphPath, policy) {
  const graph = JSON.parse(readFileSync(graphPath, 'utf8'))
  const semantic = new Set(policy.graphifySemanticExtensions)
  const fromDocument = (item) => semantic.has(extname(String(item.source_file || '')).toLowerCase())
  const modelNodes = new Set(graph.nodes.filter((n) => fromDocument(n) || MODEL_ONLY_TYPES.has(n.file_type)).map((n) => n.id))
  const links = graph.links || graph.edges || []
  const model = [
    ...graph.nodes.filter((n) => modelNodes.has(n.id)),
    ...links.filter((l) => fromDocument(l) || modelNodes.has(l.source) || modelNodes.has(l.target)),
  ]
  let stamped = 0
  for (const item of model) {
    if (item._origin !== 'semantic') {
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

/** The file's size and modification time, or null when it is absent: enough to tell that graphify rewrote it. */
function fingerprint(path) {
  if (!existsSync(path)) return null
  const stat = statSync(path)
  return `${stat.size}:${stat.mtimeMs}`
}

/** Register the server at local scope for `root`, or leave a matching registration alone. Never prints `claude mcp get`'s output, which can hold another server's credentials. */
function registerMcp(root, tools, graphPath, server) {
  const run = (args) => spawnSync(tools.claude, ['mcp', ...args], { cwd: root, encoding: 'utf8' })
  const current = run(['get', server])
  if (current.status === 0) {
    const text = current.stdout
    const local = /Scope:\s*Local/i.test(text)
    if (local && text.includes(tools.mcp) && text.includes(graphPath)) return 'already registered'
    if (local) {
      const removed = run(['remove', server, '-s', 'local'])
      if (removed.status !== 0) throw new Stop(1, `claude mcp remove ${server} -s local failed: ${removed.stderr.trim()}`)
    }
  }
  const added = run(['add', '--scope', 'local', server, '--', tools.mcp, graphPath])
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
  const outDir = join(root, policy.graphifyOutDir)
  const graphPath = join(outDir, 'graph.json')
  const server = policy.graphifyMcpServerName
  console.log(`code-graph: ${flags.mcpOnly ? 'registering' : 'building'} ${root} at ${git(root, ['rev-parse', '--short', 'HEAD'])}`)
  const tools = await preflight(policy, flags, graphPath)
  if (!flags.mcpOnly) {
    refuseGraphifyHooks(root)
    refuseMemory(outDir)
    const release = lock(outDir)
    const before = fingerprint(graphPath)
    try {
      await runGraphify(root, policy, flags, tools)
    } finally {
      // A partial build that graphify wrote is stamped before the script exits 1 over it, so an
      // `update` before the next good build cannot delete what it does hold.
      if (fingerprint(graphPath) !== before) {
        const stamped = stampOrigins(graphPath, policy)
        console.log(`code-graph: stamped ${stamped} item(s) a language model produced as semantic`)
      }
      release()
    }
  }
  if (!flags.noMcp) console.log(`code-graph: MCP server \`${server}\` ${registerMcp(root, tools, graphPath, server)} for ${root}`)
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
