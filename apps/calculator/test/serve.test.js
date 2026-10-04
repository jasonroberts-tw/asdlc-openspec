/**
 * The local server's command scenarios: `serve.js`, the file `npm run calculator:serve` runs,
 * started as a process of its own with `process.execPath` and watched from outside, by what it
 * prints, what it answers and how it exits. The scenario on the listening address also calls the
 * command's own listen function in-process, to read the address the server reports.
 *
 * Each `describe` is a requirement's name, verbatim from capability `calculator-local-server`'s
 * spec. Each test is named `[<ID>] <title>` for the scenario it proves, its title verbatim too, and
 * carries a `// trace:` line with its role and the version of the scenario it was written against:
 * the convention is the header of `scripts/test-trace.mjs`. A scenario's expected values are
 * literals copied from the spec. The last `describe` is named so that it cannot be taken for a
 * requirement: its tests hold what the change's design says of the command beyond the scenarios,
 * and what a later task found that no test held, and each names the task it served and the version
 * of the app's Binding Surface it was written against.
 *
 * The npm script is proved in two parts, as the design has it: an assertion that `package.json` runs
 * exactly `node apps/calculator/serve.js`, and the spawned file. Spawning `npm` itself would add a
 * package manager's start-up and its platform differences to every run.
 *
 * Each spawned process gets a free port, found by binding port 0 of `127.0.0.1` and closing it,
 * unless its scenario names the port. A free port taken in the moment between the two binds fails a
 * test rather than passing one. A port a scenario names can be held by anything on the host, another
 * run of this suite among them, up to the moment the command listens, so no check before the spawn
 * settles it: the command is started on that port, and only its own refusal of it as in use puts
 * something in its place, with a diagnostic.
 *
 * Some tests start the command with a probe: a module Node runs in the process before `serve.js`
 * (`--import`), which reports on file descriptor 3 each `listen` call the process makes and each
 * listener that starts, and can steer a call to port 0 or to a refusal. It reads the command from
 * inside and changes no file of the app; `listenProbe` below is what it does.
 *
 * Every wait has a bound of its own, each test that starts a process
 * has a bound over all of them, and each test kills and awaits its process in an `after` hook,
 * which the runner runs when a test times out too, so no test can hang the suite or leave a
 * listener behind. No hook runs when this file's own process is ended by a signal, so a `SIGINT` or
 * `SIGTERM` to it kills every process it started before it ends by that signal. Only a `SIGKILL`
 * sent to it directly, which no process can catch, can still leave one running.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { get } from 'node:http'
import { connect, createServer } from 'node:net'
import { networkInterfaces, tmpdir } from 'node:os'
import { describe, test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { listenOnLoopback, listenRefusal, parsePort } from '../serve.js'
import { createCalculatorServer } from '../server.js'

// trace-defaults: layer=integration level=1

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const SERVE = fileURLToPath(new URL('../serve.js', import.meta.url))
const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url))

/** The committed page, which the served one must be byte for byte. */
const PAGE_TEXT = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8')

const SCRIPTS = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'))
  .scripts

/** Every key on the keypad, by the `data-key` its button carries. */
const KEYS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '+', '-', '*', '/', '=', 'C']

/**
 * A URL of the form the spec names, `http://127.0.0.1:<port>/`, matched only as a whole
 * whitespace-delimited token. A path after the slash, or anything joined on before `http`, fails
 * the match, so the URL a test checks and requests is the URL printed, never a prefix of it.
 */
const URL_RE = /(?<!\S)http:\/\/127\.0\.0\.1:(\d+)\/(?!\S)/

/**
 * A frame of a stack trace: a line indented and then `at`, as Node prints one, or anywhere on a
 * line, `at` after a space and then a place ending `:<line>:<column>`, as a stack flattened onto one
 * line, or quoted with its line breaks escaped, still carries it.
 */
const STACK_FRAME_RE = /^\s+at\s|(?:^|\s)at\s.*?:\d+:\d+/m

/**
 * How long a started process may take to print its first line or exit. Node starts in well under a
 * second; this leaves a slow CI host room without letting a process that never answers pass.
 */
