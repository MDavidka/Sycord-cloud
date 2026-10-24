const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const http = require("node:http");
const pty = require("node-pty");
const { WebSocketServer, WebSocket } = require("ws");

const app = express();
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false, limit: "8kb" }));
app.use("/assets", express.static(path.join(__dirname, "public"), { index: false, maxAge: "1h" }));

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
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="dark"><meta name="theme-color" content="#131313">',
    '<link rel="icon" type="image/png" href="/assets/favicon.png">',
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet">',
    '<title>Sign in · Sycord Cloud</title>',
    '<style>',
    '*{box-sizing:border-box}body{font:14px Geist,system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;margin:0;padding:20px;background:#131313;color:#f5f5f5}.login{width:min(100%,400px);padding:27px;border:1px solid #2e2e2e;border-radius:14px;background:#1b1b1b}.brand{display:flex;align-items:center;gap:10px;margin-bottom:29px}.brand img{width:34px;height:34px;display:block;background:#fff;border-radius:8px}.brand strong{display:block;font-weight:600;font-size:14px;letter-spacing:-.02em}.brand span{display:block;margin-top:3px;color:#949494;font-size:12px}.login h1{font-size:25px;letter-spacing:-.04em;margin:0 0 8px;font-weight:600}.login p{color:#b4b4b4;line-height:1.55;margin:0 0 22px;font-size:13px}.login .error:empty{display:none}.login .error{margin:0 0 14px;color:#f19b9b;font-size:12px}.login label{display:block;color:#d4d4d4;font-size:13px;margin-bottom:8px}.login input,.login button{font:inherit;width:100%;min-height:44px;padding:11px 13px;border-radius:8px}.login input{margin-bottom:14px;border:1px solid #424244;background:#101010;color:#fff}.login input:focus{outline:2px solid #f5f5f5;outline-offset:2px}.login button{border:1px solid #f3f3f3;background:#f3f3f3;color:#131313;font-weight:600;cursor:pointer}.login button:hover{background:#ddd}.login .note{display:block;margin-top:18px;padding-top:15px;border-top:1px solid #2e2e2e;color:#949494;font-size:12px;line-height:1.55}',
    '</style></head><body><main class="login">',
    '<div class="brand"><img src="/assets/favicon.svg" alt=""><div><strong>Sycord Cloud</strong><span>Private terminal workspace</span></div></div>',
    '<h1>Sign in</h1><p>Access your terminal and runtime overview.</p><p class="error">' + escapedMessage + '</p>',
    '<form method="post" action="/login"><label for="password">Terminal password</label>',
    '<input id="password" type="password" name="password" autocomplete="current-password" required>',
    '<button type="submit">Continue</button></form>',
    '<small class="note">Stay signed in on this browser. Sign out when using a shared device.</small>',
    '</main></body></html>'
  ].join("\\n");
};

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
  res.setHeader("Set-Cookie", "terminal_auth=" + createSessionToken() + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=" + SESSION_TTL_SECONDS);
  res.redirect(303, "/dashboard");
});

app.get("/dashboard", (req, res) => {
  if (!hasSession(req)) return res.status(401).type("html").send(loginPage("Sign in to continue."));
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "views", "dashboard.html"));
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
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "views", "terminal.html"));
});

server.on("upgrade", (req, socket, head) => {
  const origin = req.headers.origin;
  if (!hasSession(req) || (origin && new URL(origin).host !== req.headers.host) || req.url !== "/ws") {
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req));
});

wss.on("connection", ws => {
  const shell = process.env.SHELL || "/bin/bash";
  let terminal;
  try {
    terminal = pty.spawn(shell, ["--login"], {
      name: "xterm-256color",
      cols: 100,
      rows: 30,
      cwd: process.env.HOME || "/app",
      env: { ...process.env, TERM: "xterm-256color", COLORTERM: "truecolor" }
    });
  } catch (error) {
    ws.send(JSON.stringify({ type: "error", message: "Nem sikerült elindítani a terminált: " + error.message }));
    ws.close();
    return;
  }
  activeTerminals += 1;
  let sessionCounted = true;
  const releaseSessionCount = () => {
    if (!sessionCounted) return;
    activeTerminals = Math.max(0, activeTerminals - 1);
    sessionCounted = false;
  };
  terminal.onData(data => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "output", data }));
  });
  terminal.onExit(() => {
    releaseSessionCount();
    if (ws.readyState === WebSocket.OPEN) ws.close();
  });
  ws.on("message", raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === "input" && typeof msg.data === "string" && msg.data.length <= 4096) terminal.write(msg.data);
    if (msg.type === "resize" && Number.isInteger(msg.cols) && Number.isInteger(msg.rows)) {
      const cols = Math.max(20, Math.min(240, msg.cols));
      const rows = Math.max(5, Math.min(100, msg.rows));
      terminal.resize(cols, rows);
    }
  });
  ws.on("close", () => {
    releaseSessionCount();
    try { terminal.kill(); } catch {}
  });
});

server.listen(process.env.PORT || 8080, "0.0.0.0", () => console.log("Protected web terminal listening"));
