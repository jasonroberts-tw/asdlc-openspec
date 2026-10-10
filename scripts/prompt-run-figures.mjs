/**
 * Prompt-run figures: for each prompt-run analysis no review has read, what its session did, read
 * from Langfuse as figures and never as content, for the prompt review to read beside the analysis
 * (`docs/decisions/asdlc-openspec-ic9h.md` § Decision, item 5). An operator command, which the
 * review's workflow, `.github/workflows/prompt-review.yml`, runs in a job of its own before the
 * model's, and never a gate.
 *
 * WHAT IT READS. First the pending analyses, from the file `--pending` names: what
 * `node scripts/prompt-runs.mjs --only pending --json` printed, in an earlier step that held no
 * Langfuse key. It runs nothing itself, so the process that holds the keys runs this file and
 * `tools/lib/policy.ts` alone, both on the high-risk floor: a child it started, as the same user,
 * could read the keys from `/proc/<its pid>/environ` whatever environment it was given. Then, for
 * each pending analysis with a session id, and each project of `langfuseProjects` whose two
 * variables are set, every observation of that session in the run's window. It asks
 * `langfuseObservationsPath` on `langfuseBaseUrl`, and refuses a path that opens with `//` or holds a
 * backslash, which would resolve to another origin, for the field groups `langfuseFieldGroups` names, `langfusePageLimit` to a page, and follows
 * `meta.cursor` until a page carries none. The window ends at the run id's time, since a session works
 * on after its analysis is written. It opens at the time of `previous`, that session's earlier
 * analysis, or `langfuseLookbackDays` before the end where there is none. Projects and runs are read
 * one request at a time, since the rate limit is the organisation's.
 *
 * WHAT IT PRINTS, per run, from the observations of its window in every project that held any:
 *
 *   turns          the SPANs named `langfuseTurnName`, one per user prompt as the plugin opens them
 *   toolCalls      the TOOLs by name, `langfuseToolNamePrefix` taken off; a name without the prefix,
 *                  or of another shape than TOOL_NAME, counts under `(other)`
 *   tokens         each GENERATION's `usageDetails`, summed by `langfuseUsageBuckets` into the input
 *                  tokens, as `input`, `cacheRead` and `cacheWrite`, and the `output` tokens. Every
 *                  other key goes into `unbucketed`, except `langfuseUsageTotalKey`, the sum of the
 *                  other keys that Langfuse adds: only what it holds past them goes there, as a total
 *                  sent alone does, and a total below them fails the run
 *   unbucketedKeys the names of those other keys, a name of another shape than TOOL_NAME as `(other)`
 *   costUsd        the GENERATIONs' `totalCost` summed, or null when none gives a number
 *   wallSeconds    from the first observation's start to the last one's end, held to the window
 *   turnSeconds    the turns' durations summed, each end held to the window
 *   errors         the observations at level ERROR, by type: `generations`, `tools` and `spans`. A
 *                  span takes the worst level of what it holds, so `spans` repeats failures the other
 *                  two already count, and is kept apart from them
 *   observations   how many observations the window held
 *
 * TOOL_NAME is an identifier's shape, letters, digits and `_.:-`, which holds no sentence. It does
 * not stop a secret that is itself an identifier, such as a token, from printing as a tool's name or
 * a usage key; those names come from Claude Code's tools and the plugin's own keys.
 *
 * Each run also carries `trace`, which is one of four values:
 *
 *   found            the run has figures, and `foundIn` names the projects that held them
 *   none             no project read held any
 *   no session line  the analysis was written without a session line
 *   failed           each failure is listed with its project, and the run has no figures, since
 *                    figures from the projects that answered would read as the whole run
 *
 * It never prints an observation's input, output, metadata or status message, nor a key. It asks for
 * no field group that holds the first three, and keeps no field it does not count.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet: the command came with asdlc-openspec-ic9h.4. Were
 * it wrong, it would let through:
 *
 *   - a prompt, a response or a tool's output, or a secret one of them carried, reaching the public
 *     tracker and the review's pull request;
 *   - a key sent to a host other than Langfuse's, or held by code no person reviews. The branch
 *     review of asdlc-openspec-ic9h.4 found the first design, which ran `prompt-runs` as a child with
 *     the keys taken out of its environment, still let that child read them from `/proc`; and its
 *     adversarial review sent the keys to another host through a path of `//host`;
 *   - work a session did after a run's analysis counted as the run's, as the session that wrote
 *     asdlc-openspec-ic9h.2's analysis went on to work asdlc-openspec-ic9h.4;
 *   - a failed or half-answered read taken as a run with no trace, or as the whole run;
 *   - one failure counted at every span that holds it;
 *   - a server that ignored the session or time filter, or paged without end, counted as the run.
 *
 * INVOCATION.
 *
 *   mise run prompt-runs:figures --pending <file>          the figures, as text
 *   mise run prompt-runs:figures --pending <file> --json   the same, as one JSON object
 *   mise run prompt-runs:figures:selftest                  the selftest (`--selftest`)
 *   PROMPT_RUN_FIGURES_ROOT=<dir> mise run prompt-runs:figures --pending <file>
 *                                 the same over a doctored copy's policy, under `tools/policy/`
 *
 * The file is what `node scripts/prompt-runs.mjs --only pending --json` printed. With no project's
 * keys set, `--pending` may be left out.
 *
 * EXIT.
 *
 *   0  the figures; or no project's keys set, which it says, before it reads anything
 *   2  a bad flag, or no `--pending` beside a project's keys
 *   1  a failure, each named: a project with one of its two keys set; a policy key missing or wrong;
 *      a pending file it cannot read, or in another shape than `prompt-runs` prints; or a request
 *      refused, rate limited past `langfuseRetryLimit`, timed out or answered in another shape than
 *      this header reads, which is recorded for its run
 *
 * NEEDS. The pending file. For each project it reads, that project's keys in the environment and
 * Langfuse's API over the network. Only the `figures` job of the prompt review's workflow holds both
 * projects' keys, on a runner of its own that runs no file off the high-risk floor
 * (docs/decisions/asdlc-openspec-ic9h.md, item 5). The selftest needs neither: it serves the API
 * from a stub on loopback holding two projects, over a pending file it has `prompt-runs` write from a
 * fixture export, so it is a pre-push job and a `verify.yml` step.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyPolicy, editPolicy, readPolicy } from '../tools/lib/policy.ts'

const SELF = fileURLToPath(import.meta.url)
const REPO_ROOT = resolve(dirname(SELF), '..')
const ROOT_ENV = 'PROMPT_RUN_FIGURES_ROOT'
const RUNS_ROOT_ENV = 'PROMPT_RUNS_ROOT'
const NAME = 'prompt-runs:figures'
const DAY_MS = 24 * 60 * 60 * 1000

/** A run id: an issue's id, `@`, and a UTC second, as `scripts/prompt-runs.mjs` reads one. */
const RUN_ID = /^(\S+)@(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)$/
/** A Claude Code session id, as `scripts/prompt-runs.mjs` reads one. */
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
/** A name the figures may print: an identifier's shape, which holds no sentence (the header says what it does not stop). */
const TOOL_NAME = /^[A-Za-z0-9_.:-]{1,100}$/
/** What a name that is not of TOOL_NAME's shape counts under, which no tool's name can be. */
const OTHER = '(other)'
/** An environment variable's name, as `langfuseProjects` gives one. */
const ENV_NAME = /^[A-Z][A-Z0-9_]*$/
/** The field groups whose fields hold an observation's text (Langfuse's OpenAPI spec, `fields`, read 2026-10-09), which no request may ask for. */
const TEXT_GROUPS = ['io', 'metadata']
/** The field groups that hold every field the figures read. */
const NEEDED_GROUPS = ['basic', 'core', 'usage']
/** The levels an observation has (Langfuse's OpenAPI spec, `ObservationLevel`, read 2026-10-09). */
const LEVELS = ['DEBUG', 'DEFAULT', 'WARNING', 'ERROR']
/** The figures' token buckets, each a key of `langfuseUsageBuckets`. */
const BUCKETS = ['cacheRead', 'cacheWrite', 'input', 'output']
const LOOPBACK = ['127.0.0.1', 'localhost', '[::1]']

/** Code-point order, so two runtimes agree. */
const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const isoSecond = (ms) => new Date(ms).toISOString().replace('.000Z', 'Z')
const timeOf = (run) => Date.parse(RUN_ID.exec(run)[2])

/** A failure the command prints by its reason, as opposed to a defect, which throws anything else. */
class Failure extends Error {}

/* -------------------------------------------------------------------------------- the policy ----- */

