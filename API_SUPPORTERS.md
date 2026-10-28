# Sycord Cloud API — Servers and Supporter VMs

All routes below use the same authenticated Sycord Cloud session cookie as the web app. Use HTTPS, a logged-in session, and `credentials: "same-origin"` for browser requests. The API is **not** publicly accessible without authentication. JSON errors have the form `{"error":"message"}`. Credentials and SSH private keys are never returned.

## Standard server picker

`GET /api/servers` returns `{ servers: Server[], storage: "mongodb" | "local" }`. This endpoint retains both standard and supporter records for compatibility with existing integrations, but **the web UI filters out `connectionMode: "supporter"`**. Only standard servers appear in the sidebar and mobile tabs. Each `Server` includes `id`, `name`, `host`, `username`, `port`, `provider`, `authMethod`, `connectionMode`, `addedAt`, and, where applicable, `supporterMainId` and `expiresAt`.

## Supporter management (new)

- `GET /api/supporters` returns `{ supporters: Supporter[], count: number, transport: "ssh", note: string }`.
- `GET /api/supporters/:id` returns `{ supporter: Server, mainServer: MainServerSummary | null, remainingSeconds: number }`. A nonexistent or expired ID returns HTTP 404.
- Each item in the list adds `mainServer` and `remainingSeconds`. The main server summary includes `id`, `name`, `host`, and `provider`.
- HTTP 401: unauthenticated; 400: invalid ID or workspace cookie; 404: missing supporter record.

Example:

```js
const response = await fetch("/api/supporters", { credentials: "same-origin", cache: "no-store" });
if (!response.ok) throw new Error("Unable to load supporter connections");
const { supporters } = await response.json();
```

## Create and remove

`POST /api/servers` with `connectionMode: "supporter"`, `mainServerId`, `rootHost`, `rootPort`, `rootPassword`, `expiresInDays` (7 or 30) creates a temporary supporter connection after checking main VM reachability and direct SSH authentication from Sycord Cloud. This **still requires ssh and sshpass on the Sycord Cloud host**. Do not log or persist raw passwords outside the encrypted server record.

`DELETE /api/servers/:id` removes a saved connection. Existing SSH authorization on the remote VM is not automatically revoked.

## Remote operations

Existing `/api/servers/:id/status`, `/api/servers/:id/details`, `/api/servers/:id/files`, and `/api/servers/:id/file` routes continue to accept IDs for both connection types. These routes use Sycord Cloud's SSH transport, not the Main VM tunnel helper. The separate `scripts/supporter-tunnel.sh` provides SSH -L/-R/-D forwarding **on Main VM after manual key provisioning**, not an HTTP API.

## Security and scope

The Supporter API is intentionally read-only and does not expose root passwords, private keys, shell execution, or public port listeners. The Main VM / Supporter VM SSH tunnel requires explicit setup described in `SUPPORTER_TUNNEL.md`. This API is not an MCP server and does not automatically give Codex terminal access.