const START_BOUND_MS = 10000

/**
 * How long a signalled server may take to exit. A server closes in milliseconds. This is far below
 * the minute a request held open would keep `close()` waiting.
 */
const STOP_BOUND_MS = 5000

/**
 * How long a connection to one of this host's own addresses is given before it counts as not taken.
 * One that a listener takes completes in well under a millisecond. A host may refuse one that no
 * listener takes, or drop it unanswered, as the macOS host this was written on did, so the wait can
 * be spent in full on every run and is kept short.
 */
const CONNECT_BOUND_MS = 500

/**
 * How long a test that starts a process may run in all. It is above the sum of the bounds above
 * that any one test waits through, three `START_BOUND_MS` where `[CLS-003]` starts the command a
 * second time and then asks for the page, so a named bound fails first, with its own message; this
 * one catches a wait that has no bound, which would otherwise hang the suite and the pre-push hook
 * with it, since `calculator:test` sets no timeout of its own. Raise it with the bounds above.
 */
const TEST_BOUND_MS = 40000

/**
 * Why the signal tests do not run on Windows. The reason is printed with the skip, as `CLAUDE.md`
 * § The gate ladder asks of a skip.
 */
const SIGNAL_SKIP =
  process.platform === 'win32'
    ? "on Windows, child.kill('SIGINT') ends the process without running its handler, so no" +
      ' test can send the interrupt Ctrl-C sends; CI runs this on Linux'
    : false

/**
 * Every `serve.js` this file has started that has not yet exited. The runner ends this file's
 * process with `SIGTERM` when it is itself stopped, as by a tool's timeout or a cancelled CI run
 * reaching `npm`. That ends the process by the signal's default action, so no `after` hook and no
 * `exit` listener runs, and each child would go on listening with init as its parent. The handlers
 * kill the children and then raise the same signal again. By then `once` has removed them, so the
 * process still ends by that signal, as whatever sent it expects.
 */
const live = new Set()
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    for (const child of live) child.kill('SIGKILL')
    process.kill(process.pid, signal)
  })
}

/** A plain TCP listener on `port` of `127.0.0.1`. Rejects with the listen error. */
function bind(port) {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

function release(server) {
  return new Promise((resolve) => server.close(() => resolve()))
}

/** A port of `127.0.0.1` that nothing held a moment ago. */
async function freePort() {
  const probe = await bind(0)
  const { port } = probe.address()
  await release(probe)
  return port
}

/**
 * The probe, as the `data:` URL `--import` takes, so that it is no file of its own. In the process
 * it wraps `listen` of every `net.Server`, which Node's HTTP server inherits, and writes one JSON line
 * to file descriptor 3 for each call, `{ asked: { port, host } }` with what the call named, and one
 * for each listener that starts, `{ listening: { address, family, port } }` with what the server
 * reports. With `steer` it changes the call as well: `'any-port'` listens on port 0, so that the host
 * picks a port, wherever the call asked, and `'EACCES'` binds nothing and fails the call on the next
 * tick through the server's `error` event, with the error Node's own `listen` gives for a port the
 * host reserves. It adds no `error` listener, so an error the command leaves unhandled still ends it.
 */
function listenProbe(steer) {
  const source = `
import { writeSync } from 'node:fs'
import { Server } from 'node:net'
const steer = ${JSON.stringify(steer ?? null)}
const report = (entry) => writeSync(3, JSON.stringify(entry) + '\\n')
const listen = Server.prototype.listen
Server.prototype.listen = function (...args) {
  const named = args[0] !== null && typeof args[0] === 'object'
  const asked = named
    ? { port: args[0].port, host: args[0].host }
    : { port: args[0], host: typeof args[1] === 'string' ? args[1] : undefined }
  report({ asked })
  if (steer === 'EACCES') {
    const error = Object.assign(new Error('listen EACCES: permission denied ' + asked.host + ':' + asked.port), {
      code: 'EACCES', errno: -13, syscall: 'listen', address: asked.host, port: asked.port,
    })
    process.nextTick(() => this.emit('error', error))
    return this
  }
  if (steer === 'any-port') args[0] = named ? { ...args[0], port: 0 } : 0
  this.once('listening', () => {
    const { address, family, port } = this.address()
    report({ listening: { address, family, port } })
  })
  return listen.apply(this, args)
}
`
  return `data:text/javascript,${encodeURIComponent(source)}`
}

/** What the probe reported, in order, read from an exit, by when its every pipe has been read. */
function probed(exit) {
  return exit.probe
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line))
}

