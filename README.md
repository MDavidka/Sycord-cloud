# Sycord Cloud

Sycord Cloud is a password-protected browser terminal with a small runtime dashboard.

## Interface

- / — password login.
- /dashboard — protected overview with process CPU sampling, Node.js RSS/heap memory, process uptime, active terminal sessions, runtime details, and access-security status.
- /terminal — protected interactive shell using xterm.js and a WebSocket-backed pseudo-terminal.
- /api/stats — protected JSON metrics endpoint used by the dashboard.
- /assets/favicon.svg — monochrome Sycord Cloud website icon (white canvas, solid dark mark).

The dashboard polls runtime stats every five seconds. These figures describe the Node.js process; they are not full host or Heroku dyno metrics, billing data, disk usage, or retained historical telemetry.

## Run

Requires Node.js 22.x and the native build requirements for node-pty.

    npm install
    TERMINAL_PASSWORD='use-a-unique-random-password-at-least-20-characters' npm start

The Heroku Procfile currently uses bash start.sh, which installs/checks the Antigravity CLI before starting the server. Configure TERMINAL_PASSWORD as an environment variable; do not commit it, Google credentials, API keys, or session data.

## Security notes

- Login requires a configured terminal password of at least 20 characters.
- The session cookie uses HttpOnly, Secure, and SameSite=Strict, with a 60-minute expiry.
- The WebSocket endpoint checks the authenticated cookie and same-origin host.
- Sign out clears the browser's session cookie. Restarting the process rotates the server-side session token and invalidates existing sessions.
- The dashboard does not currently implement user accounts, IP allowlists, audit logs, or host-level access administration.

## Official references

- [Antigravity CLI getting started](https://antigravity.google/docs/cli-getting-started)
- [Antigravity CLI authentication](https://www.antigravity.google/docs/cli/install/)
- [Heroku Container Registry](https://devcenter.heroku.com/articles/container-registry-and-runtime)
