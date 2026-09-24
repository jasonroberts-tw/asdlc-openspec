/**
 * `npm run calculator:serve`: the command a person runs to use the calculator. It serves the page in
 * `public/`, through `createCalculatorServer` in `server.js`, on `127.0.0.1` at the port `PORT`
 * names, prints the URL, and serves until it is stopped with Ctrl-C (`SIGINT`) or `SIGTERM`.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet: this is the first process in the repository
 * that listens on a port. Were it wrong, it would let through two things. The first is a listener
 * on a public interface, so that another machine on the network could reach the page: Node's
 * `listen(port)` with no host binds every interface, which is why the host below is written out and
 * never left to a default. The second is a file served from outside `public/`: were that directory
 * resolved from the working directory rather than from this file, `node serve.js` run from anywhere
 * else would hand whatever `public/` sits there to the allowlist. Two smaller failures would reach a
 * person reading the terminal: a refused port printed as a stack trace, and a stopped server that a
 * connection holding a request open keeps from exiting.
 *
 *   npm run calculator:serve               serves on DEFAULT_PORT, below
 *   PORT=<port> npm run calculator:serve   serves on <port>, a whole number from 1 to 65535
 *
 * Needs nothing beyond Node and the committed files: no build step, no network, no token and no
 * other checkout. What it must do is capability `calculator-local-server`'s spec under `openspec/`,
 * which wins over this file.
 */
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createCalculatorServer } from './server.js'

/**
 * The port when `PORT` is unset, as capability `calculator-local-server`'s requirement 'The port is
 * configurable' states it. This is the number's one home: the README names no port.
 */
const DEFAULT_PORT = 8080

/**
 * The one interface the server listens on, as the requirement 'The server listens on the loopback
 * interface only' states it. Written out on every listen, since Node's default is every interface.
 */
const HOST = '127.0.0.1'

/** A whole number in digits alone: no sign, no space, no point, no exponent and no `0x`. */
const DIGITS_RE = /^\d+$/

/** Resolved from this file, never from the working directory, so no other directory is served. */
const PUBLIC_DIR = fileURLToPath(new URL('./public/', import.meta.url))

/**
 * The port to listen on: `DEFAULT_PORT` when `value`, the `PORT` variable, is unset, and otherwise
 * `value` read as a whole number from 1 to 65535. Anything else throws a `RangeError` whose message
 * is the one-line refusal. It names the value as given, quoted with JSON's escapes, so that an empty
 * value or one of spaces shows, and a line break inside it cannot split the refusal in two.
 *
 * @param {string | undefined} value
 * @returns {number}
 */
export function parsePort(value) {
  if (value === undefined) return DEFAULT_PORT
  const port = DIGITS_RE.test(value) ? Number(value) : Number.NaN
  if (port >= 1 && port <= 65535) return port
  throw new RangeError(
    `Cannot start the calculator: PORT is ${JSON.stringify(value)}, and it must be a whole number` +
      ' from 1 to 65535.',
  )
}

/**
 * Listen on `port` of `127.0.0.1`, and on no other interface. Resolves with the port bound once the
 * server is listening. Rejects with the listen error, `EADDRINUSE` among them, leaving the server
 * not listening and holding nothing that keeps the process alive.
 *
 * @param {import('node:net').Server} server
 * @param {number} port
 * @returns {Promise<number>}
 */
export function listenOnLoopback(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, HOST, () => {
      server.off('error', reject)
      resolve(server.address().port)
    })
  })
}

/**
 * The one-line refusal for a listen error: the port, when something else holds it, and otherwise
 * the error's code, such as `EACCES`, with the address it was refused at.
 *
 * @param {Error & { code?: string }} error
 * @param {number} port
 * @returns {string}
 */
export function listenRefusal(error, port) {
  if (error.code === 'EADDRINUSE') {
    return (
      `Cannot start the calculator: port ${port} on ${HOST} is already in use. Stop what holds it,` +
      ' or set PORT to another port.'
    )
  }
  const code = error.code ?? error.name
  return `Cannot start the calculator on ${HOST}:${port}: listening failed with ${code}.`
}

/**
 * The command. A refusal is one line on stderr and status 1. The process then ends by itself, since
 * nothing is listening, rather than through `process.exit`, which can cut off a line still being
 * written to a pipe. An error from anywhere else, such as a checkout with no `public/`, is a fault
 * rather than a refusal, and keeps its stack trace for whoever debugs it.
 */
async function main() {
  let port
  try {
    port = parsePort(process.env.PORT)
  } catch (error) {
    refuse(error.message)
    return
  }
  const server = createCalculatorServer(PUBLIC_DIR)
  let bound
  try {
    bound = await listenOnLoopback(server, port)
  } catch (error) {
    refuse(listenRefusal(error, port))
    return
  }
  // Before the URL is printed, so that anyone who has read it can stop the server cleanly.
  stopOnSignal(server)
  console.log(`Calculator running at http://${HOST}:${bound}/ (Ctrl-C to stop)`)
}

function refuse(line) {
  console.error(line)
  process.exitCode = 1
}

/**
 * On `SIGINT`, which Ctrl-C sends, or `SIGTERM`: stop listening, which frees the port at once, and
 * end every connection, then exit 0 once the server has closed. `close()` alone waits on a
 * connection that holds a request open until its client ends it or its header timeout runs out,
 * a minute by default, and the process with it. A second signal while closing exits at once, and
 * with 0 too, since by then the port is free and nothing is served.
 */
function stopOnSignal(server) {
  let stopping = false
  const stop = () => {
    if (stopping) process.exit(0)
    stopping = true
    server.close(() => process.exit(0))
    server.closeAllConnections()
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}

/**
 * Whether `node` was asked to run this file, rather than a test importing it. Node 22.18 has
 * `import.meta.main` for this, but marks it early development, so the entry's path is compared with
 * this module's instead. Both go through `realpathSync`, since Node resolves the entry's symbolic
 * links before naming the module's URL, and `process.argv[1]` keeps them.
 */
function isRunDirectly() {
  if (process.argv[1] === undefined) return false
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (isRunDirectly()) await main()
