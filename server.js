const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const execFileAsync = promisify(execFile);
const http = require("node:http");
const pty = require("node-pty");
const { WebSocketServer, WebSocket } = require("ws");

const app = express();
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false, limit: "8kb" }));
app.use(express.json({ limit: "24kb" }));
app.use("/assets", express.static(path.join(__dirname, "public"), { index: false, maxAge: "1h" }));

app.get("/manifest.webmanifest", (_req, res) => {
  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.sendFile(path.join(__dirname, "public", "manifest.webmanifest"));
});

app.get("/sw.js", (_req, res) => {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Service-Worker-Allowed", "/");
  res.sendFile(path.join(__dirname, "public", "sw.js"));
});

const password = (process.env.TERMINAL_PASSWORD || "").trim();
if (!password || password.length < 20) {
  console.error("Set TERMINAL_PASSWORD to a random value of at least 20 characters.");
  process.exit(1);
}

const SESSION_TTL_SECONDS = 315360000;
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;
const sessionSecret = process.env.TERMINAL_SESSION_SECRET || password;

function createSessionToken() {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_TTL_MS;
  const nonce = crypto.randomBytes(24).toString("hex");
  const payload = "v1." + issuedAt + "." + expiresAt + "." + nonce;
  const signature = crypto.createHmac("sha256", sessionSecret).update(payload).digest("hex");
  return payload + "." + signature;
}

let activeTerminals = 0;
const terminalSessions = new Map();
const TERMINAL_BUFFER_LIMIT = 512 * 1024;
let cpuPrevious = process.cpuUsage();
let cpuPreviousAt = process.hrtime.bigint();
let cpuPercent = 0;
const cpuSampler = setInterval(() => {
  const now = process.hrtime.bigint();
  const usage = process.cpuUsage();
  const elapsedMicroseconds = Number(now - cpuPreviousAt) / 1000;
  const usedMicroseconds = (usage.user - cpuPrevious.user) + (usage.system - cpuPrevious.system);
  cpuPercent = elapsedMicroseconds > 0 ? Math.max(0, Math.min(100, usedMicroseconds / elapsedMicroseconds * 100)) : 0;
  cpuPrevious = usage;
  cpuPreviousAt = now;
}, 5000);
cpuSampler.unref();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

function readCookie(req, name) {
  const cookies = (req.headers.cookie || "").split(";").map(v => v.trim());
  const item = cookies.find(v => v.startsWith(name + "="));
  return item ? item.slice(name.length + 1) : "";
}

function getWorkspaceId(req) {
  const value = readCookie(req, "terminal_workspace");
  return /^[a-f0-9]{64}$/.test(value) ? value : "";
}