/**
 * `serve.js` started as its own process, from the repository root as npm would start it, with
 * `PORT` set to `value`, or removed from its environment when `value` is undefined, and with `env`
 * added to the environment it inherits. With `probe`, a URL `listenProbe` gives, Node runs that
 * module first. Its output is collected as it arrives, the probe's too, and it is killed, if still
 * running, and awaited when the test ends.
 */
function serve(t, value, { cwd = REPO_ROOT, env: added = {}, probe } = {}) {
  const env = { ...process.env, ...added }
  delete env.PORT
  if (value !== undefined) env.PORT = String(value)
  const args = probe === undefined ? [SERVE] : ['--import', probe, SERVE]
  const stdio = probe === undefined ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe', 'pipe']
  const child = spawn(process.execPath, args, { cwd, env, stdio })
  live.add(child)
  child.once('exit', () => live.delete(child))
  const output = { stdout: '', stderr: '', probe: '' }
  child.stdout.setEncoding('utf8').on('data', (chunk) => (output.stdout += chunk))
  child.stderr.setEncoding('utf8').on('data', (chunk) => (output.stderr += chunk))
  if (probe !== undefined) child.stdio[3].setEncoding('utf8').on('data', (chunk) => (output.probe += chunk))
  const exited = new Promise((resolve, reject) => {
    child.once('error', reject)
    // 'close', not 'exit': by then both pipes have been read to the end.
    child.once('close', (code, signal) => resolve({ code, signal, ...output }))
  })
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    await exited.catch(() => {})
  })
  return { child, output, exited }
}

/**
 * The first line the process prints on stdout, as `{ line }`, or its exit, as `{ exit }`, if it
 * ends first. Fails once `START_BOUND_MS` pass with neither, naming what it printed.
 */
function firstLine(served) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const { stdout, stderr } = served.output
      const seen = `stdout ${JSON.stringify(stdout)}, stderr ${JSON.stringify(stderr)}`
      reject(new Error(`no line and no exit ${START_BOUND_MS} ms after the start: ${seen}`))
    }, START_BOUND_MS)
    const look = () => {
      const end = served.output.stdout.indexOf('\n')
      if (end === -1) return
      clearTimeout(timer)
      served.child.stdout.off('data', look)
      resolve({ line: served.output.stdout.slice(0, end) })
    }
    served.child.stdout.on('data', look)
    served.exited.then(
      (exit) => {
        clearTimeout(timer)
        resolve({ exit })
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/** The URL of the spec's form on `line`, exactly as printed. Fails if the line has none. */
function urlOn(line) {
  const url = URL_RE.exec(line)
  assert.notEqual(url, null, `no URL of the form http://127.0.0.1:<port>/ in: ${line}`)
  return url[0]
}

/** The URL the process prints once it is serving. Fails if it exits first or prints another line. */
async function printedUrl(served) {
  const first = await firstLine(served)
  const exit = JSON.stringify(first.exit)
  assert.notEqual(first.line, undefined, `it exited before printing a URL: ${exit}`)
  return urlOn(first.line)
}

/** How the process exited, or a failure once `bound` milliseconds pass without an exit. */
async function exitWithin(served, bound) {
  const exit = await Promise.race([served.exited, delay(bound, null, { ref: false })])
  assert.notEqual(exit, null, `still running ${bound} ms later`)
  return exit
}

/**
 * A refusal as the spec has it: a non-zero status, one line naming `named`, and no stack trace. The
 * status is held to 1, the one the design and the task name, which is also non-zero. It also printed
 * no URL, so nothing was served.
 */
function assertRefused(exit, named) {
  assert.equal(exit.signal, null, 'it exited by itself, not by a signal')
  assert.equal(exit.code, 1, 'status 1: non-zero, and the one the design names')
  const lines = exit.stderr.split('\n').filter((line) => line.trim() !== '')
  assert.equal(lines.length, 1, `one line on stderr, not: ${JSON.stringify(exit.stderr)}`)
  assert.ok(lines[0].includes(named), `the line names ${named}: ${lines[0]}`)
  assert.doesNotMatch(exit.stderr, STACK_FRAME_RE, 'no stack trace')
  assert.equal(exit.stdout, '', 'no URL printed')
}

/**
 * One GET of `url` on a connection of its own, and the whole answer read as text. Fails once
 * `START_BOUND_MS` pass without the whole answer, so a server that takes the connection and never
 * answers, or stops partway, fails the test rather than hanging it.
 */
function ask(url) {
  let timer
  return new Promise((resolve, reject) => {
    const req = get(url, { agent: false }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('error', reject)
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        resolve({ status: res.statusCode, headers: res.headers, body })
      })
    })
    req.on('error', reject)
    // A whole-answer bound, not the socket's idle timeout, which a trickle of bytes would reset.
    timer = setTimeout(() => {
      req.destroy(new Error(`no whole answer from ${url} ${START_BOUND_MS} ms after asking`))
    }, START_BOUND_MS)
  }).finally(() => clearTimeout(timer))
}

