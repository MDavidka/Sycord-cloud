# Airshell

Airshell is an installable, password-protected web app for a browser terminal and runtime dashboard.

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


## Install as an app

Airshell is configured as a standalone Progressive Web App (PWA). Open it in Safari on iPhone, tap **Share → Add to Home Screen**, keep **Open as Web App** enabled if shown, then tap **Add**. Launching the home-screen icon opens the app without Safari's usual browser toolbar. The service worker caches only static UI assets; it deliberately does not cache authenticated pages, terminal traffic, or private API responses. A network connection is still required for login and terminal use.

## SSH servers, per-server terminals, and files

The sidebar's **Servers** section is populated only from SSH hosts saved by the signed-in workspace. Use **Add server** to provide a display name, host/IP, SSH port, Linux username, and a private key. Airshell verifies the SSH connection before adding the entry. Passphrase-protected private keys are not currently supported. The private key is kept server-side with restrictive file permissions and is never returned by the API.

Each saved host opens its own SSH terminal session at `/terminal?server=<id>`. When `tmux` is installed on the remote host, Airshell automatically attaches to a named `tmux` session for that server; this lets CLI processes continue and be reattached after a browser disconnect or an Airshell restart. Without `tmux`, the terminal falls back to a regular SSH shell and cannot promise process persistence across disconnects. The **Files** tab lists the remote directory and supports text previews up to 128 KiB per file. The Files API currently relies on GNU `find` and standard SSH tools on the remote Linux host.

### Persistent hosting

- Set `AIRSHELL_DATA_DIR` to a **persistent, private volume** on the Airshell host. It stores each workspace's server registry and SSH keys. If the hosting platform's filesystem is ephemeral, saved servers and keys can disappear after a redeploy/restart.
- Keep the Airshell service on an always-on host/container. A GitHub commit does not keep a sleeping/free hosting instance alive. Configure your host's restart policy and, if supported, use `/healthz` for health checks.
- Install an OpenSSH client (`ssh`) on the Airshell host, and allow outbound SSH connections to your remote hosts. Install `tmux` on each remote Linux host for long-running CLI sessions to survive SSH/Airshell restarts.
- Use SSH keys dedicated to this app with least-privilege accounts. Removing a server from the sidebar deletes the saved record and its stored key from the configured data directory.
- WebSocket ping/pong keepalive is enabled. This improves connection stability, but cannot prevent downtime caused by host sleep, restarts, network outages, or a remote server going offline.

The server registry is workspace-cookie scoped. Clearing browser site data creates a new workspace identity, so that browser will not see the previous workspace's saved server list unless its workspace cookie is preserved.


## MongoDB persistence

Set `MONGO_URI` as a private deployment environment variable to enable persistent storage. The app creates `workspaces` and `terminal_logs` collections automatically. Saved server records, encrypted SSH private keys, profile preferences, and the latest 500 terminal output chunks per workspace/server are stored in MongoDB. SSH keys are encrypted using a key derived from `TERMINAL_SESSION_SECRET` (or `TERMINAL_PASSWORD` when no separate secret is configured); keep that secret stable across redeployments or encrypted keys cannot be restored. Never commit `MONGO_URI` or database credentials. Without `MONGO_URI`, the app falls back to local filesystem storage, which is not durable on ephemeral hosts.