function ensureWorkspaceCookie(req, res) {
  const existing = getWorkspaceId(req);
  if (existing) return existing;
  const id = crypto.randomBytes(32).toString("hex");
  res.append("Set-Cookie", "terminal_workspace=" + id + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=" + SESSION_TTL_SECONDS);
  return id;
}


const DATA_DIR = path.resolve(process.env.AIRSHELL_DATA_DIR || path.join(__dirname, "data"));
function workspaceDataDir(workspaceId) {
  if (!/^[a-f0-9]{64}$/.test(workspaceId || "")) throw new Error("Invalid workspace");
  const dir = path.join(DATA_DIR, workspaceId);
  fs.mkdirSync(path.join(dir, "keys"), { recursive: true, mode: 0o700 });
  try { fs.chmodSync(dir, 0o700); fs.chmodSync(path.join(dir, "keys"), 0o700); } catch {}
  return dir;
}
function serverConfigPath(workspaceId) { return path.join(workspaceDataDir(workspaceId), "servers.json"); }
function serverKeyPath(workspaceId, id) {
  if (!/^[a-f0-9]{24}$/.test(id || "")) throw new Error("Invalid server ID");
  return path.join(workspaceDataDir(workspaceId), "keys", id + ".key");
}
function readWorkspaceServers(workspaceId) {
  try {
    const parsed = JSON.parse(fs.readFileSync(serverConfigPath(workspaceId), "utf8"));
    return Array.isArray(parsed) ? parsed.filter(s => s && /^[a-f0-9]{24}$/.test(s.id || "")) : [];
  } catch (error) { if (error.code === "ENOENT") return []; throw error; }
}
function writeWorkspaceServers(workspaceId, servers) {
  const target = serverConfigPath(workspaceId);
  const temp = target + "." + crypto.randomBytes(6).toString("hex") + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(servers, null, 2), { mode: 0o600 });
  try { fs.chmodSync(temp, 0o600); } catch {}
  fs.renameSync(temp, target);
}
function publicServer(server) {
  return { id: server.id, name: server.name, host: server.host, username: server.provider === "instabox" ? "Instabox" : server.username, port: server.port, addedAt: server.addedAt, provider: server.provider || "ssh", type: "ssh" };
}
function sshBaseArgs(workspaceId, server) {
  const args = [];
  if (server.provider !== "instabox") args.push("-i", serverKeyPath(workspaceId, server.id), "-o", "IdentitiesOnly=yes");
  else args.push("-o", "PubkeyAuthentication=no", "-o", "PasswordAuthentication=no", "-o", "KbdInteractiveAuthentication=no");
  args.push("-p", String(server.port), "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", "-o", "ServerAliveInterval=30", "-o", "ServerAliveCountMax=3", "-o", "UserKnownHostsFile=" + path.join(workspaceDataDir(workspaceId), "known_hosts"), "-o", "StrictHostKeyChecking=accept-new", server.username + "@" + server.host);
  return args;
}
function shellQuote(value) { return "'" + String(value).replace(/'/g, "'\\''") + "'"; }
function findWorkspaceServer(workspaceId, id) { return readWorkspaceServers(workspaceId).find(server => server.id === id) || null; }

function hasSession(req) {
  const cookies = (req.headers.cookie || "").split(";").map(v => v.trim());
  const item = cookies.find(v => v.startsWith("terminal_auth="));
  if (!item) return false;
  const token = item.slice("terminal_auth=".length);
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "v1") return false;
  const [version, issuedAtRaw, expiresAtRaw, nonce, suppliedSignature] = parts;
  if (!/^\d+$/.test(issuedAtRaw) || !/^\d+$/.test(expiresAtRaw)) return false;
  if (!/^[a-f0-9]{48}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(suppliedSignature)) return false;
  const issuedAt = Number(issuedAtRaw);
  const expiresAt = Number(expiresAtRaw);
  const now = Date.now();
  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt)) return false;
  if (issuedAt > now + 60000 || expiresAt <= now || expiresAt - issuedAt !== SESSION_TTL_MS) return false;
  const payload = version + "." + issuedAtRaw + "." + expiresAtRaw + "." + nonce;
  const expectedSignature = crypto.createHmac("sha256", sessionSecret).update(payload).digest("hex");
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

const loginPage = (message = "") => {
  const escapedMessage = String(message).replace(/[&<>"]/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  }[ch]));
  return [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
    '<meta name="color-scheme" content="dark"><meta name="theme-color" content="#131313">',
    '<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">',
    '<link rel="manifest" href="/manifest.webmanifest">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black">',
    '<meta name="apple-mobile-web-app-title" content="Airshell">',
    '<script>if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){});});}</script>',
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet">',
    '<title>Sign in · Airshell</title>',
    '<style>',
    '*{box-sizing:border-box}body{font:14px Geist,system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;margin:0;padding:20px;background:#131313;color:#f5f5f5}.login{width:min(100%,400px);padding:27px;border:1px solid #2e2e2e;border-radius:14px;background:#1b1b1b}.brand{display:flex;align-items:center;gap:10px;margin-bottom:29px}.brand img{width:34px;height:34px;display:block;background:#fff;border-radius:8px}.brand strong{display:block;font-weight:600;font-size:14px;letter-spacing:-.02em}.brand span{display:block;margin-top:3px;color:#949494;font-size:12px}.login h1{font-size:25px;letter-spacing:-.04em;margin:0 0 8px;font-weight:600}.login p{color:#b4b4b4;line-height:1.55;margin:0 0 22px;font-size:13px}.login .error:empty{display:none}.login .error{margin:0 0 14px;color:#f19b9b;font-size:12px}.login label{display:block;color:#d4d4d4;font-size:13px;margin-bottom:8px}.login input,.login button{font:inherit;width:100%;min-height:44px;padding:11px 13px;border-radius:8px}.login input{margin-bottom:14px;border:1px solid #424244;background:#101010;color:#fff}.login input:focus{outline:2px solid #f5f5f5;outline-offset:2px}.login button{border:1px solid #f3f3f3;background:#f3f3f3;color:#131313;font-weight:600;cursor:pointer}.login button:hover{background:#ddd}.login .note{display:block;margin-top:18px;padding-top:15px;border-top:1px solid #2e2e2e;color:#949494;font-size:12px;line-height:1.55}',
    '</style></head><body><main class="login">',
    '<div class="brand"><img src="/assets/favicon.svg" alt=""><div><strong>Airshell</strong><span>Private terminal workspace</span></div></div>',
    '<h1>Sign in</h1><p>Access your terminal and runtime overview.</p><p class="error">' + escapedMessage + '</p>',
    '<form method="post" action="/login"><label for="password">Terminal password</label>',
    '<input id="password" type="password" name="password" autocomplete="current-password" required>',
    '<button type="submit">Continue</button></form>',
    '<small class="note">Stay signed in on this browser. Sign out when using a shared device.</small>',
    '</main></body></html>'
  ].join("\n");
};

app.get("/healthz", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true, uptimeSeconds: Math.floor(process.uptime()) });
});