/** How a TCP connection to `host:port` went: `connected`, the error's code, or no answer. */
function tryConnect(host, port) {
  return new Promise((resolve) => {
    const socket = connect({ host, port, timeout: CONNECT_BOUND_MS })
    socket.once('connect', () => {
      socket.destroy()
      resolve('connected')
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(`no answer in ${CONNECT_BOUND_MS} ms`)
    })
    socket.once('error', (error) => resolve(error.code))
  })
}

/** An IPv4 address of this host on an interface other than loopback, or undefined if none. */
function nonLoopbackIPv4() {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const entry of addresses ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) return entry.address
    }
  }
  return undefined
}

/**
 * A connection to `port` that holds a request open: its headers begun and never finished. This is
 * the connection `close()` alone waits on, until the header timeout of a minute runs out, where it
 * ends an idle one by itself. The pause lets the server read the partial request, so that it is a
 * request in progress, not an idle connection, when the signal arrives. Fails, rather than waiting,
 * when the connection is refused or not taken in `CONNECT_BOUND_MS`, as it would be from a command
 * that printed one port and listened on another.
 */
async function holdRequestOpen(t, port) {
  const socket = connect({ host: '127.0.0.1', port, timeout: CONNECT_BOUND_MS })
  // Once connected, an error is the stopping server ending the connection, which is expected.
  socket.on('error', () => {})
  t.after(() => socket.destroy())
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve)
    socket.once('error', reject)
    socket.once('timeout', () => {
      reject(new Error(`no connection to 127.0.0.1:${port} in ${CONNECT_BOUND_MS} ms`))
    })
  })
  // The bound was on connecting; the connection is then held idle on purpose.
  socket.setTimeout(0)
  socket.write('GET / HTTP/1.1\r\nHost: 127.0.0.1\r\n')
  await delay(100)
}

/**
 * The server stops on `signal` as the spec's interrupt requirement asks: status 0, even with a
 * request held open, and its port free to bind again at once.
 */
async function assertStopsOn(t, signal) {
  const port = await freePort()
  const served = serve(t, port)
  await printedUrl(served)
  await holdRequestOpen(t, port)
  served.child.kill(signal)
  const exit = await exitWithin(served, STOP_BOUND_MS)
  assert.equal(exit.signal, null, `it handled ${signal} rather than being ended by it`)
  assert.equal(exit.code, 0)
  // Rejects with EADDRINUSE, and fails the test, if the port is still held.
  await release(await bind(port))
}

