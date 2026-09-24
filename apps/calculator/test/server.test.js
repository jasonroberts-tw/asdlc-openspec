/**
 * The local server's request scenarios, run in-process: `createCalculatorServer` over the committed
 * `public/` directory, listening on a free port of `127.0.0.1`, and asked over HTTP.
 *
 * Each `describe` is a requirement's name and each `test` a scenario's name, both verbatim from
 * capability `calculator-local-server`'s spec, so a scenario traces to its test by exact string. A
 * scenario's expected values are literals copied from the spec. The last `describe` is named so
 * that it cannot be taken for a requirement: its tests hold what the change's design says about
 * every response the server writes, and the methods other than POST that the spec refuses, none of
 * which has a scenario of its own. Node's own answers to protocol errors, which the design accepts
 * without the policy, are not tested here.
 *
 * Every request goes through `http.request` with an explicit `path`, which Node's client sends as
 * written. `fetch`, like a browser, would resolve `/../package.json` to `/package.json` before
 * sending it, and the traversal scenario would then prove nothing about the server. The server's
 * own record of what arrived is checked too, so a client that began normalising would fail here.
 * CONNECT is the one exception. `http.request` treats any answer to it as an open tunnel, not as a
 * response, so it is written to a socket as raw bytes.
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { request } from 'node:http'
import { connect } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { createCalculatorServer } from '../server.js'

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url))

/** The repository's `package.json`, whose text a traversal must not reach. */
const PACKAGE_TEXT = readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')

const HTML = 'text/html; charset=utf-8'
const JAVASCRIPT = 'text/javascript; charset=utf-8'
const CSS = 'text/css; charset=utf-8'
const POLICY = "default-src 'self'"

/**
 * How long a stopped server may take to close. A server with nothing holding it closes in a few
 * milliseconds; this leaves a slow CI host room without letting a server that never closes pass.
 */
const STOP_BOUND_MS = 2000

/**
 * What the page loads, read off `index.html` and each script's imports by hand. The walk below must
 * find exactly these, because a walk that misses a reference returns less and says nothing: the
 * scenarios would then check fewer files and still pass.
 */
const LOADED_BY_HAND = {
  scripts: ['/app.js', '/calculator.js', '/main.js'],
  stylesheets: ['/style.css'],
  references: [
    '/ href style.css',
    '/ src main.js',
    '/app.js import ./calculator.js',
    '/main.js import ./app.js',
  ],
}

/**
 * A static `import` or `export … from` statement, and its specifier. Read with a pattern rather than
 * a parser, as no JavaScript parser is a dependency. A module's static imports sit at its top level,
 * which a formatter writes at the start of a line, and the text between the keyword and the specifier
 * holds no quote, so an import list that spans several lines matches whole.
 */
const STATIC_IMPORT_RE = /^(?:import|export)\b([^'"`]*?)(['"])([^'"\n]*)\2/gm

/** A server over `publicDir`, listening on a free port of the loopback interface. */
async function startServer(publicDir) {
  const server = createCalculatorServer(publicDir)
  const arrived = []
  // A second listener beside the server's own, reading what the client actually sent.
  server.on('request', (req) => arrived.push(req.url))
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  return { server, port: server.address().port, arrived }
}

/** Close the server, and every connection it holds, so no socket keeps the test process alive. */
function stopServer(server) {
  return new Promise((resolve) => {
    server.close(resolve)
    server.closeAllConnections()
  })
}

/**
 * One request, with its `path` sent exactly as given and on a connection of its own, and the whole
 * answer read. The body is text: everything the server sends is.
 */
function ask(port, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method, agent: false }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('error', reject)
      res.on('end', () => {
        const body = Buffer.concat(chunks)
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body.toString('utf8'),
          bytes: body.length,
        })
      })
    })
    req.on('error', reject)
    req.end()
  })
}

/**
 * One request written to a socket as raw bytes, and all the server sends until the connection
 * closes. It settles on close, not on a parsed answer, so a server that hangs up without a word
 * shows as an empty status line rather than a test that never ends.
 */
function askRaw(port, bytes) {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1')
    const chunks = []
    socket.on('data', (chunk) => chunks.push(chunk))
    socket.on('error', reject)
    socket.on('close', () => resolve(parseRaw(chunks)))
    socket.write(bytes)
  })
}