app.get("/", (_req, res) => {
  if (hasSession(_req)) return res.redirect("/dashboard");
  res.type("html").send(loginPage());
});

app.post("/login", (req, res) => {
  const supplied = Buffer.from(String(req.body.password || "").trim());
  const expected = Buffer.from(password);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.status(401).type("html").send(loginPage("Incorrect password."));
  }
  const workspaceId = getWorkspaceId(req) || crypto.randomBytes(32).toString("hex");
  res.setHeader("Set-Cookie", [
    "terminal_auth=" + createSessionToken() + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=" + SESSION_TTL_SECONDS,
    "terminal_workspace=" + workspaceId + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=" + SESSION_TTL_SECONDS
  ]);
  res.redirect(303, "/dashboard");
});

app.get("/dashboard", (req, res) => {
  if (!hasSession(req)) return res.status(401).type("html").send(loginPage("Sign in to continue."));
  ensureWorkspaceCookie(req, res);
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "views", "dashboard.html"));
});


app.get("/api/servers", (req, res) => {
  if (!hasSession(req)) return res.status(401).json({ error: "Authentication required" });
  const workspaceId = getWorkspaceId(req);
  if (!workspaceId) return res.status(400).json({ error: "Workspace cookie missing. Reload the page and try again." });
  try {
    res.setHeader("Cache-Control", "no-store");
    return res.json({ servers: readWorkspaceServers(workspaceId).map(publicServer) });
  } catch (error) {
    console.error("Could not read server registry:", error.message);
    return res.status(500).json({ error: "Could not load saved servers. Check the server's persistent data directory." });
  }
});