/** The policy keys this command reads, and what each must be. */
const KEYS = [
  ['langfuseBaseUrl', 'url'],
  ['langfuseObservationsPath', 'path'],
  ['langfuseFieldGroups', 'groups'],
  ['langfusePageLimit', 'count'],
  ['langfuseProjects', 'projects'],
  ['langfuseTurnName', 'text'],
  ['langfuseToolNamePrefix', 'prefix'],
  ['langfuseUsageBuckets', 'buckets'],
  ['langfuseUsageTotalKey', 'text'],
  ['langfuseLookbackDays', 'count'],
  ['langfuseRetryLimit', 'count or 0'],
  ['langfuseRetryMaxWaitSeconds', 'count'],
  ['langfuseRequestTimeoutSeconds', 'count'],
]

/** Why `value`, of the kind `kind`, is wrong, or null when it is right. */
function wrongOf(kind, value) {
  const isText = (v) => typeof v === 'string' && v.trim() !== ''
  switch (kind) {
    case 'url': {
      let url
      try {
        url = new URL(value)
      } catch {
        return 'a URL'
      }
      const bare = url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password && value.replace(/\/$/, '') === url.origin
      if (!bare) return "a URL's origin alone, with no path, query, fragment or credentials"
      return url.protocol === 'https:' || (url.protocol === 'http:' && LOOPBACK.includes(url.hostname)) ? null : 'an https URL, since the keys go with every request; http only to a loopback host'
    }
    // One / and no backslash, since `new URL()` reads `//host` and `/\host` as another origin, which
    // would take the keys past every check on `langfuseBaseUrl`.
    case 'path':
      return typeof value === 'string' && /^\/(?!\/)[^?#\s\\]*$/.test(value) ? null : 'a path that opens with one / and holds no backslash, query or fragment'
    case 'groups': {
      const ok = Array.isArray(value) && value.length > 0 && value.every((g) => typeof g === 'string' && /^[a-z_]+$/.test(g)) && new Set(value).size === value.length
      if (!ok) return 'a list of distinct field groups'
      if (value.some((g) => TEXT_GROUPS.includes(g))) return `a list naming none of ${TEXT_GROUPS.join(' and ')}, the groups that hold an observation's text`
      return NEEDED_GROUPS.every((g) => value.includes(g)) ? null : `a list naming ${NEEDED_GROUPS.join(', ')}, which hold every field the figures read`
    }
    case 'count':
      return Number.isInteger(value) && value >= 1 ? null : 'a whole number of at least 1'
    case 'count or 0':
      return Number.isInteger(value) && value >= 0 ? null : 'a whole number of at least 0'
    case 'text':
      return isText(value) && value === value.trim() ? null : 'text with no space at either end'
    case 'prefix':
      return typeof value === 'string' && value !== '' ? null : 'text that is not empty'
    case 'projects': {
      if (!(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0)) return 'a table of projects'
      const names = []
      for (const [project, row] of Object.entries(value)) {
        if (!/^[a-z][a-z0-9-]*$/.test(project)) return 'a table keyed by lower-case project names'
        if (!(row && ENV_NAME.test(row.publicKeyEnv ?? '') && ENV_NAME.test(row.secretKeyEnv ?? '') && isText(row.why))) return `a table whose row for \`${project}\` names its \`publicKeyEnv\` and \`secretKeyEnv\` in capitals, and its \`why\``
        names.push(row.publicKeyEnv, row.secretKeyEnv)
      }
      return new Set(names).size === names.length ? null : 'a table whose rows name each environment variable once'
    }
    case 'buckets': {
      if (!(value && typeof value === 'object' && JSON.stringify(Object.keys(value).sort(byCodePoint)) === JSON.stringify(BUCKETS))) return `a table of exactly ${BUCKETS.join(', ')}`
      const keys = Object.values(value).flat()
      const ok = Object.values(value).every((list) => Array.isArray(list) && list.length > 0 && list.every(isText))
      return ok && new Set(keys).size === keys.length ? null : 'a table whose buckets each list usage keys, and no key in two'
    }
    default:
      throw new Error(`no check for the kind ${kind}`)
  }
}

/** The keys this command reads from the records under `root`, or a failure naming the one that is wrong. */
export function loadPolicy(root) {
  let raw
  try {
    raw = readPolicy(root)
  } catch (error) {
    throw new Failure(`tools/policy/ under ${root} cannot be read: ${error.message}`)
  }
  for (const [key, kind] of KEYS) {
    if (raw[key] === undefined) throw new Failure(`the policy has no \`${key}\``)
    if (typeof raw[`${key}Means`] !== 'string') throw new Failure(`the policy has \`${key}\` and no \`${key}Means\` saying what it decides`)
    const wrong = wrongOf(kind, raw[key])
    if (wrong) throw new Failure(`the policy's \`${key}\` is ${JSON.stringify(raw[key])}, where it must be ${wrong}`)
  }
  if (Object.values(raw.langfuseUsageBuckets).flat().includes(raw.langfuseUsageTotalKey)) {
    throw new Failure(`the policy's \`langfuseUsageBuckets\` holds \`langfuseUsageTotalKey\`, ${JSON.stringify(raw.langfuseUsageTotalKey)}, the sum of the other keys, which would count each token twice`)
  }
  return Object.fromEntries(KEYS.map(([key]) => [key, raw[key]]))
}

/* -------------------------------------------------------------------------------- the keys ------- */

/** The projects whose two keys `env` sets, those it sets neither of, and a problem for each it sets one of. */
export function projectsOf(policy, env) {
  const read = []
  const absent = []
  const problems = []
  for (const name of Object.keys(policy.langfuseProjects).sort(byCodePoint)) {
    const { publicKeyEnv, secretKeyEnv } = policy.langfuseProjects[name]
    const publicKey = (env[publicKeyEnv] ?? '').trim()
    const secretKey = (env[secretKeyEnv] ?? '').trim()
    if (publicKey && secretKey) read.push({ name, publicKey, secretKey })
    else if (!publicKey && !secretKey) absent.push(name)
    else problems.push(`the project \`${name}\` has ${publicKey ? publicKeyEnv : secretKeyEnv} set and not ${publicKey ? secretKeyEnv : publicKeyEnv}, so it cannot be read`)
  }
  return { read, absent, problems }
}

/* --------------------------------------------------------------------------- the pending runs ----- */

/** The pending analyses in what `prompt-runs --only pending --json` printed, or a failure when they are in another shape. */
export function pendingFrom(text) {
  let analyses
  try {
    analyses = JSON.parse(text).pending.analyses
  } catch {
    analyses = null
  }
  const ok =
    Array.isArray(analyses) &&
    analyses.every(
      (a) =>
        a && RUN_ID.test(a.run) && typeof a.issue === 'string' && (a.session === null || SESSION_ID.test(a.session)) && (a.previous === null || (RUN_ID.test(a.previous) && timeOf(a.previous) < timeOf(a.run))),
    )
  if (!ok) throw new Failure('the pending file holds its pending analyses in another shape than `prompt-runs --only pending --json` prints: each a run id, an issue, a session id or null, and an earlier run id or null as `previous`')
  return analyses
}

/** The run's window: from its session's previous analysis, or `langfuseLookbackDays` back, up to its own run id's time. */
export function windowOf(analysis, policy) {
  const to = timeOf(analysis.run)
  return { from: analysis.previous ? timeOf(analysis.previous) : to - policy.langfuseLookbackDays * DAY_MS, to }
}

/* --------------------------------------------------------------------------------- the reads ----- */

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
const timedOut = (policy) => new Failure(`the request timed out, past \`langfuseRequestTimeoutSeconds\` (${policy.langfuseRequestTimeoutSeconds})`)
const isTimeout = (error) => error?.name === 'TimeoutError' || error?.cause?.name === 'TimeoutError'

/** One page's body, as JSON, sent again after a 429 as the policy allows, or a failure naming why there is none. */
async function getPage(url, authorization, policy) {
  for (let attempt = 0; ; attempt++) {
    const signal = AbortSignal.timeout(policy.langfuseRequestTimeoutSeconds * 1000)
    let response
    try {
      response = await fetch(url, { headers: { authorization, accept: 'application/json' }, redirect: 'error', signal })
    } catch (error) {
      if (isTimeout(error)) throw timedOut(policy)
      throw new Failure(`the request did not complete: ${String(error.cause?.code ?? error.cause?.message ?? error.message).slice(0, 200)}`)
    }
    if (response.status === 429) {
      await response.body?.cancel()
      const header = (response.headers.get('retry-after') ?? '').trim()
      const wait = /^\d+$/.test(header) ? Number(header) : Number.NaN
      if (attempt >= policy.langfuseRetryLimit) throw new Failure(`rate limited (429) after \`langfuseRetryLimit\` (${policy.langfuseRetryLimit}) retries`)
      if (Number.isNaN(wait)) throw new Failure('rate limited (429) with no Retry-After in whole seconds to wait out')
      if (wait > policy.langfuseRetryMaxWaitSeconds) throw new Failure(`rate limited (429) for ${wait} seconds, past \`langfuseRetryMaxWaitSeconds\` (${policy.langfuseRetryMaxWaitSeconds})`)
      await sleep(wait * 1000)
      continue
    }
    if (!response.ok) {
      await response.body?.cancel()
      if (response.status === 401 || response.status === 403) throw new Failure(`the project's keys were refused (${response.status})`)
      if (response.status === 404) throw new Failure('the API answered 404: no observations API v2 at `langfuseBaseUrl` and `langfuseObservationsPath`')
      throw new Failure(`the API answered ${response.status}`)
    }
    try {
      return await response.json()
    } catch (error) {
      if (isTimeout(error) || signal.aborted) throw timedOut(policy)
      throw new Failure('the API answered with a body that is not JSON')
    }
  }
}

/** The sum of a usage table's counts, but the one under `key`. */
const sumBut = (usage, key) => Object.entries(usage).reduce((n, [k, v]) => (k === key ? n : n + v), 0)

/** One observation, as the figures read it, or a failure naming what is wrong with it; it keeps no other field. */
function rowOf(row, session, window, totalKey) {
  const shape = (what) => new Failure(`the API answered with an observation ${what}, in another shape than the header of scripts/prompt-run-figures.mjs reads`)
  if (!(row && typeof row === 'object' && !Array.isArray(row))) throw shape('that is not an object')
  const { id, type, name, level, startTime, endTime, sessionId, usageDetails, totalCost } = row
  if (sessionId !== session) throw new Failure('the API answered with an observation of another session, so its sessionId filter cannot be trusted')
  if (!(typeof id === 'string' && id !== '')) throw shape('with no id')
  if (!(typeof type === 'string' && /^[A-Z_]+$/.test(type))) throw shape('with no type')
  if (!LEVELS.includes(level)) throw shape(`whose level is none of ${LEVELS.join(', ')}`)
  const start = typeof startTime === 'string' ? Date.parse(startTime) : Number.NaN
  if (Number.isNaN(start)) throw shape('with no start time')
  if (start < window.from) throw new Failure('the API answered with an observation that starts before the window it was asked for, so its time filter cannot be trusted')
  if (start >= window.to) throw new Failure('the API answered with an observation that starts at or after the end of the window it was asked for, so its time filter cannot be trusted')
  const end = endTime === null || endTime === undefined ? start : typeof endTime === 'string' ? Date.parse(endTime) : Number.NaN
  if (Number.isNaN(end)) throw shape('whose end time is not a time')
  let usage = {}
  if (type === 'GENERATION' && usageDetails !== undefined && usageDetails !== null) {
    const ok = typeof usageDetails === 'object' && !Array.isArray(usageDetails) && Object.values(usageDetails).every((v) => Number.isFinite(v) && v >= 0)
    if (!ok) throw shape('whose usageDetails is not a table of token counts')
    if (Object.hasOwn(usageDetails, totalKey) && usageDetails[totalKey] < sumBut(usageDetails, totalKey)) throw shape('whose usage total is below the sum of its other keys')
    usage = usageDetails
  }
  let cost = null
  if (type === 'GENERATION' && totalCost !== undefined && totalCost !== null) {
    if (!(Number.isFinite(totalCost) && totalCost >= 0)) throw shape('whose totalCost is not a number of dollars')
    cost = totalCost
  }
  return { id, type, name: typeof name === 'string' ? name : null, level, start, end: Math.max(start, end), usage, cost }
}

/** Every observation of `session` in `window` that `project` holds, page after page, or a failure naming why not. */
async function observationsOf(project, session, window, policy) {
  const authorization = `Basic ${Buffer.from(`${project.publicKey}:${project.secretKey}`).toString('base64')}`
  const rows = []
  const ids = new Set()
  let cursor = null
  for (;;) {
    const url = new URL(policy.langfuseObservationsPath, policy.langfuseBaseUrl)
    url.searchParams.set('sessionId', session)
    url.searchParams.set('fields', policy.langfuseFieldGroups.join(','))
    url.searchParams.set('limit', String(policy.langfusePageLimit))
    url.searchParams.set('fromStartTime', new Date(window.from).toISOString())
    url.searchParams.set('toStartTime', new Date(window.to).toISOString())
    if (cursor !== null) url.searchParams.set('cursor', cursor)
    const body = await getPage(url, authorization, policy)
    if (!(body && typeof body === 'object' && Array.isArray(body.data) && body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta))) {
      throw new Failure('the API answered without the `data` array and the `meta` object this command reads')
    }
    for (const raw of body.data) {
      const row = rowOf(raw, session, window, policy.langfuseUsageTotalKey)
      if (ids.has(row.id)) throw new Failure('the API answered with one observation twice, so its pages cannot be trusted')
      ids.add(row.id)
      rows.push(row)
    }
    const next = body.meta.cursor
    if (next === undefined || next === null || next === '') return rows
    if (typeof next !== 'string') throw new Failure('the API answered with a `meta.cursor` that is not a string')
    // A page that gives no row and a cursor would page for ever, and so would a cursor given twice,
    // which gives its rows twice, so the check of `ids` above ends that one.
    if (body.data.length === 0) throw new Failure('the API answered with an empty page that carries a cursor, so its pages would never end')
    cursor = next
  }
}

