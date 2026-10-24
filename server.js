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

const sessionToken = crypto.randomBytes(32).toString("hex");
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
  return Boolean(item && item.slice("terminal_auth=".length) === sessionToken);
}

const loginPage = (message = "") => `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#131313"><link rel="icon" type="image/svg+xml" href="/assets/favicon.svg"><title>Sycord Cloud</title>
<style>
*{box-sizing:border-box}body{font:16px system-ui;max-width:560px;margin:12vh auto;padding:24px;background:#101114;color:#f4f4f5}h1{font-size:2rem}p{color:#b8bbc5;line-height:1.5}input,button{font:inherit;padding:13px;width:100%;margin:8px 0;border-radius:10px}input{background:#191a20;color:white;border:1px solid #454752}button{background:#f4f4f5;color:#111;border:0;font-weight:650}small{color:#a3a6b1}
</style></head><body><h1>Sycord Cloud</h1><p>Biztonságos webes Linux-terminál</p><p>${message}</p><form method="post" action="/login"><label for="password">Termináljelszó</label><input id="password" type="password" name="password" autocomplete="current-password" required><button type="submit">Belépés</button></form><small>Soha ne oszd meg a jelszavadat vagy a hitelesítő adataidat.</small></body></html>`;

app.get("/", (_req, res) => {
  if (hasSession(_req)) return res.redirect("/dashboard");
  res.type("html").send(loginPage());
});

app.post("/login", (req, res) => {
  const supplied = Buffer.from(String(req.body.password || "").trim());
  const expected = Buffer.from(password);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.status(401).type("html").send(loginPage("Hibás jelszó."));
  }
  res.setHeader("Set-Cookie", `terminal_auth=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`);
  res.redirect(303, "/dashboard");
});

app.get("/dashboard", (req, res) => {
  if (!hasSession(req)) return res.status(401).type("html").send(loginPage("Előbb jelentkezz be."));
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
      sessionTtlSeconds: 3600,
      secureCookie: true,
      webSocketProtected: true
    }
  });
});

app.post("/logout", (_req, res) => {
  res.setHeader("Set-Cookie", "terminal_auth=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0");
  res.redirect(303, "/");
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
