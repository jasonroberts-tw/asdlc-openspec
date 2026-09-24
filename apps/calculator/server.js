/**
 * `createCalculatorServer(publicDir)`: the calculator's request handler, as a Node HTTP server that
 * is not yet listening. It never listens itself: its caller does, which is what lets the tests start
 * it in-process on a free loopback port.
 *
 * It serves an exact allowlist, built once from the flat listing of `publicDir`: `/` for
 * `index.html`, and `/<name>` for each `.html`, `.css` and `.js` file there. A request's path is
 * looked up in that table as the client sent it, never decoded, normalised or resolved against the
 * file system, so `/../package.json` and `/%2e%2e/package.json` miss for the same reason as
 * `/no-such-file`: they are not keys. There is no path arithmetic to get wrong. The usual static
 * server resolves the path under its root and then checks that the result stayed inside it, and
 * decoding order, Windows separators and symlinks are where that check goes wrong.
 *
 * What the server must do is capability `calculator-local-server`'s spec under `openspec/`, which
 * wins over this file.
 */
import { readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { STATUS_CODES, createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'

/** The kinds of file the page is made of, each with the type a browser needs to use it. */
const CONTENT_TYPE_OF = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
])

/**
 * Sent with every response this file writes, not only the page, so that a browser refuses any
 * other origin a later edit adds, whichever response that edit rides on. Node answers some protocol
 * errors itself, before this file runs (400, 417, 431), and those carry no policy: they carry no
 * page either, and the design accepts it.
 */
const POLICY = "default-src 'self'"

const TEXT = 'text/plain; charset=utf-8'

const NOT_GET = 'Method not allowed: this server answers GET only.\n'

/**
 * The codes that say the regular file the table listed is no longer there: deleted, replaced by a
 * directory, or gone with `publicDir` itself replaced by a file. Each is the file having vanished,
 * so each is `404`, not a file that is there and cannot be read.
 */
const VANISHED = new Set(['ENOENT', 'EISDIR', 'ENOTDIR'])

/**
 * @param {string} publicDir the directory holding the page and the files it loads
 * @returns {import('node:http').Server} a server that has not been told to listen
 */
export function createCalculatorServer(publicDir) {
  const table = allowlist(resolve(publicDir))

  const server = createServer((request, response) => {
    if (request.method !== 'GET') {
      send(response, 405, TEXT, NOT_GET, { Allow: 'GET' })
      return
    }
    // The raw request target up to any query, and nothing done to it.
    const query = request.url.indexOf('?')
    const path = query === -1 ? request.url : request.url.slice(0, query)
    const entry = table.get(path)
    if (entry === undefined) {
      notFound(response)
      return
    }
    // Read on every request, so an edit shows on reload without a restart.
    readFile(entry.file).then(
      (body) => send(response, 200, entry.type, body),
      (error) => {
        if (VANISHED.has(error.code)) notFound(response)
        // Anything else is a file that is there and cannot be read. Answered rather than thrown, so
        // one unreadable file does not stop the server for every other request.
        else send(response, 500, TEXT, `The file could not be read (${error.code}).\n`)
      },
    )
  })
  // Node hands CONNECT to this event, never to the handler above, and closes the connection
  // unanswered when nothing listens here. It is still a method other than GET, so it is refused.
  server.on('connect', refuseConnect)
  return server
}

/**
 * The same `405` as any other method, written as bytes, because CONNECT arrives as a bare socket
 * with no response to answer through. Node takes its own error listener off the socket before
 * handing it over, so one is added here. Without it, a client that resets the connection would
 * throw and stop the server for every other request.
 *
 * The socket is destroyed once the answer is flushed, not only ended. Node's server sockets allow
 * half-open connections, so `end()` alone closes only this side, and a client that never closes its
 * own would hold the socket for as long as it liked. A socket handed to this event is outside what
 * `closeAllConnections()` reaches, so that one client would keep `close()` from ever calling back,
 * and a server told to stop would not.
 */
function refuseConnect(request, socket) {
  socket.on('error', () => socket.destroy())
  const head = [
    `HTTP/1.1 405 ${STATUS_CODES[405]}`,
    `Content-Security-Policy: ${POLICY}`,
    `Content-Type: ${TEXT}`,
    `Content-Length: ${Buffer.byteLength(NOT_GET)}`,
    'Allow: GET',
    'Connection: close',
  ]
  socket.end(`${head.join('\r\n')}\r\n\r\n${NOT_GET}`, () => socket.destroy())
}

/**
 * The table from request path to file and type. A Map, so a lookup can never reach an inherited
 * property, whatever a later edit does to the keys. Only regular files are admitted: a subdirectory
 * is not descended into, and a symbolic link is not followed, since it could name a file anywhere.
 */
function allowlist(publicDir) {
  const table = new Map()
  for (const dirent of readdirSync(publicDir, { withFileTypes: true })) {
    const type = CONTENT_TYPE_OF.get(extname(dirent.name))
    if (type === undefined || !dirent.isFile()) continue
    const entry = { file: join(publicDir, dirent.name), type }
    table.set(`/${dirent.name}`, entry)
    if (dirent.name === 'index.html') table.set('/', entry)
  }
  return table
}

function notFound(response) {
  send(response, 404, TEXT, 'Not found.\n')
}

function send(response, status, type, body, headers = {}) {
  response.writeHead(status, {
    'Content-Security-Policy': POLICY,
    'Content-Type': type,
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  })
  response.end(body)
}