/* ------------------------------------------------------------------------------- the figures ----- */

/** The figures of one run's observations, as the header gives them. */
export function figuresOf(rows, window, policy) {
  const bucketOf = new Map(Object.entries(policy.langfuseUsageBuckets).flatMap(([bucket, keys]) => keys.map((key) => [key, bucket])))
  const prefix = policy.langfuseToolNamePrefix
  const tools = new Map()
  const tokens = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, unbucketed: 0 }
  const unbucketedKeys = new Set()
  const errors = { generations: 0, tools: 0, spans: 0 }
  let turns = 0
  let turnMs = 0
  let cost = null
  let first = Number.POSITIVE_INFINITY
  let last = Number.NEGATIVE_INFINITY
  for (const row of rows) {
    const end = Math.min(row.end, window.to)
    first = Math.min(first, row.start)
    last = Math.max(last, end)
    if (row.type === 'SPAN') {
      if (row.name === policy.langfuseTurnName) {
        turns++
        turnMs += end - row.start
      }
      if (row.level === 'ERROR') errors.spans++
    }
    if (row.type === 'TOOL') {
      const bare = row.name?.startsWith(prefix) ? row.name.slice(prefix.length) : null
      const key = bare !== null && TOOL_NAME.test(bare) ? bare : OTHER
      tools.set(key, (tools.get(key) ?? 0) + 1)
      if (row.level === 'ERROR') errors.tools++
    }
    if (row.type === 'GENERATION') {
      for (const [key, value] of Object.entries(row.usage)) {
        // Langfuse's total is the sum of the other keys, so only what it holds past them, as a total
        // sent alone, is a token no other key counts; rowOf refuses a total below them.
        if (key === policy.langfuseUsageTotalKey) {
          const rest = value - sumBut(row.usage, key)
          if (rest > 0) {
            tokens.unbucketed += rest
            unbucketedKeys.add(TOOL_NAME.test(key) ? key : OTHER)
          }
          continue
        }
        const bucket = bucketOf.get(key)
        if (bucket) tokens[bucket] += value
        else {
          tokens.unbucketed += value
          unbucketedKeys.add(TOOL_NAME.test(key) ? key : OTHER)
        }
      }
      if (row.cost !== null) cost = (cost ?? 0) + row.cost
      if (row.level === 'ERROR') errors.generations++
    }
  }
  return {
    turns,
    toolCalls: Object.fromEntries([...tools].sort(([a], [b]) => byCodePoint(a, b))),
    tokens,
    unbucketedKeys: [...unbucketedKeys].sort(byCodePoint),
    costUsd: cost === null ? null : Math.round(cost * 1e6) / 1e6,
    wallSeconds: rows.length ? Math.round((last - first) / 1000) : 0,
    turnSeconds: Math.round(turnMs / 1000),
    errors,
    observations: rows.length,
  }
}

/** One pending run's entry: its window, its trace and its figures, read from every project in `projects`. */
async function runEntry(analysis, projects, policy) {
  const entry = { run: analysis.run, issue: analysis.issue, session: analysis.session }
  if (analysis.session === null) return { ...entry, window: null, trace: 'no session line', foundIn: [], failures: [], figures: null }
  const window = windowOf(analysis, policy)
  const rows = []
  const foundIn = []
  const failures = []
  for (const project of projects) {
    try {
      const held = await observationsOf(project, analysis.session, window, policy)
      if (held.length) foundIn.push(project.name)
      rows.push(...held)
    } catch (error) {
      if (!(error instanceof Failure)) throw error
      failures.push({ project: project.name, reason: error.message })
    }
  }
  const trace = failures.length ? 'failed' : rows.length ? 'found' : 'none'
  return { ...entry, window: { from: isoSecond(window.from), to: isoSecond(window.to) }, trace, foundIn, failures, figures: trace === 'found' ? figuresOf(rows, window, policy) : null }
}

/* ------------------------------------------------------------------------------- the command ----- */

