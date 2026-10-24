const express = require("express");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");

const app = express();
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false, limit: "8kb" }));

const password = process.env.TERMINAL_PASSWORD;
if (!password || password.length < 20) {
  console.error("Set TERMINAL_PASSWORD to a random value of at least 20 characters.");
  process.exit(1);
}

const token = crypto.randomBytes(32).toString("hex");
const html = (message = "") => `<!doctype html>
<html lang="hu"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sycord Cloud</title>
<style>body{font:16px system-ui;max-width:600px;margin:12vh auto;padding:24px;background:#111;color:#eee}input,button{font:inherit;padding:12px;width:100%;box-sizing:border-box;margin:8px 0}input{background:#222;color:white;border:1px solid #555}button{background:#ddd;color:#111;border:0;border-radius:8px}small{color:#aaa}</style>
<h1>Sycord Cloud</h1><p>Védett terminál-előkészítő</p><p>${message}</p>
<form method="post" action="/login"><label>Jelszó</label><input type="password" name="password" autocomplete="current-password" required><button>Belépés</button></form>
<small>Az agy CLI csak akkor indul, ha a konténerben sikeresen települt.</small></html>`;

app.get("/", (_req, res) => res.type("html").send(html()));
app.post("/login", (req, res) => {
  const supplied = Buffer.from(String(req.body.password || ""));
  const expected = Buffer.from(password);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.status(401).type("html").send(html("Hibás jelszó."));
  }
  res.setHeader("Set-Cookie", `terminal_auth=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`);
  res.redirect("/terminal");
});
app.get("/terminal", (req, res) => {
  const cookie = (req.headers.cookie || "").split("; ").find(v => v.startsWith("terminal_auth="));
  if (!cookie || cookie.split("=")[1] !== token) return res.status(401).type("html").send(html("Előbb jelentkezz be."));
  res.type("html").send(`<!doctype html><html lang="hu"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sycord Cloud</title><body style="font:16px system-ui;background:#111;color:#eee;padding:24px"><h1>Konténer állapota</h1><p>A webes hozzáférés működik.</p><p>Ez az első biztonságos alapverzió; interaktív terminál még nincs bekapcsolva.</p><p>Ne tegyél közzé jelszót vagy API-kulcsot.</p></body></html>`);
});
app.listen(process.env.PORT || 8080, "0.0.0.0", () => console.log("Web app started"));