app.post("/api/servers", async (req, res) => {
  if (!hasSession(req)) return res.status(401).json({ error: "Authentication required" });
  const workspaceId = getWorkspaceId(req);
  if (!workspaceId) return res.status(400).json({ error: "Workspace cookie missing. Reload the page and try again." });
  const body = req.body || {};
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 48) : "";
  const provider = body.provider === "instabox" ? "instabox" : "ssh";
  let host = typeof body.host === "string" ? body.host.trim().toLowerCase() : "";
  let username = typeof body.username === "string" ? body.username.trim() : "";
  let port = body.port === undefined || body.port === "" ? 22 : Number(body.port);
  const privateKey = typeof body.privateKey === "string" ? body.privateKey.trim() + "\n" : "";
  if (provider === "instabox") {
    const command = typeof body.command === "string" ? body.command.trim() : "";
    const match = command.match(/(?:^|\s)(?:\S+\s+)*(?:-p\s+(\d+)\s+)?([A-Za-z0-9._-]+)@(ssh|mosh)\.instabox\.sh(?:\s|$)/i)
      || command.match(/^([A-Za-z0-9._-]+)$/);
    if (match && match.length === 2) {
      username = match[1];
    } else if (match) {
      username = match[2];
      if (match[1]) port = Number(match[1]);
    }
    host = "ssh.instabox.sh";
    port = 2222;
    if (!username || !/^[A-Za-z0-9._-]{8,128}$/.test(username)) {
      return res.status(400).json({ error: "Paste the Instabox SSH command or its token username, for example: ssh -p 2222 TOKEN@ssh.instabox.sh" });
    }
  }
  if (!name || !/^[a-zA-Z0-9.-]{1,253}$/.test(host) || !/^[a-zA-Z0-9_][a-zA-Z0-9._-]{0,127}$/.test(username) || !Number.isInteger(port) || port < 1 || port > 65535) {
    return res.status(400).json({ error: "Enter a server name, valid hostname/IP, username, and port (1–65535)." });
  }
  if (provider !== "instabox" && (privateKey.length > 20000 || !/-----BEGIN (?:OPENSSH |RSA |EC |DSA )?PRIVATE KEY-----/.test(privateKey))) {
    return res.status(400).json({ error: "Paste a valid SSH private key. Passphrase-protected keys are not supported yet." });
  }
  const id = crypto.randomBytes(12).toString("hex");
  const record = { id, name, host, username, port, provider, addedAt: new Date().toISOString() };
  let keyPath;
  try {
    if (provider !== "instabox") {
      keyPath = serverKeyPath(workspaceId, id);
      fs.writeFileSync(keyPath, privateKey, { mode: 0o600, flag: "wx" });
      try { fs.chmodSync(keyPath, 0o600); } catch {}
    }
    await execFileAsync("ssh", [...sshBaseArgs(workspaceId, record), "printf AIRSHELL_SSH_OK"], { timeout: 12000, maxBuffer: 4096, windowsHide: true });
    const servers = readWorkspaceServers(workspaceId);
    servers.push(record);
    writeWorkspaceServers(workspaceId, servers);
    res.setHeader("Cache-Control", "no-store");
    return res.status(201).json({ server: publicServer(record) });
  } catch (error) {
    if (keyPath) { try { fs.unlinkSync(keyPath); } catch {} }
    const missingSsh = error && error.code === "ENOENT";
    const detail = missingSsh ? "The host running Airshell does not have the SSH client installed." :
      error && error.killed ? "SSH connection timed out. Check the host, port, network, and SSH service." :
      provider === "instabox" ? "Instabox SSH authentication failed or the endpoint could not be reached. Use the SSH command shown in Instabox and ensure the session is still running." :
      "SSH authentication failed or the host could not be reached. Check the username, key, host, port, and server's authorized_keys.";
    console.error("SSH server add failed:", error && (error.code || error.message) || "unknown");
    return res.status(missingSsh ? 503 : 422).json({ error: detail });
  }
});

app.delete("/api/servers/:id", (req, res) => {
  if (!hasSession(req)) return res.status(401).json({ error: "Authentication required" });
  const workspaceId = getWorkspaceId(req);
  if (!workspaceId) return res.status(400).json({ error: "Workspace cookie missing." });
  const id = req.params.id;
  if (!/^[a-f0-9]{24}$/.test(id || "")) return res.status(400).json({ error: "Invalid server ID." });
  try {
    const servers = readWorkspaceServers(workspaceId);
    if (!servers.some(server => server.id === id)) return res.status(404).json({ error: "Server not found." });
    writeWorkspaceServers(workspaceId, servers.filter(server => server.id !== id));
    try { fs.unlinkSync(serverKeyPath(workspaceId, id)); } catch {}
    return res.json({ deleted: true, id });
  } catch (error) {
    console.error("Could not remove server:", error.message);
    return res.status(500).json({ error: "Could not remove this server." });
  }
});