describe('One npm script starts the calculator', () => {
  // trace: CLS-001:happy@0d346f021d93
  test('[CLS-001] The script serves the page', { timeout: TEST_BOUND_MS }, async (t) => {
    assert.equal(SCRIPTS['calculator:serve'], 'node apps/calculator/serve.js')
    const port = await freePort()
    const url = await printedUrl(serve(t, port))
    assert.equal(url, `http://127.0.0.1:${port}/`)
    const answer = await ask(url)
    assert.equal(answer.status, 200)
    assert.match(answer.headers['content-type'], /^text\/html(?:;|$)/)
    const doc = new JSDOM(answer.body).window.document
    assert.equal(doc.querySelectorAll('output').length, 1, 'the display')
    const keys = [...doc.querySelectorAll('button[data-key]')].map((button) => button.dataset.key)
    assert.deepEqual(keys.sort(), [...KEYS].sort(), 'the keypad')
  })
})

describe('The server listens on the loopback interface only', () => {
  // trace: CLS-002:happy@9f3426afadf1
  test('[CLS-002] The listener is loopback-only', { timeout: TEST_BOUND_MS }, async (t) => {
    // In-process: the command's own listen function, and the address the server reports.
    const server = createCalculatorServer(PUBLIC_DIR)
    t.after(() => release(server))
    const port = await listenOnLoopback(server, 0)
    const { address, family } = server.address()
    assert.deepEqual({ address, family, port: server.address().port }, {
      address: '127.0.0.1',
      family: 'IPv4',
      port,
    })

    // Spawned: the command answers on 127.0.0.1, and the same port at another interface's address,
    // the one another machine would use, takes no connection. Refused or dropped unanswered both
    // count, since which one happens is the host's choice. A server listening on every interface
    // would take it.
    const other = nonLoopbackIPv4()
    if (other === undefined) {
      t.diagnostic(
        'this host has no IPv4 address outside loopback, so no connection from another interface' +
          ' was tried; the address above is the proof here',
      )
      return
    }
    const url = await printedUrl(serve(t, await freePort()))
    assert.equal((await ask(url)).status, 200)
    const outcome = await tryConnect(other, Number(new URL(url).port))
    assert.notEqual(outcome, 'connected', `a connection to ${other} at the served port was taken`)
  })
})

describe('The port is configurable', () => {
  // trace: CLS-003:happy@bbf90d26abe5
  test('[CLS-003] PORT chooses the port', { timeout: TEST_BOUND_MS }, async (t) => {
    // The spec's example first. Only the command's own refusal of it as in use, the line it prints
    // for EADDRINUSE and nothing else, lets a free port stand in.
    let port = 26680
    let first = await firstLine(serve(t, port))
    if (first.exit?.stderr.trim() === listenRefusal({ code: 'EADDRINUSE' }, port)) {
      port = await freePort()
      t.diagnostic(`port 26680, the spec's example, was in use when the command tried it, so port ${port} stands in`)
      first = await firstLine(serve(t, port))
    }
    assert.notEqual(first.line, undefined, `it exited before printing a URL: ${JSON.stringify(first.exit)}`)
    const url = urlOn(first.line)
    assert.equal(url, `http://127.0.0.1:${port}/`)
    const answer = await ask(url)
    assert.equal(answer.status, 200)
    assert.equal(answer.body, PAGE_TEXT)
  })

  // trace: CLS-004:happy@b9a69111b482
  test('[CLS-004] The default port', { timeout: TEST_BOUND_MS }, async (t) => {
    const first = await firstLine(serve(t, undefined))
    if (first.line !== undefined) {
      assert.equal(urlOn(first.line), 'http://127.0.0.1:8080/')
      return
    }
    // Something on this host held the port when the command tried it: another program, or another
    // run of this suite. Only the command's own refusal of 8080 as in use, the line it prints for
    // EADDRINUSE and nothing else, lets the probe stand in; any other early exit fails here. That
    // refusal proves only the port the command asked for, so it runs again with the probe steering
    // its listen to port 0: the port it asked for, and the URL it prints for the port it got, are
    // the URL above had the port been free.
    assertRefused(first.exit, '8080')
    assert.equal(first.exit.stderr.trim(), listenRefusal({ code: 'EADDRINUSE' }, 8080), 'refused as in use')
    t.diagnostic(`port 8080 was in use when the command tried it, so the probe reads the port it asks for: ${first.exit.stderr.trim()}`)
    const served = serve(t, undefined, { probe: listenProbe('any-port') })
    const url = await printedUrl(served)
    served.child.kill('SIGKILL')
    const [call, listener] = probed(await served.exited)
    assert.equal(call.asked.port, 8080, 'with PORT unset it asks for port 8080')
    assert.equal(url, `http://127.0.0.1:${listener.listening.port}/`, 'and prints the port it listens on')
  })

  // trace: CLS-005:happy@2d05ee941fa0
  test('[CLS-005] A port already in use is refused', { timeout: TEST_BOUND_MS }, async (t) => {
    const holder = await bind(0)
    t.after(() => release(holder))
    const { port } = holder.address()
    assertRefused(await exitWithin(serve(t, port), START_BOUND_MS), String(port))
  })

  // trace: CLS-006:happy@83db3f8de872
  test('[CLS-006] An invalid PORT is refused', { timeout: TEST_BOUND_MS }, async (t) => {
    assertRefused(await exitWithin(serve(t, 'abc'), START_BOUND_MS), 'abc')
  })
})

