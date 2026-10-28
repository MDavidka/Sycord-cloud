"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { authenticationMethods, classifySSHFailure } = require("../lib/ssh-diagnostics");

function failed(code, stderr = "", extra = {}) {
  return { code, stderr, ...extra };
}
const passwordOptions = { authMethod: "password", username: "root" };

test("parses SSH authentication offers without exposing arbitrary stderr", () => {
  assert.deepEqual(authenticationMethods("debug1: Authentications that can continue: publickey,password,keyboard-interactive\n"), ["publickey", "password", "keyboard-interactive"]);
  assert.deepEqual(authenticationMethods("Permission denied (publickey)."), ["publickey"]);
  assert.deepEqual(authenticationMethods("unrelated error"), []);
});

test("distinguishes password disabled from incorrect password", () => {
  const disabled = classifySSHFailure(failed(255, "debug1: Authentications that can continue: publickey\nroot@host: Permission denied (publickey)."), passwordOptions);
  assert.equal(disabled.code, "SSH_PASSWORD_NOT_OFFERED");
  assert.match(disabled.hint, /SSH key/i);
  const rejected = classifySSHFailure(failed(5, "Permission denied (publickey,password)."), passwordOptions);
  assert.equal(rejected.code, "SSH_PASSWORD_REJECTED");
  assert.doesNotMatch(rejected.error, /publickey,password/);
});

test("handles refused port, timeout and host key mismatch", () => {
  assert.equal(classifySSHFailure(failed(255, "connect to host x port 22022: Connection refused"), passwordOptions).code, "SSH_PORT_CLOSED");
  assert.equal(classifySSHFailure(failed("ETIMEDOUT", "", { killed: true }), passwordOptions).code, "SSH_TIMEOUT");
  assert.equal(classifySSHFailure(failed(255, "WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!"), passwordOptions).code, "SSH_HOST_KEY_CHANGED");
});

test("does not return raw server diagnostics or credentials", () => {
  const secret = "a-private-password-value";
  const diagnostic = classifySSHFailure(failed(255, "Permission denied (" + secret + ")."), passwordOptions);
  assert.equal(JSON.stringify(diagnostic).includes(secret), false);
});

test("key authentication and missing ssh client errors are distinguishable", () => {
  assert.equal(classifySSHFailure(failed(255, "Permission denied (publickey)."), {authMethod:"key"}).code, "SSH_KEY_REJECTED");
  assert.equal(classifySSHFailure(failed("ENOENT"), passwordOptions).code, "SSH_CLIENT_MISSING");
});