/** An answer read off a socket as bytes: its status line, headers by lower-case name, and body. */
function parseRaw(chunks) {
  const text = Buffer.concat(chunks).toString('utf8')
  const split = text.indexOf('\r\n\r\n')
  const [statusLine, ...lines] = (split === -1 ? text : text.slice(0, split)).split('\r\n')
  const headers = {}
  for (const line of lines) {
    const colon = line.indexOf(':')
    headers[line.slice(0, colon).toLowerCase()] = line.slice(colon + 1).trim()
  }
  const body = split === -1 ? '' : text.slice(split + 4)
  return { statusLine, headers, body, bytes: Buffer.byteLength(body) }
}

/**
 * A reference as the spec reads "relative": no scheme and no host. An import specifier must also
 * start with `./`, `../` or `/`, since a browser resolves nothing else without an import map, and a
 * bare `app.js` there would fail in the browser while answering `200` here.
 */
function isRelative(reference) {
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(reference.specifier)) return false
  if (reference.specifier.startsWith('//')) return false
  if (reference.kind === 'import') return /^\.{0,2}\//.test(reference.specifier)
  return true
}

/**
 * Everything the page references, found as a browser would find it: every `src` and `href` in the
 * page served at `/`, and every static import in each script it loads, followed from script to
 * script. Each reference is resolved against the URL of the file that makes it, as the browser
 * does, and asked of the server. A reference that is not relative is recorded and never asked,
 * since it would name another origin.
 */
async function walkPage(port) {
  const origin = `http://127.0.0.1:${port}`
  const page = await ask(port, '/')
  const references = []
  const scripts = new Set()
  const stylesheets = new Set()
  const queue = []

  async function follow(from, kind, specifier) {
    const reference = { from, kind, specifier }
    references.push(reference)
    if (!isRelative(reference)) return reference
    const url = new URL(specifier, `${origin}${from}`)
    reference.path = url.pathname + url.search
    reference.answer = await ask(port, reference.path)
    return reference
  }

  const doc = new JSDOM(page.body).window.document
  for (const element of doc.querySelectorAll('[src], [href]')) {
    for (const attribute of ['src', 'href']) {
      if (!element.hasAttribute(attribute)) continue
      const reference = await follow('/', attribute, element.getAttribute(attribute))
      if (reference.path === undefined) continue
      if (element.matches('script')) queue.push(reference)
      if (element.matches('link') && element.relList.contains('stylesheet')) {
        stylesheets.add(reference.path)
      }
    }
  }
  while (queue.length > 0) {
    const script = queue.shift()
    if (scripts.has(script.path)) continue
    scripts.add(script.path)
    if (script.answer.status !== 200) continue
    for (const match of script.answer.body.matchAll(STATIC_IMPORT_RE)) {
      const between = match[1].trim()
      // `export const x = 'y'` is not a re-export: only `import '…'` and `… from '…'` load a module.
      if (between !== '' && !/(?:^|\s|\})from$/.test(between)) continue
      if (between === '' && !match[0].startsWith('import')) continue
      const reference = await follow(script.path, 'import', match[3])
      if (reference.path !== undefined) queue.push(reference)
    }
  }
  return { page, references, scripts: [...scripts].sort(), stylesheets: [...stylesheets].sort() }
}

/** The walk found what the page was read by hand to load: no fewer references, and no more. */
function assertWalkIsComplete(walk) {
  assert.deepEqual(walk.scripts, LOADED_BY_HAND.scripts, 'the scripts the page loads')
  assert.deepEqual(walk.stylesheets, LOADED_BY_HAND.stylesheets, 'the stylesheets the page loads')
  const found = walk.references.map((r) => `${r.from} ${r.kind} ${r.specifier}`).sort()
  assert.deepEqual(found, LOADED_BY_HAND.references, 'every reference in the page and its scripts')
}

let calculator

before(async () => {
  calculator = await startServer(PUBLIC_DIR)
})

after(async () => {
  await stopServer(calculator.server)
})