/** The report as text. */
export function render(report) {
  const projects = Object.entries(report.projects).map(([name, state]) => `${name} ${state}`)
  const out = [`${NAME}: ${report.runs.length} pending run(s); ${projects.join(', ')}${report.failed ? `; ${report.failed} run(s) failed` : ''}`]
  for (const r of report.runs) {
    out.push(`  ${r.run}  ${r.issue}${r.session ? `  ${r.session}` : ''}`)
    if (r.window) out.push(`    window ${r.window.from} to ${r.window.to}`)
    if (r.trace === 'failed') for (const f of r.failures) out.push(`    failed in ${f.project}: ${f.reason}`)
    if (r.trace !== 'found') {
      if (r.trace !== 'failed') out.push(`    ${r.trace}`)
      continue
    }
    const f = r.figures
    const tools = Object.entries(f.toolCalls).map(([name, n]) => `${name} ${n}`)
    out.push(`    found in ${r.foundIn.join(' and ')}: ${f.observations} observations, ${f.turns} turn(s), ${f.wallSeconds} s wall, ${f.turnSeconds} s in turns`)
    out.push(`    tool calls: ${tools.length ? tools.join(', ') : 'none'}`)
    out.push(`    tokens: input ${f.tokens.input}, cache read ${f.tokens.cacheRead}, cache write ${f.tokens.cacheWrite}, output ${f.tokens.output}${f.tokens.unbucketed ? `, unbucketed ${f.tokens.unbucketed} (${f.unbucketedKeys.join(', ')})` : ''}`)
    out.push(`    cost: ${f.costUsd === null ? 'none given' : `$${f.costUsd}`}; at level ERROR: ${f.errors.generations} generation(s), ${f.errors.tools} tool call(s), ${f.errors.spans} span(s)`)
  }
  return out.join('\n')
}

/** The command, its environment and output handed in so the selftest runs it whole. */
export async function main(argv, deps = {}) {
  const env = deps.env ?? process.env
  const out = deps.out ?? ((t) => process.stdout.write(`${t}\n`))
  const err = deps.err ?? ((t) => process.stderr.write(`${t}\n`))
  const overridden = Boolean(env[ROOT_ENV])
  const root = overridden ? resolve(env[ROOT_ENV]) : REPO_ROOT

  let json = false
  let pendingFile = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') json = true
    else if (argv[i] === '--pending' && argv[i + 1] && !argv[i + 1].startsWith('--')) pendingFile = argv[++i]
    else {
      err(`${NAME}: unknown or incomplete flag ${JSON.stringify(argv[i])}. See the header of scripts/prompt-run-figures.mjs.`)
      return 2
    }
  }

  let policy
  try {
    policy = loadPolicy(root)
  } catch (error) {
    if (!(error instanceof Failure)) throw error
    err(`${NAME} FAILED: ${error.message}`)
    return 1
  }
  const projects = projectsOf(policy, env)
  if (projects.problems.length) {
    for (const p of projects.problems) err(`${NAME} FAILED: ${p}`)
    return 1
  }
  if (projects.read.length === 0) {
    const named = Object.entries(policy.langfuseProjects)
      .sort(([a], [b]) => byCodePoint(a, b))
      .map(([name, row]) => `${row.publicKeyEnv} and ${row.secretKeyEnv} for \`${name}\``)
    const skip = `no Langfuse project's keys are set (${named.join('; ')}), so no request was made and nothing was read. Set a project's two keys and run again; their absence is never a failure.`
    out(json ? JSON.stringify({ skip }) : `${NAME}: ${skip}`)
    return 0
  }
  if (pendingFile === null) {
    err(`${NAME}: --pending <file> is required beside a project's keys: the file \`node scripts/prompt-runs.mjs --only pending --json\` wrote, in a step that held no Langfuse key. See the header of scripts/prompt-run-figures.mjs.`)
    return 2
  }

  let pending
  try {
    let text
    try {
      text = readFileSync(resolve(pendingFile), 'utf8')
    } catch (error) {
      throw new Failure(`the pending file ${pendingFile} cannot be read (${error.code ?? error.message})`)
    }
    pending = pendingFrom(text)
  } catch (error) {
    if (!(error instanceof Failure)) throw error
    err(`${NAME} FAILED: ${error.message}`)
    return 1
  }
  const runs = []
  for (const analysis of pending) runs.push(await runEntry(analysis, projects.read, policy))
  const states = [...projects.read.map((p) => [p.name, 'read']), ...projects.absent.map((name) => [name, 'not configured'])].sort(([a], [b]) => byCodePoint(a, b))
  const report = { projects: Object.fromEntries(states), runs, failed: runs.filter((r) => r.trace === 'failed').length }
  out(json ? JSON.stringify(report) : render(report))
  return report.failed ? 1 : 0
}

/* ------------------------------------------------------------------------------ the selftest ----- */

/** A child process, run without blocking the stub it talks to: its status and what it printed. */
function spawned(command, args, env) {
  return new Promise((done) => {
    const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (data) => (stdout += data))
    child.stderr.on('data', (data) => (stderr += data))
    child.on('error', (error) => done({ status: null, stdout, stderr: `${stderr}${error.message}` }))
    child.on('close', (status) => done({ status, stdout, stderr }))
  })
}

const CANARY = 'CANARY-7f3a'
const KEYS_OF = {
  container: { publicKey: 'pk-lf-canary-container', secretKey: 'sk-lf-canary-container' },
  host: { publicKey: 'pk-lf-canary-host', secretKey: 'sk-lf-canary-host' },
}

/**
 * A stub of Langfuse's observations API on loopback, holding a project for each key pair of `held`,
 * each with its observations. It filters and pages as the API does, ignores `fields` as a server
 * might, so every row carries the text fields a careless reader would print, and records each
 * request with the host it was sent to. `state.mode` breaks one thing at a time.
 */
function stubLangfuse(path, held) {
  const state = { mode: {}, requests: [], served429: 0 }
  const server = createServer((request, response) => {
    const send = (status, body, headers = {}) => {
      response.writeHead(status, { 'content-type': 'application/json', ...headers })
      response.end(JSON.stringify(body))
    }
    const url = new URL(request.url, 'http://stub')
    const [, encoded] = /^Basic (.+)$/.exec(request.headers.authorization ?? '') ?? []
    const [publicKey, secretKey] = Buffer.from(encoded ?? '', 'base64').toString('utf8').split(':')
    const name = Object.keys(KEYS_OF).find((n) => held[n] && KEYS_OF[n].publicKey === publicKey && KEYS_OF[n].secretKey === secretKey) ?? null
    const recordedRequest = { project: name, path: url.pathname, query: Object.fromEntries(url.searchParams), served: [] }
    state.requests.push(recordedRequest)
    const { mode } = state
    if (mode.hangFirst && state.requests.length === 1) return
    if (mode.trickleFirst && state.requests.length === 1) {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.write('{"data":[')
      return
    }
    if (url.pathname !== path || mode.notFound) return send(404, { message: `no such route ${CANARY}` })
    if (!name || (mode.refuse ?? []).includes(name)) return send(401, { message: `Invalid credentials ${CANARY}` })
    if (mode.rateLimited && (mode.rateLimited.times === 'always' || state.served429 < mode.rateLimited.times)) {
      state.served429++
      return send(429, { message: 'rate limited' }, { 'retry-after': String(mode.rateLimited.retryAfter) })
    }
    if (mode.malformed) return send(200, { items: [] })
    if (mode.endlessEmpty) return send(200, { data: [], meta: { cursor: `c${state.requests.length}` } })
    const q = url.searchParams
    const from = Date.parse(q.get('fromStartTime'))
    const to = Date.parse(q.get('toStartTime'))
    const rows = held[name]
      .filter((r) => mode.ignoreSession || r.sessionId === q.get('sessionId'))
      .filter((r) => mode.ignoreFrom || Date.parse(r.startTime) >= from)
      .filter((r) => mode.ignoreTo || Date.parse(r.startTime) < to)
      // Latest first, and on a tie by id, descending, as the one tie in asdlc-openspec-ic9h.10's second
      // read ran: b81c… before 2b18… at the same instant. One tie fits that order and does not prove it.
      .sort((a, b) => byCodePoint(b.startTime, a.startTime) || byCodePoint(b.id, a.id))
    const limit = Number(q.get('limit'))
    const offset = q.get('cursor') ? JSON.parse(Buffer.from(q.get('cursor'), 'base64').toString('utf8')).offset : 0
    const step = mode.overlap ? limit - 1 : limit
    const total = held.totalKey
    const lowered = (r) => (r.type === 'GENERATION' && Object.keys(r.usageDetails).length > 1 ? { ...r, usageDetails: { ...r.usageDetails, [total]: 0 } } : r)
    const data = rows.slice(offset, offset + limit).map((r) => (mode.totalBelowSum ? lowered(r) : r))
    recordedRequest.served = data.map((r) => r.id)
    const more = offset + limit < rows.length
    const cursor = mode.repeatCursor ? Buffer.from(JSON.stringify({ offset: 0 })).toString('base64') : Buffer.from(JSON.stringify({ offset: offset + step })).toString('base64')
    const meta = more || mode.repeatCursor ? { cursor } : mode.nullCursorEnd ? { cursor: null } : {}
    return send(200, { data, meta })
  })
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done({ server, state, url: `http://127.0.0.1:${server.address().port}`, port: server.address().port })))
}

