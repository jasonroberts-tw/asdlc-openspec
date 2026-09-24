# calculator-local-server Specification

## Purpose

How a person runs the calculator on their own machine. It covers the one npm script that starts it,
the loopback-only listener and its port, the files it serves and the requests it refuses, and how
it stops. The calculator is run locally only; nothing here deploys it.

## Requirements

### Requirement: One npm script starts the calculator

Running `npm run calculator:serve` from the repository root, after `npm ci`, SHALL start a server
for the calculator page and print the URL it serves the page at. The server SHALL keep running until
it is stopped, and SHALL need no build step, no deployment, no account and no network access.

#### Scenario: The script serves the page

- **WHEN** a person runs `npm run calculator:serve`
- **THEN** it prints a URL of the form `http://127.0.0.1:<port>/`
- **AND** a GET request to that URL answers `200` with an HTML page that contains the calculator's display and keypad

### Requirement: The server listens on the loopback interface only

The server SHALL bind to `127.0.0.1` and to no other interface, so that no other machine can reach
it.

#### Scenario: The listener is loopback-only

- **WHEN** the server has started
- **THEN** its listening address is `127.0.0.1`

### Requirement: The port is configurable

The server SHALL listen on the port named by the `PORT` environment variable when it is set, and on
port `8080` when it is not. When the port is already in use, or `PORT` is not a whole number from
`1` to `65535`, the server SHALL exit with a non-zero status and print one line naming the port or
the value, and no stack trace.

#### Scenario: PORT chooses the port

- **WHEN** a person runs `npm run calculator:serve` with `PORT` set to `26680`
- **THEN** it prints `http://127.0.0.1:26680/`
- **AND** the page is served at that URL

#### Scenario: The default port

- **WHEN** a person runs `npm run calculator:serve` with `PORT` unset
- **THEN** it prints `http://127.0.0.1:8080/`

#### Scenario: A port already in use is refused

- **WHEN** another process is listening on `127.0.0.1` at a port
- **AND** a person runs `npm run calculator:serve` with `PORT` set to that port
- **THEN** the server exits with a non-zero status
- **AND** it prints one line that names the port, and no stack trace

#### Scenario: An invalid PORT is refused

- **WHEN** a person runs `npm run calculator:serve` with `PORT` set to `abc`
- **THEN** the server exits with a non-zero status
- **AND** it prints one line that names `abc`, and no stack trace

### Requirement: The server serves only the calculator's own files

The server SHALL answer a GET request for the calculator page, and for each file the page loads,
with `200` and a `Content-Type` that matches the file's kind. It SHALL answer a GET request for any
other path with `404`, including a path that tries to reach outside the calculator's own directory,
whether written plainly or percent-encoded. It SHALL answer any method other than GET with `405`.

#### Scenario: The page and its files carry their content types

- **WHEN** the page is requested at `/`
- **THEN** the answer is `200` with `Content-Type: text/html; charset=utf-8`
- **AND** each script the page loads answers `200` with `Content-Type: text/javascript; charset=utf-8`
- **AND** each stylesheet the page loads answers `200` with `Content-Type: text/css; charset=utf-8`

#### Scenario: An unknown path is not found

- **WHEN** `/no-such-file` is requested
- **THEN** the answer is `404`

#### Scenario: A path outside the calculator is not served

- **WHEN** `/../package.json` is requested, and then `/%2e%2e/package.json`
- **THEN** each answer is `404`
- **AND** neither body contains the text of the repository's `package.json`

#### Scenario: A method other than GET is refused

- **WHEN** a POST request is sent to `/`
- **THEN** the answer is `405`

### Requirement: The page needs no other origin

Everything the page loads SHALL come from the local server: no script, stylesheet, font, image or
request SHALL name another origin, so that the calculator works with no network access. The server
SHALL send the page with the header `Content-Security-Policy: default-src 'self'`, so that a browser
refuses any other origin a later edit adds.

#### Scenario: The page forbids other origins

- **WHEN** the page is requested at `/`
- **THEN** the answer carries the header `Content-Security-Policy: default-src 'self'`

#### Scenario: Everything the page references is served locally

- **WHEN** every `src` and `href` in the page, and every import in the scripts it loads, is read
- **THEN** each is a relative path with no scheme and no host
- **AND** each answers `200` from the local server

### Requirement: An interrupt stops the server cleanly

On an interrupt (`SIGINT`, as Ctrl-C sends) or `SIGTERM`, the server SHALL stop accepting
connections, release its port and exit with status `0`.

#### Scenario: Ctrl-C stops the server

- **WHEN** the running server receives `SIGINT`
- **THEN** it exits with status `0`
- **AND** its port can be bound again at once