describe("The server serves only the calculator's own files", () => {
  test('The page and its files carry their content types', async () => {
    const walk = await walkPage(calculator.port)
    assert.equal(walk.page.status, 200)
    assert.equal(walk.page.headers['content-type'], HTML)
    assertWalkIsComplete(walk)
    for (const path of walk.scripts) {
      const answer = await ask(calculator.port, path)
      assert.equal(answer.status, 200, path)
      assert.equal(answer.headers['content-type'], JAVASCRIPT, path)
    }
    for (const path of walk.stylesheets) {
      const answer = await ask(calculator.port, path)
      assert.equal(answer.status, 200, path)
      assert.equal(answer.headers['content-type'], CSS, path)
    }
  })

  test('An unknown path is not found', async () => {
    const answer = await ask(calculator.port, '/no-such-file')
    assert.equal(answer.status, 404)
  })

  test('A path outside the calculator is not served', async () => {
    // The spec's two paths, and then each climbed as far as the repository root. From `public/`,
    // `/../package.json` names `apps/calculator/package.json`, which does not exist, so a server
    // that resolved paths under its root would answer 404 to it and still serve the root's file to
    // the deeper paths.
    const paths = [
      '/../package.json',
      '/%2e%2e/package.json',
      '/../../../package.json',
      '/%2e%2e/%2e%2e/%2e%2e/package.json',
      '/..%2f..%2f..%2fpackage.json',
    ]
    const unknown = await ask(calculator.port, '/no-such-file')
    for (const path of paths) {
      const asked = calculator.arrived.length
      const answer = await ask(calculator.port, path)
      assert.equal(calculator.arrived[asked], path, `${path} reached the server as written`)
      assert.equal(answer.status, 404, path)
      assert.equal(answer.body.includes(PACKAGE_TEXT), false, `${path} answered with package.json`)
      // Refused for the same reason as any unknown path, not by a rule of its own.
      assert.equal(answer.body, unknown.body, path)
    }
  })

  test('A method other than GET is refused', async () => {
    const answer = await ask(calculator.port, '/', 'POST')
    assert.equal(answer.status, 405)
  })
})

describe('The page needs no other origin', () => {
  test('The page forbids other origins', async () => {
    const answer = await ask(calculator.port, '/')
    assert.equal(answer.status, 200)
    assert.equal(answer.headers['content-security-policy'], POLICY)
  })

  test('Everything the page references is served locally', async () => {
    const walk = await walkPage(calculator.port)
    for (const reference of walk.references) {
      const named = `${reference.from} ${reference.kind} ${reference.specifier}`
      assert.equal(isRelative(reference), true, `${named} is not a relative path`)
      assert.equal(reference.answer.status, 200, named)
    }
    assertWalkIsComplete(walk)
  })
})