app.get("/api/servers/:id/files", async (req, res) => {
  if (!hasSession(req)) return res.status(401).json({ error: "Authentication required" });
  const workspaceId = getWorkspaceId(req);
  if (!workspaceId) return res.status(400).json({ error: "Workspace cookie missing." });
  const id = req.params.id;
  if (!/^[a-f0-9]{24}$/.test(id || "")) return res.status(400).json({ error: "Invalid server ID." });
  const remotePath = typeof req.query.path === "string" ? req.query.path : ".";
  if (!remotePath || remotePath.length > 1024 || remotePath.includes("\0")) return res.status(400).json({ error: "Invalid path." });
  const remote = findWorkspaceServer(workspaceId, id);
  if (!remote) return res.status(404).json({ error: "Server not found." });
  try {
    const command = "find " + shellQuote(remotePath) + " -maxdepth 1 -mindepth 1 -printf '%f\\t%y\\t%s\\t%T@\\n' 2>/dev/null";
    const result = await execFileAsync("ssh", [...sshBaseArgs(workspaceId, remote), command], { timeout: 15000, maxBuffer: 256 * 1024, windowsHide: true });
    const entries = String(result.stdout || "").split("\n").filter(Boolean).map(line => {
      const parts = line.split("\t");
      return { name: parts[0] || "", type: parts[1] === "d" ? "directory" : "file", size: Number(parts[2]) || 0, modified: Number(parts[3]) || 0 };
    }).filter(entry => entry.name && entry.name !== "." && entry.name !== "..").sort((a,b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "directory" ? -1 : 1);
    res.setHeader("Cache-Control", "no-store");
    return res.json({ server: publicServer(remote), path: remotePath, entries });
  } catch (error) {
    console.error("Remote file listing failed:", error && (error.code || error.message) || "unknown");
    return res.status(502).json({ error: error && error.killed ? "File listing timed out." : "Could not list this directory. Check the SSH connection and path." });
  }
});

app.get("/api/servers/:id/file", async (req, res) => {
  if (!hasSession(req)) return res.status(401).json({ error: "Authentication required" });
  const workspaceId = getWorkspaceId(req);
  if (!workspaceId) return res.status(400).json({ error: "Workspace cookie missing." });
  const id = req.params.id;
  const remotePath = typeof req.query.path === "string" ? req.query.path : "";
  if (!/^[a-f0-9]{24}$/.test(id || "") || !remotePath || remotePath.length > 1024 || remotePath.includes("\0")) return res.status(400).json({ error: "Invalid file path." });
  const remote = findWorkspaceServer(workspaceId, id);
  if (!remote) return res.status(404).json({ error: "Server not found." });
  try {
    const command = "if [ -f " + shellQuote(remotePath) + " ]; then head -c 131072 -- " + shellQuote(remotePath) + "; else exit 3; fi";
    const result = await execFileAsync("ssh", [...sshBaseArgs(workspaceId, remote), command], { timeout: 15000, maxBuffer: 140 * 1024, encoding: "utf8", windowsHide: true });
    res.setHeader("Cache-Control", "no-store");
    return res.json({ path: remotePath, content: String(result.stdout || ""), truncated: Buffer.byteLength(String(result.stdout || "")) >= 131072 });
  } catch (error) {
    return res.status(422).json({ error: "Could not read this file as text. It may be binary, too large, or inaccessible." });
  }
});

app.post("/api/chat", async (req, res) => {
  if (!hasSession(req)) return res.status(401).json({ error: "Authentication required" });

  const apiKey = String(process.env.N_API || "").trim();
  if (!apiKey) return res.status(503).json({ error: "AI is not configured. Set N_API in the server environment." });

  const inputMessages = req.body && Array.isArray(req.body.messages) ? req.body.messages : [];
  if (!inputMessages.length || inputMessages.length > 20) {
    return res.status(400).json({ error: "Send between 1 and 20 recent messages." });
  }

  const messages = [];
  for (const item of inputMessages) {
    if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string") {
      return res.status(400).json({ error: "Invalid chat message format." });
    }
    const content = item.content.trim();
    if (!content || content.length > 4000) {
      return res.status(400).json({ error: "Each message must contain 1–4000 characters." });
    }
    messages.push({ role: item.role, content });
  }
  if (messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "The latest message must be from the user." });
  }

  try {
    const upstream = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        model: "minimaxai/minimax-m3.1-flash",
        messages,
        temperature: 1,
        top_p: 0.95,
        max_tokens: 2048,
        stream: false
      }),
      signal: AbortSignal.timeout(60000)
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const providerMessage = data && data.error
        ? (typeof data.error === "string" ? data.error : data.error.message || data.error.detail || JSON.stringify(data.error))
        : (data && data.detail ? String(data.detail) : "No error detail returned");
      console.error("NVIDIA NIM request failed:", upstream.status, providerMessage.slice(0, 800));
      const publicStatus = [400, 401, 403, 404, 422, 429, 503].includes(upstream.status) ? upstream.status : 502;
      let friendlyError = "NVIDIA NIM returned HTTP " + upstream.status + ".";
      if (upstream.status === 401 || upstream.status === 403) friendlyError += " Check that N_API is a valid NVIDIA API key.";
      else if (upstream.status === 404) friendlyError += " Confirm the model identifier is available to your key.";
      else if (upstream.status === 429) friendlyError += " The provider is rate-limiting requests; wait and retry.";
      else if (upstream.status === 503) friendlyError += " NVIDIA's inference service may be temporarily unavailable; retry shortly.";
      else if (upstream.status === 400 || upstream.status === 422) friendlyError += " Check the request parameters.";
      return res.status(publicStatus).json({ error: friendlyError, providerStatus: upstream.status });
    }

    const answer = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "";
    if (typeof answer !== "string" || !answer.trim()) {
      return res.status(502).json({ error: "The AI provider returned an empty response." });
    }
    res.setHeader("Cache-Control", "no-store");
    return res.json({ answer: answer.trim(), model: "minimaxai/minimax-m3.1-flash" });
  } catch (error) {
    const timedOut = error && (error.name === "TimeoutError" || error.name === "AbortError");
    console.error("NVIDIA NIM request error:", error && error.message ? error.message : "unknown error");
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut ? "The AI request timed out. Please try again." : "Could not connect to the AI provider. Please try again."
    });
  }
});

