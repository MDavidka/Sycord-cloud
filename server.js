const express = require("express");
const crypto = require("node:crypto");
const http = require("node:http");
const pty = require("node-pty");
const { WebSocketServer, WebSocket } = require("ws");

const app = express();
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false, limit: "8kb" }));

const password = (process.env.TERMINAL_PASSWORD || "").trim();
if (!password || password.length < 20) {
  console.error("Set TERMINAL_PASSWORD to a random value of at least 20 characters.");
  process.exit(1);
}

const sessionToken = crypto.randomBytes(32).toString("hex");
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

function hasSession(req) {
  const cookies = (req.headers.cookie || "").split(";").map(v => v.trim());
  const item = cookies.find(v => v.startsWith("terminal_auth="));
  return Boolean(item && item.slice("terminal_auth=".length) === sessionToken);
}

const loginPage = (message = "") => `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Sycord Cloud</title>
<style>
*{box-sizing:border-box}body{font:16px system-ui;max-width:560px;margin:12vh auto;padding:24px;background:#101114;color:#f4f4f5}h1{font-size:2rem}p{color:#b8bbc5;line-height:1.5}input,button{font:inherit;padding:13px;width:100%;margin:8px 0;border-radius:10px}input{background:#191a20;color:white;border:1px solid #454752}button{background:#f4f4f5;color:#111;border:0;font-weight:650}small{color:#a3a6b1}
</style></head><body><h1>Sycord Cloud</h1><p>Biztonságos webes Linux-terminál</p><p>${message}</p><form method="post" action="/login"><label for="password">Termináljelszó</label><input id="password" type="password" name="password" autocomplete="current-password" required><button type="submit">Belépés</button></form><small>Soha ne oszd meg a jelszavadat vagy a hitelesítő adataidat.</small></body></html>`;

app.get("/", (_req, res) => {
  if (hasSession(_req)) return res.redirect("/terminal");
  res.type("html").send(loginPage());
});

app.post("/login", (req, res) => {
  const supplied = Buffer.from(String(req.body.password || "").trim());
  const expected = Buffer.from(password);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.status(401).type("html").send(loginPage("Hibás jelszó."));
  }
  res.setHeader("Set-Cookie", `terminal_auth=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`);
  res.redirect(303, "/terminal");
});

app.get("/terminal", (req, res) => {
  if (!hasSession(req)) return res.status(401).type("html").send(loginPage("Előbb jelentkezz be."));
  res.type("html").send(`<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Sycord Cloud Terminal</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.min.css">
<style>
*{box-sizing:border-box}html,body{height:100%;margin:0;background:#101114;color:#f4f4f5;font:14px system-ui}body{display:flex;flex-direction:column}.top{padding:12px 14px;display:flex;gap:10px;align-items:center;justify-content:space-between;border-bottom:1px solid #292b32}.brand{font-weight:700}.state{font-size:12px;color:#a8abb6}.wrap{padding:10px;flex:1;min-height:0}#terminal{height:100%;padding:10px;border:1px solid #292b32;border-radius:10px;background:#08090b}.foot{padding:8px 14px;color:#9da1ad;font-size:12px}button{background:#24262d;color:#eee;border:1px solid #41434c;border-radius:8px;padding:8px 12px;font:inherit}
</style></head><body><header class="top"><div><div class="brand">Sycord Cloud</div><div class="state" id="state">Csatlakozás…</div></div><button id="clear">Törlés</button></header><main class="wrap"><div id="terminal"></div></main><footer class="foot">Privát terminál • Ne futtass ismeretlen parancsokat, és ne illessz be titkokat.</footer>
<script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js"></script>
<script>
(() => {
  const state = document.getElementById('state');
  try {
    if (typeof Terminal === 'undefined' || typeof FitAddon === 'undefined') {
      state.textContent = 'A terminál felülete nem töltődött be. Frissítsd az oldalt.';
      return;
    }
    const term = new Terminal({cursorBlink:true,convertEol:true,scrollback:3000,fontSize:13,fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',theme:{background:'#08090b',foreground:'#e7e9ee',cursor:'#e7e9ee'}});
    const fit = new FitAddon.FitAddon();
    term.loadAddon(fit); term.open(document.getElementById('terminal')); fit.fit();
    const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
    state.textContent = 'WebSocket kapcsolat indítása…';
    const socket = new WebSocket(scheme + '//' + location.host + '/ws');
    socket.addEventListener('open', () => { state.textContent = 'Csatlakoztatva'; fit.fit(); socket.send(JSON.stringify({type:'resize',cols:term.cols,rows:term.rows})); });
    socket.addEventListener('message', event => { try { const msg=JSON.parse(event.data); if(msg.type==='output') term.write(msg.data); else if(msg.type==='error') { term.writeln('\\r\\n\\x1b[31m'+msg.message+'\\x1b[0m'); state.textContent = 'Terminálhiba'; } } catch {} });
    socket.addEventListener('close', event => { state.textContent = 'Kapcsolat lezárva (' + event.code + '). Frissítsd az oldalt.'; });
    socket.addEventListener('error', () => { state.textContent = 'WebSocket kapcsolódási hiba'; });
    term.onData(data => { if(socket.readyState===WebSocket.OPEN) socket.send(JSON.stringify({type:'input',data})); });
    document.getElementById('clear').addEventListener('click', () => term.clear());
    window.addEventListener('resize', () => { fit.fit(); if(socket.readyState===WebSocket.OPEN) socket.send(JSON.stringify({type:'resize',cols:term.cols,rows:term.rows})); });
  } catch (error) {
    state.textContent = 'Felületi hiba: ' + String(error && error.message || error).slice(0,120);
  }
})();
</script></body></html>`);
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
  terminal.onData(data => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "output", data }));
  });
  terminal.onExit(() => { if (ws.readyState === WebSocket.OPEN) ws.close(); });
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
  ws.on("close", () => { try { terminal.kill(); } catch {} });
});

server.listen(process.env.PORT || 8080, "0.0.0.0", () => console.log("Protected web terminal listening"));