describe('Every response (not a spec scenario)', () => {
  test('Carries the policy, a type and a length, whatever its status', async () => {
    const answers = {
      200: await ask(calculator.port, '/'),
      404: await ask(calculator.port, '/no-such-file'),
      405: await ask(calculator.port, '/', 'POST'),
    }
    for (const [status, answer] of Object.entries(answers)) {
      assert.equal(answer.status, Number(status))
      assert.equal(answer.headers['content-security-policy'], POLICY, status)
      assert.equal(typeof answer.headers['content-type'], 'string', status)
      assert.equal(Number(answer.headers['content-length']), answer.bytes, status)
    }
    assert.equal(answers[404].headers['content-type'], 'text/plain; charset=utf-8')
    assert.equal(answers[405].headers['content-type'], 'text/plain; charset=utf-8')
    assert.equal(answers[405].headers.allow, 'GET')
  })

  test('Every method but GET is refused, HEAD among them', async () => {
    for (const method of ['HEAD', 'PUT', 'DELETE', 'OPTIONS']) {
      const answer = await ask(calculator.port, '/', method)
      assert.equal(answer.status, 405, method)
      assert.equal(answer.headers.allow, 'GET', method)
    }
  })

  test('CONNECT is refused too, though Node hands it past the request handler', async () => {
    const answer = await askRaw(
      calculator.port,
      'CONNECT 127.0.0.1:1 HTTP/1.1\r\nHost: 127.0.0.1:1\r\n\r\n',
    )
    assert.match(answer.statusLine, /^HTTP\/1\.1 405 /)
    assert.equal(answer.headers.allow, 'GET')
    assert.equal(answer.headers['content-security-policy'], POLICY)
    assert.equal(answer.headers['content-type'], 'text/plain; charset=utf-8')
    assert.equal(Number(answer.headers['content-length']), answer.bytes)
    // Refused in the same words as any other method.
    assert.equal(answer.body, (await ask(calculator.port, '/', 'POST')).body)
  })

  test('A CONNECT client that keeps its side open cannot keep a stopped server open', async (t) => {
    const local = await startServer(PUBLIC_DIR)
    // Once answered, this client never closes its own side, so only the server can end the
    // connection. The other clients here close theirs on the server's FIN, which hides a server
    // that only half-closes.
    const client = connect({ port: local.port, host: '127.0.0.1', allowHalfOpen: true })
    let stopping
    const stop = () => (stopping ??= stopServer(local.server))
    t.after(() => {
      client.destroy()
      return stop()
    })
    const answer = await new Promise((resolve, reject) => {
      const chunks = []
      client.on('data', (chunk) => chunks.push(chunk))
      client.on('error', reject)
      client.on('end', () => resolve(parseRaw(chunks)))
      client.write('CONNECT 127.0.0.1:1 HTTP/1.1\r\nHost: 127.0.0.1:1\r\n\r\n')
    })
    assert.match(answer.statusLine, /^HTTP\/1\.1 405 /)
    assert.equal(Number(answer.headers['content-length']), answer.bytes)
    // Stopped as the design has the command stop it on a signal: `close()` with
    // `closeAllConnections()`, which a socket handed to the 'connect' event is beyond.
    const stopped = await Promise.race([
      stop().then(() => true),
      delay(STOP_BOUND_MS, false, { ref: false }),
    ])
    assert.equal(stopped, true, `still open ${STOP_BOUND_MS} ms after it was stopped`)
  })

  test('A query is ignored and the path is matched exactly', async () => {
    const page = await ask(calculator.port, '/')
    const byName = await ask(calculator.port, '/index.html')
    const withQuery = await ask(calculator.port, '/style.css?v=2')
    assert.equal(byName.status, 200)
    assert.equal(byName.body, page.body)
    assert.equal(withQuery.status, 200)
    assert.equal(withQuery.headers['content-type'], CSS)
    // Each of these names a file here only after a decoding, a normalising or a case-folding, or
    // names one the table leaves out.
    const misses = [
      '/%73tyle.css',
      '/./style.css',
      '//style.css',
      '/Style.css',
      '/style.css/',
      '/README.md',
    ]
    for (const path of misses) {
      assert.equal((await ask(calculator.port, path)).status, 404, path)
    }
  })

  test('Only the listing taken at creation is served; a vanished file is not found', async (t) => {
    const dir = scratchDir(t)
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>t</title>\n')
    writeFileSync(join(dir, 'gone.js'), 'export {}\n')
    writeFileSync(join(dir, 'notes.txt'), 'not served\n')
    mkdirSync(join(dir, 'nested'))
    writeFileSync(join(dir, 'nested', 'deep.js'), 'export {}\n')
    const local = await startServer(dir)
    t.after(() => stopServer(local.server))

    writeFileSync(join(dir, 'later.js'), 'export {}\n')
    rmSync(join(dir, 'gone.js'))
    assert.equal((await ask(local.port, '/')).status, 200)
    for (const path of ['/gone.js', '/later.js', '/notes.txt', '/nested/deep.js', '/nested']) {
      const answer = await ask(local.port, path)
      assert.equal(answer.status, 404, path)
      assert.equal(answer.headers['content-security-policy'], POLICY, path)
    }
  })

  test('A file replaced by a directory, or its directory by a file, is not found', async (t) => {
    const dir = scratchDir(t)
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>t</title>\n')
    writeFileSync(join(dir, 'style.css'), 'p {}\n')
    const local = await startServer(dir)
    t.after(() => stopServer(local.server))

    // Either way the regular file the table listed is gone, which is a vanished file, not one that
    // is there and cannot be read.
    rmSync(join(dir, 'style.css'))
    mkdirSync(join(dir, 'style.css'))
    assert.equal((await ask(local.port, '/')).status, 200)
    assert.equal((await ask(local.port, '/style.css')).status, 404, '/style.css, now a directory')

    rmSync(dir, { recursive: true })
    writeFileSync(dir, 'a file where the directory was\n')
    for (const path of ['/', '/index.html']) {
      assert.equal((await ask(local.port, path)).status, 404, `${path}, its directory now a file`)
    }
  })

  test('A symbolic link is not followed', async (t) => {
    const dir = scratchDir(t)
    const outside = scratchDir(t)
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>t</title>\n')
    writeFileSync(join(outside, 'secret.js'), 'export const secret = 1\n')
    try {
      symlinkSync(join(outside, 'secret.js'), join(dir, 'linked.js'))
    } catch (error) {
      // Windows refuses a symbolic link to a process without the privilege to make one.
      if (error.code !== 'EPERM') throw error
      t.skip(`this host refuses to make a symbolic link (${error.code}), so none can be served`)
      return
    }
    const local = await startServer(dir)
    t.after(() => stopServer(local.server))
    assert.equal((await ask(local.port, '/linked.js')).status, 404)
  })
})

/** A fresh directory under the temporary directory, removed when the test ends. */
function scratchDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'calculator-server-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}
