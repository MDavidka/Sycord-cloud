# Sycord Cloud

Sycord Cloud is a password-protected browser terminal with a compact runtime dashboard.

## Pages

- / — password sign-in.
- /dashboard — process CPU, RSS/heap memory, uptime, active terminal sessions, and runtime details.
- /terminal — authenticated browser shell using xterm.js and a WebSocket-backed pseudo-terminal.
- /access — session and cookie protection details with sign-out.
- /api/stats — authenticated JSON metrics used by the dashboard.
- /assets/favicon.png — browser icon based on the uploaded Sycord logo.
- /assets/favicon.svg — compact vector mark for in-app branding.

The interface uses Geist, neutral #131313 / #232324 surfaces, restrained borders, and a rounded mobile navigation drawer. Runtime figures refresh every five seconds and describe the Node.js process only; they are not total Heroku dyno or host metrics, disk usage, billing data, or historical telemetry.

## Run

Requires Node.js 22.x and the native build requirements for node-pty.

    npm install
    TERMINAL_PASSWORD='use-a-unique-random-password-at-least-20-characters' npm start

The Heroku Procfile uses bash start.sh, which installs/checks the Antigravity CLI before starting the server. Configure TERMINAL_PASSWORD as a random value of at least 20 characters. Do not commit passwords, Google credentials, API keys, or session data.

## Remembered sign-in

After the first successful sign-in, a signed cookie keeps this browser authenticated for up to ten years, including across app restarts. The cookie is HttpOnly, Secure, and SameSite=Strict. Use Sign out to clear it. Clearing browser site data, changing TERMINAL_PASSWORD (when TERMINAL_SESSION_SECRET is unset), or changing TERMINAL_SESSION_SECRET invalidates remembered sessions. For shared devices, always sign out. Treat a remembered cookie as a credential.

Optional: set TERMINAL_SESSION_SECRET to a unique random value if you want session invalidation managed independently from the terminal password.

## Security limits

- There is one shared terminal password, not individual user accounts.
- The cookie is stateless: signing out clears it in the current browser; the app does not maintain a server-side per-device revocation list.
- The WebSocket endpoint checks the session cookie and same-origin host.
- No IP allowlist, audit log, or host-level access administration is implemented.
- Heroku dyno filesystems are ephemeral. Store important project files in Git or durable external storage.

## References

- [Antigravity CLI getting started](https://antigravity.google/docs/cli-getting-started)
- [Antigravity CLI authentication](https://www.antigravity.google/docs/cli/install/)
- [Heroku Container Registry](https://devcenter.heroku.com/articles/container-registry-and-runtime)