app.get("/api/stats", (req, res) => {
  if (!hasSession(req)) return res.status(401).json({ error: "Authentication required" });
  const memory = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());
  res.setHeader("Cache-Control", "no-store");
  res.json({
    measuredAt: new Date().toISOString(),
    uptimeSeconds,
    startedAt: new Date(Date.now() - uptimeSeconds * 1000).toISOString(),
    cpuPercent: Math.round(cpuPercent * 10) / 10,
    memory: {
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      externalBytes: memory.external
    },
    activeTerminals,
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    access: {
      passwordProtected: Boolean(password),
      sessionTtlSeconds: SESSION_TTL_SECONDS,
      rememberedSession: true,
      secureCookie: true,
      webSocketProtected: true
    }
  });
});

app.post("/logout", (_req, res) => {
  res.setHeader("Set-Cookie", "terminal_auth=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  res.redirect(303, "/");
});

app.get("/access", (req, res) => {
  if (!hasSession(req)) return res.status(401).type("html").send(loginPage("Sign in to continue."));
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "views", "access.html"));
});

app.get("/terminal", (req, res) => {
  if (!hasSession(req)) return res.status(401).type("html").send(loginPage("Előbb jelentkezz be."));
  ensureWorkspaceCookie(req, res);
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "views", "terminal.html"));
});

server.on("upgrade", (req, socket, head) => {
  const origin = req.headers.origin;
  let pathname = "";
  try { pathname = new URL(req.url, "http://localhost").pathname; } catch {}
  if (!hasSession(req) || (origin && new URL(origin).host !== req.headers.host) || pathname !== "/ws" || !getWorkspaceId(req)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req));
});

function spawnTerminalSession(workspaceId, serverId) {
  const sessionKey = workspaceId + ":" + (serverId || "local");
  let command = process.env.SHELL || "/bin/bash";
  let args = ["--login"];
  let cwd = process.env.HOME || "/app";
  if (serverId) {
    const remote = findWorkspaceServer(workspaceId, serverId);
    if (!remote) throw new Error("This server is not saved in your workspace.");
    command = "ssh";
    args = sshBaseArgs(workspaceId, remote);
    args.splice(args.length - 1, 0, "-tt");
    const remoteCommand = "if command -v tmux >/dev/null 2>&1; then exec tmux new-session -A -s airshell_" + serverId + "; else printf '\\n[Airshell] tmux is not installed; this shell will not survive an SSH disconnect. Install tmux for persistent sessions.\\n'; exec \"\${SHELL:-/bin/bash}\" -l; fi";
    args.push(remoteCommand);
  }
  const terminal = pty.spawn(command, args, {
    name: "xterm-256color",
    cols: 100,
    rows: 30,
    cwd,
    env: { ...process.env, TERM: "xterm-256color", COLORTERM: "truecolor" }
  });
  const session = {
    id: sessionKey,
    sessionKey,
    serverId: serverId || null,
    terminal,
    socket: null,
    outputSeq: 0,
    outputBuffer: [],
    outputBytes: 0,
    createdAt: Date.now(),
    exited: false
  };
  terminalSessions.set(sessionKey, session);
  activeTerminals = terminalSessions.size;

  terminal.onData(data => {
    if (session.exited) return;
    const chunk = { type: "output", seq: ++session.outputSeq, data };
    session.outputBuffer.push(chunk);
    session.outputBytes += Buffer.byteLength(data);
    while (session.outputBytes > TERMINAL_BUFFER_LIMIT && session.outputBuffer.length > 1) {
      const removed = session.outputBuffer.shift();
      session.outputBytes -= Buffer.byteLength(removed.data);
    }
    if (session.socket && session.socket.readyState === WebSocket.OPEN) {
      try { session.socket.send(JSON.stringify(chunk)); } catch {}
    }
  });

  terminal.onExit(({ exitCode }) => {
    session.exited = true;
    if (terminalSessions.get(sessionKey) === session) terminalSessions.delete(sessionKey);
    activeTerminals = terminalSessions.size;
    if (session.socket && session.socket.readyState === WebSocket.OPEN) {
      try { session.socket.send(JSON.stringify({ type: "session-ended", exitCode })); } catch {}
      session.socket.close();
    }
    session.socket = null;
  });
  return session;
}

const websocketHeartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch { try { ws.terminate(); } catch {} }
  }
}, 25000);
websocketHeartbeat.unref();

wss.on("connection", (ws, req) => {
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
  const workspaceId = getWorkspaceId(req);
  if (!workspaceId) {
    ws.close(4401, "Workspace session cookie required");
    return;
  }

  let parsedConnectionUrl;
  try { parsedConnectionUrl = new URL(req.url, "http://localhost"); } catch {
    ws.send(JSON.stringify({ type: "error", message: "Invalid terminal URL." })); ws.close(); return;
  }
  const serverId = parsedConnectionUrl.searchParams.get("server") || "";
  if (serverId && !/^[a-f0-9]{24}$/.test(serverId)) {
    ws.send(JSON.stringify({ type: "error", message: "Invalid server ID." })); ws.close(); return;
  }
  if (serverId && !findWorkspaceServer(workspaceId, serverId)) {
    ws.send(JSON.stringify({ type: "error", message: "This server is not saved in your workspace. Add it again from Servers." })); ws.close(); return;
  }
  const sessionKey = workspaceId + ":" + (serverId || "local");
  let session = terminalSessions.get(sessionKey);
  const resumed = Boolean(session && !session.exited);
  if (!resumed) {
    try {
      session = spawnTerminalSession(workspaceId, serverId);
    } catch (error) {
      ws.send(JSON.stringify({ type: "error", message: "Could not start terminal: " + error.message }));
      ws.close();
      return;
    }
  }

  if (session.socket && session.socket !== ws && session.socket.readyState < WebSocket.CLOSING) {
    try { session.socket.close(4001, "Terminal attached in another tab"); } catch {}
  }
  session.socket = ws;

  let requestedSince = 0;
  try {
    const parsedUrl = new URL(req.url, "http://localhost");
    const value = Number(parsedUrl.searchParams.get("since") || 0);
    if (Number.isSafeInteger(value) && value >= 0) requestedSince = value;
  } catch {}

  const firstBufferedSeq = session.outputBuffer.length ? session.outputBuffer[0].seq : session.outputSeq + 1;
  const bufferReset = requestedSince < firstBufferedSeq - 1;
  ws.send(JSON.stringify({
    type: "session",
    resumed,
    createdAt: session.createdAt,
    lastSeq: session.outputSeq,
    bufferReset
  }));
  if (bufferReset) {
    ws.send(JSON.stringify({ type: "notice", message: "Some older terminal output was trimmed from the reconnect buffer." }));
  }
  for (const chunk of session.outputBuffer) {
    if (chunk.seq > requestedSince && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(chunk));
  }

  ws.on("message", raw => {
    if (session.socket !== ws || session.exited) return;
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === "input" && typeof msg.data === "string" && msg.data.length <= 4096) {
      session.terminal.write(msg.data);
    }
    if (msg.type === "resize" && Number.isInteger(msg.cols) && Number.isInteger(msg.rows)) {
      const cols = Math.max(20, Math.min(240, msg.cols));
      const rows = Math.max(5, Math.min(100, msg.rows));
      session.terminal.resize(cols, rows);
    }
  });

  ws.on("close", () => {
    if (session.socket === ws) session.socket = null;
    // Keep the PTY alive after the browser disconnects so long-running CLI jobs continue.
  });
});

function shutdown() {
  for (const session of terminalSessions.values()) {
    try { session.terminal.kill(); } catch {}
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

server.listen(process.env.PORT || 8080, "0.0.0.0", () => console.log("Protected web terminal listening"));