describe('An interrupt stops the server cleanly', () => {
  // trace: CLS-013:happy@f6d0d59a72f4
  test('[CLS-013] Ctrl-C stops the server', { skip: SIGNAL_SKIP, timeout: TEST_BOUND_MS }, async (t) => {
    await assertStopsOn(t, 'SIGINT')
  })
})

describe('The command (not a spec scenario)', () => {
  // trace: asdlc-openspec-zgh.4 surface:apps/calculator/binding-surface.md@7f0235d48d40
  test('[asdlc-openspec-zgh.4] PORT is read as a whole number from 1 to 65535, and unset means 8080', () => {
    assert.equal(parsePort(undefined), 8080)
    const valid = [
      ['1', 1],
      ['8080', 8080],
      ['65535', 65535],
      ['0080', 80],
    ]
    for (const [value, port] of valid) assert.equal(parsePort(value), port, value)
    const invalid = [
      '',
      ' ',
      ' 8080',
      '8080 ',
      '0',
      '65536',
      '99999999999999999999',
      '-1',
      '+80',
      '80.0',
      '1e3',
      '0x50',
      '８０８０',
      '80\n81',
    ]
    for (const value of invalid) {
      // Named as given, quoted, so that an empty value or one of spaces shows.
      const named = JSON.stringify(value)
      assert.throws(
        () => parsePort(value),
        (error) => {
          assert.ok(error instanceof RangeError, named)
          assert.ok(error.message.includes(named), `the refusal names ${named}: ${error.message}`)
          assert.doesNotMatch(error.message, /[\r\n]/, `the refusal for ${named} is one line`)
          return true
        },
      )
    }
  })

  // trace: asdlc-openspec-zgh.4 surface:apps/calculator/binding-surface.md@7f0235d48d40
  test('[asdlc-openspec-zgh.4] A listen error other than a port in use is refused in one line naming its code', () => {
    const denied = Object.assign(new Error('listen EACCES: permission denied 127.0.0.1:80'), {
      code: 'EACCES',
    })
    const line = listenRefusal(denied, 80)
    assert.match(line, /EACCES/)
    assert.match(line, /127\.0\.0\.1:80\b/)
    assert.doesNotMatch(line, /[\r\n]/)
    assert.match(listenRefusal({ code: 'EADDRINUSE' }, 8080), /\b8080\b/)
  })

  // trace: asdlc-openspec-zgh.4 surface:apps/calculator/binding-surface.md@7f0235d48d40
  test(
    '[asdlc-openspec-zgh.4] SIGTERM stops the server as Ctrl-C does',
    { skip: SIGNAL_SKIP, timeout: TEST_BOUND_MS },
    async (t) => {
      await assertStopsOn(t, 'SIGTERM')
    },
  )

  // trace: asdlc-openspec-zgh.4 surface:apps/calculator/binding-surface.md@7f0235d48d40
  test(
    '[asdlc-openspec-zgh.4] The page is found from the file, not from the working directory',
    { timeout: TEST_BOUND_MS },
    async (t) => {
      const url = await printedUrl(serve(t, await freePort(), { cwd: tmpdir() }))
      const answer = await ask(url)
      assert.equal(answer.status, 200)
      assert.equal(answer.body, PAGE_TEXT)
    },
  )

  // trace: asdlc-openspec-lgh surface:apps/calculator/binding-surface.md@7f0235d48d40
  test(
    '[asdlc-openspec-lgh] The command refuses a listen error other than a port in use in one line naming its code',
    { timeout: TEST_BOUND_MS },
    async (t) => {
      // The probe gives the error, since no port gives it on every host: port 80 of 127.0.0.1 is
      // refused to an ordinary user where ports below 1024 are reserved, as on macOS, but not to
      // root, nor where the host lowers that range, as a container may.
      const port = await freePort()
      const exit = await exitWithin(serve(t, port, { probe: listenProbe('EACCES') }), START_BOUND_MS)
      assertRefused(exit, 'EACCES')
      assert.ok(exit.stderr.includes(`127.0.0.1:${port}`), `the line names the address: ${exit.stderr}`)
    },
  )

  // trace: asdlc-openspec-lgh surface:apps/calculator/binding-surface.md@7f0235d48d40
  test(
    '[asdlc-openspec-lgh] The command refuses PORT=0 and an empty PORT rather than serving',
    { timeout: TEST_BOUND_MS },
    async (t) => {
      // Port 0 would serve on whatever port the host picks, and an empty PORT could pass for unset.
      const [zero, empty] = await Promise.all(
        ['0', ''].map((value) => exitWithin(serve(t, value), START_BOUND_MS)),
      )
      assertRefused(zero, '"0"')
      assertRefused(empty, '""')
    },
  )

  // trace: asdlc-openspec-lgh surface:apps/calculator/binding-surface.md@7f0235d48d40
  test(
    '[asdlc-openspec-lgh] The command listens once, on 127.0.0.1 alone, whatever HOST, BIND and HOSTNAME say',
    { timeout: TEST_BOUND_MS },
    async (t) => {
      // Each names every interface. The probe reports every listen call and every listener, so a
      // second listener, an IPv6 wildcard among them, fails here on any host, where the connection
      // [CLS-002] tries needs an IPv4 address outside loopback to try anything.
      const env = { HOST: '0.0.0.0', BIND: '::', HOSTNAME: '0.0.0.0' }
      const port = await freePort()
      const served = serve(t, port, { env, probe: listenProbe() })
      const url = await printedUrl(served)
      served.child.kill('SIGKILL')
      assert.equal(url, `http://127.0.0.1:${port}/`)
      assert.deepEqual(probed(await served.exited), [
        { asked: { port, host: '127.0.0.1' } },
        { listening: { address: '127.0.0.1', family: 'IPv4', port } },
      ])
    },
  )

  // trace: asdlc-openspec-lgh surface:apps/calculator/binding-surface.md@7f0235d48d40
  test('[asdlc-openspec-lgh] The no-stack-trace check finds a frame anywhere on a line, and none in a refusal', () => {
    const { stack } = new Error('a fault')
    assert.match(stack, STACK_FRAME_RE, 'a stack as Node prints it')
    assert.match(stack.replaceAll('\n', ' '), STACK_FRAME_RE, 'the same stack flattened onto one line')
    assert.match(JSON.stringify(stack), STACK_FRAME_RE, 'the same stack quoted, its line breaks escaped')
    let invalid
    try {
      parsePort('abc')
    } catch (error) {
      invalid = error.message
    }
    const denied = { code: 'EACCES', name: 'Error' }
    for (const line of [invalid, listenRefusal({ code: 'EADDRINUSE' }, 8080), listenRefusal(denied, 80)]) {
      assert.doesNotMatch(line, STACK_FRAME_RE, line)
    }
  })
})