async function selftest() {
  const results = []
  const ok = (what, cond, detail = '') => results.push({ what, ok: Boolean(cond), detail })
  const live = readPolicy(REPO_ROOT)
  const policy = loadPolicy(REPO_ROOT)
  const { promptReviewAnalysisMarker: A, promptReviewReadMarker: R, promptReviewLoadedHeading: HEADING, promptReviewSessionLabel: LABEL } = live
  const PROMPT = Object.keys(live.promptWordBudgets).sort(byCodePoint)[0]
  const PATH = policy.langfuseObservationsPath
  const TURN = policy.langfuseTurnName
  const TOOL = policy.langfuseToolNamePrefix
  const bucket = (name) => policy.langfuseUsageBuckets[name][0]
  const S1 = '11111111-1111-4111-8111-111111111111'
  const S2 = '22222222-2222-4222-8222-222222222222'
  const S3 = '33333333-3333-4333-8333-333333333333'
  const T0 = Date.parse('2026-10-07T10:00:00Z')
  const T1 = Date.parse('2026-10-08T12:00:00Z')
  const T2 = Date.parse('2026-10-08T13:00:00Z')
  const T3 = Date.parse('2026-10-08T14:00:00Z')
  const T4 = Date.parse('2026-10-08T15:00:00Z')
  const NOW = '2026-10-09T00:00:00Z'
  const s = 1000
  const run = (issue, at) => `${issue}@${isoSecond(at)}`

  /**
   * The usage group's fields as Langfuse sends them (asdlc-openspec-ic9h.10's second read): on a
   * GENERATION its usage, with the `total` Langfuse adds as the sum of the others, and its cost; on
   * any other type, empty tables, zeros and nulls.
   */
  const TOTAL = policy.langfuseUsageTotalKey
  const sumOf = (usage, part) => Object.entries(usage).filter(([key]) => key.includes(part)).reduce((n, [, v]) => n + v, 0)
  const usageFields = (type, usage = {}, cost = null) => {
    if (type !== 'GENERATION') return { usageDetails: {}, inputUsage: 0, outputUsage: 0, totalUsage: 0, costDetails: {}, inputCost: null, outputCost: null, totalCost: null, usagePricingTierId: null, usagePricingTierName: null }
    const total = Object.values(usage).reduce((n, v) => n + v, 0)
    const priced = cost !== null
    return {
      usageDetails: { ...usage, [TOTAL]: total },
      inputUsage: sumOf(usage, 'input'),
      outputUsage: sumOf(usage, 'output'),
      totalUsage: total,
      costDetails: priced ? { [TOTAL]: cost } : {},
      inputCost: null,
      outputCost: null,
      totalCost: cost,
      usagePricingTierId: priced ? 'tier_default' : null,
      usagePricingTierName: priced ? 'Standard' : null,
    }
  }
  /** One observation as the stub serves it: every core, basic and usage field, and the text fields a careless reader would print. */
  let id = 0
  const obs = (session, type, name, start, end, { level = 'DEFAULT', usage, cost = null, raw = {} } = {}) => ({
    id: `obs-${++id}`,
    traceId: `trace-${session}`,
    startTime: new Date(start).toISOString(),
    endTime: end === null ? null : new Date(end).toISOString(),
    projectId: 'project-id',
    parentObservationId: null,
    type,
    name,
    level,
    statusMessage: level === 'ERROR' ? `failed: ${CANARY}` : '',
    version: '',
    environment: 'default',
    latency: 0,
    timeToFirstToken: null,
    userId: '',
    sessionId: session,
    isRootObservation: type === 'SPAN',
    bookmarked: false,
    public: false,
    modelId: null,
    inputPrice: null,
    outputPrice: null,
    totalPrice: null,
    input: { role: 'user', content: `the prompt ${CANARY}` },
    output: { role: 'assistant', content: `the reply ${CANARY}` },
    metadata: { cwd: `/home/${CANARY}` },
    ...usageFields(type, usage, cost),
    ...raw,
  })
  /** The host's observations of S1: one before its window, eight in it across four pages of two, one after. */
  const hostRows = [
    obs(S1, 'TOOL', `${TOOL}Bash`, T0 - 3600 * s, T0 - 3590 * s),
    obs(S1, 'SPAN', TURN, T1 - 3600 * s, T1 - 3000 * s),
    obs(S1, 'GENERATION', 'LLM Call', T1 - 3590 * s, T1 - 3580 * s, { usage: { [bucket('input')]: 10, [bucket('output')]: 5, [bucket('cacheRead')]: 100, [bucket('cacheWrite')]: 50 }, cost: 0.001 }),
    obs(S1, 'TOOL', `${TOOL}Read`, T1 - 3570 * s, T1 - 3569 * s),
    obs(S1, 'TOOL', `${TOOL}Bash`, T1 - 3560 * s, T1 - 3550 * s, { level: 'ERROR' }),
    obs(S1, 'TOOL', `${TOOL}cat ${CANARY} /etc`, T1 - 3540 * s, null),
    obs(S1, 'GENERATION', 'Subagent LLM Call', T1 - 3500 * s, T1 - 3400 * s, { level: 'ERROR', usage: { [bucket('input')]: 1, [bucket('output')]: 2, [policy.langfuseUsageBuckets.cacheWrite.at(-1)]: 7, [`a key ${CANARY}`]: 3, total_tokens: 4 } }),
    // A generation that carries Langfuse's total alone, as a client that reports one count would send it.
    obs(S1, 'GENERATION', 'LLM Call', T1 - 3300 * s, T1 - 3290 * s, { raw: { usageDetails: { [TOTAL]: 5 }, totalUsage: 5 } }),
    obs(S1, 'SPAN', TURN, T1 - 600 * s, T1 + 600 * s, { level: 'ERROR' }),
    obs(S1, 'TOOL', `${TOOL}Edit`, T1 + 60 * s, T1 + 61 * s),
  ]
  /** The container's observations of S2: one turn and its one generation. */
  const containerRows = [obs(S2, 'SPAN', TURN, T2 - 100 * s, T2 - 50 * s), obs(S2, 'GENERATION', 'LLM Call', T2 - 90 * s, T2 - 80 * s, { usage: { [bucket('input')]: 3, [bucket('output')]: 4 }, cost: 0.5 })]
  const EXPECTED_B = {
    turns: 2,
    toolCalls: { [OTHER]: 1, Bash: 1, Read: 1 },
    tokens: { input: 11, cacheRead: 100, cacheWrite: 57, output: 7, unbucketed: 12 },
    unbucketedKeys: [OTHER, TOTAL, 'total_tokens'],
    costUsd: 0.001,
    wallSeconds: 3600,
    turnSeconds: 1200,
    errors: { generations: 1, tools: 1, spans: 1 },
    observations: 8,
  }
  const EXPECTED_C = { turns: 1, toolCalls: {}, tokens: { input: 3, cacheRead: 0, cacheWrite: 0, output: 4, unbucketed: 0 }, unbucketedKeys: [], costUsd: 0.5, wallSeconds: 50, turnSeconds: 50, errors: { generations: 0, tools: 0, spans: 0 }, observations: 2 }
  /**
   * asdlc-openspec-ic9h.10's second read, row for row as Langfuse US answered it on 2026-10-10, but
   * its project id, which that issue's note of the same day holds as JSON: session RS's one turn, a
   * host session of 2026-09-26, served three to a page as that read asked.
   */
  const RS = 'c3cfe0b4-feec-40ad-8ac9-cf9a064fec63'
  const RT = 'ca733b34d8e38db3c9a477802380f3da'
  const NO_USAGE = { usageDetails: {}, inputUsage: 0, outputUsage: 0, totalUsage: 0, costDetails: {}, inputCost: null, outputCost: null, totalCost: null, usagePricingTierId: null, usagePricingTierName: null }
  const recorded = (row) => ({ traceId: RT, projectId: 'project-id', level: 'DEFAULT', statusMessage: '', version: '', environment: 'default', timeToFirstToken: null, userId: '', sessionId: RS, bookmarked: false, public: false, modelId: null, inputPrice: null, outputPrice: null, totalPrice: null, ...row })
  const RECORDED = [
    recorded({
      id: '9d9f3dd6aae45dac', startTime: '2026-09-26T17:00:33.969Z', endTime: '2026-09-26T17:00:35.738Z', parentObservationId: 'b81c6827068d716d', type: 'GENERATION', name: 'LLM Call',
      usageDetails: { input: 8, output: 97, cache_read_input_tokens: 36033, input_cache_creation_1h: 2459, total: 38597 }, inputUsage: 38500, outputUsage: 97, totalUsage: 38597,
      costDetails: { input: 0.000008, output: 0.000485, cache_read_input_tokens: 0.0036033, input_cache_creation_1h: 0.004918, total: 0.0090143 }, inputCost: 0.0085293, outputCost: 0.000485, totalCost: 0.0090143,
      usagePricingTierId: 'cmgt5gnkv000104jx171tbq4e_tier_default', usagePricingTierName: 'Standard', latency: 1.769, isRootObservation: false,
    }),
    recorded({ id: '6d4fc6262cc10397', startTime: '2026-09-26T17:00:33.902Z', endTime: '2026-09-26T17:00:33.969Z', parentObservationId: 'b81c6827068d716d', type: 'TOOL', name: 'Tool: Read', ...NO_USAGE, latency: 0.067, isRootObservation: false }),
    recorded({ id: 'b81c6827068d716d', startTime: '2026-09-26T17:00:31.562Z', endTime: '2026-09-26T17:00:35.738Z', parentObservationId: '953f8eee7e776bcd', type: 'SPAN', name: 'Conversational Turn', ...NO_USAGE, latency: 4.176, isRootObservation: true }),
    recorded({
      id: '2b1864431a231109', startTime: '2026-09-26T17:00:31.562Z', endTime: '2026-09-26T17:00:33.902Z', parentObservationId: 'b81c6827068d716d', type: 'GENERATION', name: 'LLM Call',
      usageDetails: { input: 10, output: 133, cache_read_input_tokens: 13856, input_cache_creation_1h: 22177, total: 36176 }, inputUsage: 36043, outputUsage: 133, totalUsage: 36176,
      costDetails: { input: 0.00001, output: 0.000665, cache_read_input_tokens: 0.0013856, input_cache_creation_1h: 0.044354, total: 0.0464146 }, inputCost: 0.045749599999999994, outputCost: 0.000665, totalCost: 0.0464146,
      usagePricingTierId: 'cmgt5gnkv000104jx171tbq4e_tier_default', usagePricingTierName: 'Standard', latency: 2.34, isRootObservation: false,
    }),
  ]
  /** Its figures, worked by hand: the input tokens 74,543 and the output 230 that asdlc-openspec-pnp's note recorded for this trace. */
  const EXPECTED_RECORDED = { turns: 1, toolCalls: { Read: 1 }, tokens: { input: 18, cacheRead: 49889, cacheWrite: 24636, output: 230, unbucketed: 0 }, unbucketedKeys: [], costUsd: 0.055429, wallSeconds: 4, turnSeconds: 4, errors: { generations: 0, tools: 0, spans: 0 }, observations: 4 }

  /** An analysis's notes in D-44's form, with a session line where `session` is given. */
  const analysis = (runId, session) => [`${A} ${runId}`, '', HEADING, `${PROMPT} abc1234`, '2.1.295 (Claude Code)', ...(session ? [`${LABEL} ${session}`] : []), '', 'What made the run slower or wrong: nothing.'].join('\n')
  /** The tracker: S1's read analysis at T0, and four pending ones: S1's at T1, S2's at T2, one with no session line at T3, S3's at T4. */
  const ISSUES = [
    { id: 'example-a', notes: `${analysis(run('example-a', T0), S1)}\n${R} ${run('example-a', T0)} no change` },
    { id: 'example-b', notes: analysis(run('example-b', T1), S1) },
    { id: 'example-c', notes: analysis(run('example-c', T2), S2) },
    { id: 'example-d', notes: analysis(run('example-d', T3), null) },
    { id: 'example-e', notes: analysis(run('example-e', T4), S3) },
  ]

  const base = mkdtempSync(join(tmpdir(), 'prompt-run-figures-'))
  const stub = await stubLangfuse(PATH, { container: containerRows, host: [...hostRows, ...RECORDED], totalKey: TOTAL })
  // A port that nothing listens on: bound once, then let go.
  const closed = await new Promise((done) => {
    const probe = createServer().listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => done(`http://127.0.0.1:${port}`))
    })
  })
  const envBase = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('LANGFUSE_') && key !== ROOT_ENV && key !== RUNS_ROOT_ENV))
  const envOf = (names) => Object.assign({}, ...names.map((n) => ({ [policy.langfuseProjects[n].publicKeyEnv]: KEYS_OF[n].publicKey, [policy.langfuseProjects[n].secretKeyEnv]: KEYS_OF[n].secretKey })))
  const BOTH = envOf(['container', 'host'])
  let index = 0
  /** A fixture root: the live policy pointed at the stub with pages of two, doctored by `change`. */
  const fixture = (change) => {
    const root = join(base, `case-${++index}`)
    copyPolicy(REPO_ROOT, root)
    editPolicy(root, (p) => {
      p.langfuseBaseUrl = stub.url
      p.langfusePageLimit = 2
      change?.(p)
    })
    return root
  }

  try {
    /* The pending file, as the workflow's earlier step is to write it: `prompt-runs` itself, over the fixture export, with no Langfuse key. */
    const runsRoot = join(base, 'tracker')
    copyPolicy(REPO_ROOT, runsRoot)
    writeFileSync(join(runsRoot, 'export.jsonl'), ISSUES.map((i) => JSON.stringify(i)).join('\n') + '\n')
    const made = await spawned(process.execPath, [join(REPO_ROOT, 'scripts', 'prompt-runs.mjs'), '--only', 'pending', '--json', '--now', NOW], { ...envBase, [RUNS_ROOT_ENV]: runsRoot })
    const PENDING = join(base, 'pending.json')
    writeFileSync(PENDING, made.stdout)
    if (made.status !== 0) throw new Error(`prompt-runs did not write the pending file: ${made.stderr}`)

    /** The command run whole, as a child, over a fixture: its status, what it printed, the report it gave and the requests the stub saw. */
    const figures = async ({ change, keys = BOTH, mode = {}, argv = ['--json', '--pending', PENDING] } = {}) => {
      const root = fixture(change)
      Object.assign(stub.state, { mode, requests: [], served429: 0 })
      const r = await spawned(process.execPath, [SELF, ...argv], { ...envBase, ...keys, [ROOT_ENV]: root })
      let report = null
      try {
        report = argv.includes('--json') ? JSON.parse(r.stdout) : null
      } catch {}
      const all = `${r.stdout}${r.stderr}`
      const leaked = [CANARY, ...Object.values(KEYS_OF).flatMap((k) => [k.publicKey, k.secretKey])].filter((t) => all.includes(t))
      return { ...r, report, requests: [...stub.state.requests], leaked }
    }
    const runOf = (report, issue) => report?.runs?.find((r) => r.issue === issue)
    const failedBy = (r, issue, project, reason) => {
      const entry = runOf(r.report, issue)
      return r.status === 1 && entry?.trace === 'failed' && entry.figures === null && entry.failures.some((f) => f.project === project && reason.test(f.reason))
    }

    /* The control: both projects, the session's earlier analysis opening one window, paging, and no text or key in the output. */
    const c = await figures()
    const b = runOf(c.report, 'example-b')
    const controlHolds = c.status === 0 && c.leaked.length === 0 && JSON.stringify(b?.figures) === JSON.stringify(EXPECTED_B)
    ok('control: both projects read, exit 0, and the run read across four pages has the figures worked by hand', controlHolds, `${c.status} ${c.stderr} ${JSON.stringify(b)}`)
    if (!controlHolds) throw new Error('the control does not pass, so no other case can be trusted')
    ok('control: the output holds no input, output, metadata, status message, unsafe tool name or usage key, and no key', c.leaked.length === 0, c.leaked.join(', '))
    ok("a run's window opens at its session's earlier analysis and ends at its run id's time", JSON.stringify(b.window) === JSON.stringify({ from: isoSecond(T0), to: isoSecond(T1) }), JSON.stringify(b.window))
    ok(
      "a run whose session wrote no earlier analysis opens `langfuseLookbackDays` before its run id's time",
      JSON.stringify(runOf(c.report, 'example-c')?.window) === JSON.stringify({ from: isoSecond(T2 - policy.langfuseLookbackDays * DAY_MS), to: isoSecond(T2) }),
      JSON.stringify(runOf(c.report, 'example-c')?.window),
    )
    ok('two projects: a session the container holds is found there, with its figures', runOf(c.report, 'example-c')?.trace === 'found' && JSON.stringify(runOf(c.report, 'example-c').foundIn) === '["container"]' && JSON.stringify(runOf(c.report, 'example-c').figures) === JSON.stringify(EXPECTED_C), JSON.stringify(runOf(c.report, 'example-c')))
    ok('the run the host holds is found in the host alone', JSON.stringify(b.foundIn) === '["host"]', JSON.stringify(b.foundIn))
    ok(
      'an analysis with no session line asks nothing and says so: every request names one of the three sessions',
      runOf(c.report, 'example-d')?.trace === 'no session line' && c.requests.every((q) => [S1, S2, S3].includes(q.query.sessionId)),
      `${JSON.stringify(runOf(c.report, 'example-d'))} ${JSON.stringify([...new Set(c.requests.map((q) => q.query.sessionId))])}`,
    )
    ok('a session no project holds is "none", with no figures', runOf(c.report, 'example-e')?.trace === 'none' && runOf(c.report, 'example-e').figures === null, JSON.stringify(runOf(c.report, 'example-e')))
    ok('the read analysis is not pending, and so not read', !runOf(c.report, 'example-a'), JSON.stringify(c.report.runs.map((r) => r.issue)))
    ok(
      `every request asks for the field groups \`langfuseFieldGroups\` names, ${policy.langfuseFieldGroups.join(',')}, and none of io or metadata`,
      c.requests.length > 0 && c.requests.every((q) => q.query.fields === policy.langfuseFieldGroups.join(',') && q.path === PATH),
      JSON.stringify(c.requests.map((q) => q.query.fields)),
    )
    const pagesOfB = c.requests.filter((q) => q.project === 'host' && q.query.sessionId === S1)
    ok(
      'paging: the host is asked four times for S1, the last three each with the cursor the page before gave, and stops at a page with none',
      pagesOfB.length === 4 && pagesOfB[0].query.cursor === undefined && pagesOfB.slice(1).every((q) => typeof q.query.cursor === 'string') && pagesOfB.every((q) => q.query.limit === '2'),
      JSON.stringify(pagesOfB.map((q) => q.query)),
    )
    ok("each request is bounded by the run's window", pagesOfB.every((q) => q.query.fromStartTime === new Date(T0).toISOString() && q.query.toStartTime === new Date(T1).toISOString()), JSON.stringify(pagesOfB[0]?.query))
    ok('each project is asked with its own keys, and both are asked for every run with a session', ['container', 'host'].every((p) => [S1, S2, S3].every((sid) => c.requests.some((q) => q.project === p && q.query.sessionId === sid))), JSON.stringify(c.requests.map((q) => [q.project, q.query.sessionId])))
    ok('control: the projects are both "read"', JSON.stringify(c.report.projects) === JSON.stringify({ container: 'read', host: 'read' }), JSON.stringify(c.report.projects))

    /* asdlc-openspec-ic9h.10's second read, replayed: its rows, three to a page, give the figures worked by hand from it. */
    const RECORDED_PENDING = join(base, 'recorded-pending.json')
    writeFileSync(RECORDED_PENDING, JSON.stringify({ pending: { analyses: [{ run: 'example-p@2026-09-26T17:05:22Z', issue: 'example-p', session: RS, previous: null }] } }))
    const rec = await figures({ change: (p) => (p.langfusePageLimit = 3), argv: ['--json', '--pending', RECORDED_PENDING] })
    const recPages = rec.requests.filter((q) => q.project === 'host' && q.query.sessionId === RS)
    ok(
      "the second read's rows, as Langfuse answered them: two pages of three and one, and the figures worked from them, Langfuse's `total` in no bucket",
      rec.status === 0 && rec.leaked.length === 0 && JSON.stringify(runOf(rec.report, 'example-p')?.figures) === JSON.stringify(EXPECTED_RECORDED) && recPages.length === 2 && recPages[0].query.cursor === undefined && typeof recPages[1].query.cursor === 'string',
      `${rec.status} ${rec.stderr} ${JSON.stringify(runOf(rec.report, 'example-p')?.figures)} ${recPages.length}`,
    )
    ok(
      "the stub served the second read's pages as Langfuse did: its three latest rows, the tied two by id descending, then the fourth",
      JSON.stringify(recPages.map((q) => q.served)) === JSON.stringify([['9d9f3dd6aae45dac', '6d4fc6262cc10397', 'b81c6827068d716d'], ['2b1864431a231109']]),
      JSON.stringify(recPages.map((q) => q.served)),
    )

    const text = await figures({ argv: ['--pending', PENDING] })
    ok(
      'the text report names each run, its window, its figures and "no session line" and "none"',
      text.status === 0 && text.leaked.length === 0 && /example-b@\S+ {2}example-b {2}1{8}-/.test(text.stdout) && /found in host: 8 observations, 2 turn\(s\), 3600 s wall, 1200 s in turns/.test(text.stdout) && /\n {4}no session line\n/.test(text.stdout) && /\n {4}none(\n|$)/.test(text.stdout),
      text.stdout,
    )

    /* The keys, and the pending file. */
    for (const [what, keys] of [
      ['no key at all', {}],
      ['blank keys', Object.fromEntries(Object.keys(BOTH).map((k) => [k, '   ']))],
    ]) {
      const r = await figures({ keys })
      ok(`${what}: exit 0, says why, and asks nothing`, r.status === 0 && r.requests.length === 0 && /^\{"skip":"no Langfuse project's keys are set \(/.test(r.stdout) && r.stderr === '', `${r.status} ${r.stdout} ${r.stderr}`)
    }
    const textSkip = await figures({ keys: {}, argv: [] })
    ok("no key at all and no pending file, as text: exit 0, one line naming each project's two variables", textSkip.status === 0 && new RegExp(`^${NAME}: no Langfuse project's keys are set \\(.*${policy.langfuseProjects.host.secretKeyEnv} for \`host\``).test(textSkip.stdout), textSkip.stdout)
    const hostOnly = await figures({ keys: envOf(['host']) })
    ok(
      'one project configured: the other is "not configured" and asked nothing, and a session only it holds is "none"',
      hostOnly.status === 0 && hostOnly.report?.projects.container === 'not configured' && hostOnly.requests.every((q) => q.project === 'host') && runOf(hostOnly.report, 'example-c')?.trace === 'none',
      `${hostOnly.status} ${hostOnly.stderr} ${JSON.stringify(hostOnly.report?.projects)}`,
    )
    const half = await figures({ keys: { ...envOf(['container']), [policy.langfuseProjects.host.publicKeyEnv]: KEYS_OF.host.publicKey } })
    ok('a project with its public key set and not its secret: exit 1, naming the missing variable, and asks nothing', half.status === 1 && half.requests.length === 0 && new RegExp(`the project \`host\` has ${policy.langfuseProjects.host.publicKeyEnv} set and not ${policy.langfuseProjects.host.secretKeyEnv}`).test(half.stderr), half.stderr)
    const noPending = await figures({ argv: ['--json'] })
    ok("keys set and no pending file: exit 2, naming the flag, and asks nothing", noPending.status === 2 && noPending.requests.length === 0 && /--pending <file> is required beside a project's keys/.test(noPending.stderr), noPending.stderr)
    const missing = await figures({ argv: ['--json', '--pending', join(base, 'no-such-file.json')] })
    ok('a pending file that cannot be read: exit 1, by its reason, and asks nothing', missing.status === 1 && missing.requests.length === 0 && /the pending file \S+ cannot be read \(ENOENT\)/.test(missing.stderr), missing.stderr)
    const one = { run: run('example-b', T1), issue: 'example-b', session: S1, previous: run('example-a', T0) }
    const printed = (analyses) => JSON.stringify({ pending: { analyses } })
    ok('pending as `prompt-runs` prints it is read', pendingFrom(printed([one])).length === 1)
    for (const [what, body] of [
      ['a session id that is not one', printed([{ ...one, session: 'not-a-session' }])],
      ["a `previous` after the run's own time", printed([{ ...one, previous: run('example-z', T2) }])],
      ['a run id that is not one', printed([{ ...one, run: 'example-b' }])],
      ['no pending section', JSON.stringify({ held: [] })],
    ]) {
      let reason = null
      try {
        pendingFrom(body)
      } catch (error) {
        reason = error instanceof Failure ? error.message : `threw ${error.message}`
      }
      ok(`pending with ${what} is refused, by its reason`, /holds its pending analyses in another shape than `prompt-runs --only pending --json` prints/.test(reason ?? ''), String(reason))
    }

    /* What the API answers. */
    const refused = await figures({ mode: { refuse: ['container'] } })
    ok('a 401 from one project: exit 1, each run with a session failed in that project by its reason, with no figures, and no text of the answer printed', failedBy(refused, 'example-b', 'container', /^the project's keys were refused \(401\)$/) && refused.leaked.length === 0, `${refused.status} ${JSON.stringify(runOf(refused.report, 'example-b'))}`)
    const once = await figures({ mode: { rateLimited: { times: 1, retryAfter: 0 } } })
    ok("a 429 with Retry-After 0, once: sent again, and the figures are the control's, exit 0", once.status === 0 && JSON.stringify(runOf(once.report, 'example-b')?.figures) === JSON.stringify(EXPECTED_B) && once.requests.length === c.requests.length + 1, `${once.status} ${once.requests.length} ${c.requests.length}`)
    const always = await figures({ change: (p) => (p.langfuseRetryLimit = 1), mode: { rateLimited: { times: 'always', retryAfter: 0 } } })
    ok('a 429 at every try: failed by its reason after `langfuseRetryLimit` retries', failedBy(always, 'example-b', 'container', /^rate limited \(429\) after `langfuseRetryLimit` \(1\) retries$/), JSON.stringify(runOf(always.report, 'example-b')))
    const long = await figures({ mode: { rateLimited: { times: 1, retryAfter: policy.langfuseRetryMaxWaitSeconds + 1 } } })
    ok('a 429 asking for longer than `langfuseRetryMaxWaitSeconds`: failed by its reason, without the wait', failedBy(long, 'example-b', 'container', /^rate limited \(429\) for \d+ seconds, past `langfuseRetryMaxWaitSeconds`/), JSON.stringify(runOf(long.report, 'example-b')))
    const blank = await figures({ mode: { rateLimited: { times: 1, retryAfter: ' ' } } })
    ok('a 429 with a blank Retry-After: failed by its reason, not sent again at once', failedBy(blank, 'example-b', 'container', /^rate limited \(429\) with no Retry-After in whole seconds/) && blank.requests.filter((q) => q.project === 'container' && q.query.sessionId === S1).length === 1, JSON.stringify(runOf(blank.report, 'example-b')))
    const notFound = await figures({ mode: { notFound: true } })
    ok('a 404: failed by its reason, never read as no trace', failedBy(notFound, 'example-e', 'host', /^the API answered 404: no observations API v2/), JSON.stringify(runOf(notFound.report, 'example-e')))
    const down = await figures({ change: (p) => (p.langfuseBaseUrl = closed) })
    ok('nothing listening: failed by its reason', failedBy(down, 'example-b', 'host', /^the request did not complete: ECONNREFUSED$/), JSON.stringify(runOf(down.report, 'example-b')))
    const slow = await figures({ change: (p) => (p.langfuseRequestTimeoutSeconds = 1), mode: { hangFirst: true } })
    ok('a request that never answers: failed by its reason once `langfuseRequestTimeoutSeconds` pass, and the other runs are read', failedBy(slow, 'example-b', 'container', /^the request timed out, past `langfuseRequestTimeoutSeconds` \(1\)$/) && runOf(slow.report, 'example-c')?.trace === 'found', JSON.stringify(slow.report?.runs.map((r) => r.trace)))
    const trickle = await figures({ change: (p) => (p.langfuseRequestTimeoutSeconds = 1), mode: { trickleFirst: true } })
    ok('a body that stalls past `langfuseRequestTimeoutSeconds`: failed as timed out, not as a body that is not JSON', failedBy(trickle, 'example-b', 'container', /^the request timed out, past `langfuseRequestTimeoutSeconds` \(1\)$/), JSON.stringify(runOf(trickle.report, 'example-b')))
    const malformed = await figures({ mode: { malformed: true } })
    ok('an answer without `data` and `meta`: failed by its reason', failedBy(malformed, 'example-b', 'container', /^the API answered without the `data` array and the `meta` object/), JSON.stringify(runOf(malformed.report, 'example-b')))
    const foreign = await figures({ mode: { ignoreSession: true } })
    ok("an answer holding another session's observation: failed by its reason, so an ignored filter is never counted as the run", failedBy(foreign, 'example-e', 'host', /^the API answered with an observation of another session/), JSON.stringify(runOf(foreign.report, 'example-e')))
    const before = await figures({ mode: { ignoreFrom: true } })
    ok("an answer holding an observation from before the window, the session's earlier run: failed by its reason", failedBy(before, 'example-b', 'host', /^the API answered with an observation that starts before the window/), JSON.stringify(runOf(before.report, 'example-b')))
    const low = await figures({ mode: { totalBelowSum: true } })
    ok("a generation whose Langfuse total is below the sum of its other keys: failed by its reason, since no figure could say which is right", failedBy(low, 'example-b', 'host', /whose usage total is below the sum of its other keys/), JSON.stringify(runOf(low.report, 'example-b')))
    const after = await figures({ mode: { ignoreTo: true } })
    ok('an answer holding an observation from after the analysis: failed by its reason', failedBy(after, 'example-b', 'host', /^the API answered with an observation that starts at or after the end of the window/), JSON.stringify(runOf(after.report, 'example-b')))
    const nullEnd = await figures({ mode: { nullCursorEnd: true } })
    ok('a last page whose `meta.cursor` is null ends the pages as one with none does', nullEnd.status === 0 && JSON.stringify(runOf(nullEnd.report, 'example-b')?.figures) === JSON.stringify(EXPECTED_B), `${nullEnd.status} ${nullEnd.stderr}`)
    const loop = await figures({ mode: { repeatCursor: true } })
    ok('a cursor given twice, which gives its page twice: failed by its reason, rather than paging for ever', failedBy(loop, 'example-b', 'host', /^the API answered with one observation twice/), JSON.stringify(runOf(loop.report, 'example-b')))
    const endless = await figures({ mode: { endlessEmpty: true } })
    ok('empty pages each with a fresh cursor: failed by its reason at the first, rather than paging for ever', failedBy(endless, 'example-e', 'host', /^the API answered with an empty page that carries a cursor/) && endless.requests.length <= 10, `${endless.requests.length} ${JSON.stringify(runOf(endless.report, 'example-e'))}`)
    const overlap = await figures({ mode: { overlap: true } })
    ok('pages that overlap by a row: failed by its reason, rather than counting the row twice', failedBy(overlap, 'example-b', 'host', /^the API answered with one observation twice/), JSON.stringify(runOf(overlap.report, 'example-b')))

    /* The policy. */
    const policyCase = async (what, change, reason) => {
      const r = await figures({ change })
      ok(`${what}: exit 1, by its reason, and asks nothing`, r.status === 1 && r.requests.length === 0 && reason.test(r.stderr), r.stderr)
    }
    await policyCase('a policy without `langfuseProjects`', (p) => delete p.langfuseProjects, /the policy has no `langfuseProjects`/)
    await policyCase('field groups that ask for io', (p) => p.langfuseFieldGroups.push('io'), /`langfuseFieldGroups` is .*, where it must be a list naming none of io and metadata/)
    await policyCase('field groups without usage', (p) => (p.langfuseFieldGroups = ['core', 'basic']), /`langfuseFieldGroups` is .*, where it must be a list naming basic, core, usage/)
    await policyCase('a base URL over http to a host that is not loopback', (p) => (p.langfuseBaseUrl = 'http://cloud.langfuse.example'), /`langfuseBaseUrl` is .*, where it must be an https URL/)
    await policyCase('a base URL with a path', (p) => (p.langfuseBaseUrl = 'https://us.cloud.langfuse.com/api'), /`langfuseBaseUrl` is .*, where it must be a URL's origin alone/)
    await policyCase('a path of //host, which resolves to another host', (p) => (p.langfuseObservationsPath = `//127.0.0.1:${stub.port + 1}/elsewhere`), /`langfuseObservationsPath` is .*, where it must be a path that opens with one \//)
    await policyCase('a path of /\\host, which resolves to another host', (p) => (p.langfuseObservationsPath = '/\\evil.example/elsewhere'), /`langfuseObservationsPath` is .*, where it must be a path that opens with one \//)
    await policyCase('a usage key in two buckets', (p) => p.langfuseUsageBuckets.output.push(p.langfuseUsageBuckets.input[0]), /`langfuseUsageBuckets` is .*, where it must be a table whose buckets each list usage keys, and no key in two/)
    await policyCase(
      "Langfuse's total key put in a bucket",
      (p) => p.langfuseUsageBuckets.input.push(p.langfuseUsageTotalKey),
      new RegExp(`\`langfuseUsageBuckets\` holds \`langfuseUsageTotalKey\`, ${JSON.stringify(TOTAL)}, the sum of the other keys`),
    )
    await policyCase('two projects naming one variable', (p) => (p.langfuseProjects.container.secretKeyEnv = p.langfuseProjects.host.secretKeyEnv), /`langfuseProjects` is .*, where it must be a table whose rows name each environment variable once/)
    const flag = await figures({ argv: ['--everything'] })
    ok('an unknown flag: exit 2, naming it', flag.status === 2 && /unknown or incomplete flag "--everything"/.test(flag.stderr), flag.stderr)
  } catch (error) {
    ok('the selftest ran to its end', false, error.message)
  } finally {
    stub.server.closeAllConnections?.()
    stub.server.close()
    rmSync(base, { recursive: true, force: true })
  }
  const failed = results.filter((r) => !r.ok)
  for (const { what, ok: held, detail } of results) console.log(`  ${held ? 'ok  ' : 'FAIL'} ${what}${held ? '' : ` -- ${detail}`}`)
  console.log(`${NAME} selftest: ${results.length - failed.length}/${results.length} checks hold, over a stubbed Langfuse on loopback.`)
  return failed.length ? 1 : 0
}

// By real path, as scripts/github-app-token.mjs matches, so a symlinked run still runs.
const runAsMain = () => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(SELF)
  } catch {
    return false
  }
}
if (runAsMain()) {
  process.exitCode = process.argv[2] === '--selftest' && process.argv.length === 3 ? await selftest() : await main(process.argv.slice(2))
}
