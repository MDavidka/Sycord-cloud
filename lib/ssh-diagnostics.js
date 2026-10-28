"use strict";

// A failed SSH login can have very different causes. Return only stable,
// sanitized classifications to the browser; never return raw OpenSSH stderr
// (which can contain hostnames, key paths, banners or provider diagnostics).
function authenticationMethods(stderr) {
  const text = String(stderr || "");
  const verbose = text.match(/Authentications that can continue:\s*([a-z0-9_,.-]+)/i);
  const fallback = text.match(/Permission denied\s*\(([a-z0-9_,.-]+)\)/i);
  const source = verbose ? verbose[1] : fallback ? fallback[1] : "";
  const recognized = new Set(["publickey", "password", "keyboard-interactive", "gssapi-with-mic", "hostbased"]);
  return [...new Set(source.split(",").map(value => value.toLowerCase().trim()).filter(value => recognized.has(value)))];
}

function classifySSHFailure(error, { authMethod = "key", provider = "ssh", username = "" } = {}) {
  const stderr = String(error && error.stderr || "").slice(-24000);
  const exitCode = error && error.code;
  const methods = authenticationMethods(stderr);
  const passwordAuth = authMethod === "password";
  const rootLogin = username === "root";
  const result = (code, message, hint) => ({ code, stage: "ssh-connect", error: message, hint, authMethods: methods });

  if (exitCode === "ENOENT") {
    return result("SSH_CLIENT_MISSING",
      passwordAuth ? "Airshell is missing the SSH client or sshpass on its host." : "Airshell is missing the SSH client on its host.",
      "Install openssh-client and, for password connections, sshpass on the Airshell host. On Heroku, enable the apt buildpack and redeploy.");
  }
  if (/REMOTE HOST IDENTIFICATION HAS CHANGED|Offending .* key|Host key verification failed/i.test(stderr) || (passwordAuth && Number(exitCode) === 7)) {
    return result("SSH_HOST_KEY_CHANGED",
      "The SSH host key was rejected.",
      "Verify the VM's current SSH host-key fingerprint with your provider before updating its trusted entry. Do not disable host-key verification.");
  }
  if (passwordAuth && Number(exitCode) === 6) {
    return result("SSH_HOST_KEY_UNTRUSTED",
      "The SSH client's trust check needs attention before password login.",
      "Verify the server SSH host-key fingerprint using your provider's console and retry.");
  }
  if (/Could not resolve hostname|Name or service not known|Temporary failure in name resolution/i.test(stderr)) {
    return result("SSH_DNS_FAILED",
      "The SSH hostname could not be resolved.",
      "Check the hostname or IP address and the Airshell host's DNS access.");
  }
  if (/Connection refused/i.test(stderr)) {
    return result("SSH_PORT_CLOSED", "The SSH port refused the connection.",
      "Confirm the SSH service is running on that port and that the VM's firewall or hosting provider allows connections.");
  }
  if (/No route to host|Network is unreachable|Connection reset by peer/i.test(stderr)) {
    return result("SSH_NETWORK_FAILED", "Airshell could not reach the remote SSH service.",
      "Check the VM's public address, provider firewall, network path, and SSH port.");
  }
  if (error && error.killed || /Connection timed out|Operation timed out|Connection timeout/i.test(stderr) || exitCode === "ETIMEDOUT") {
    return result("SSH_TIMEOUT", "The SSH connection timed out.",
      "Check the remote VM's SSH port, firewall rules and network reachability from Airshell.");
  }
  if (/Too many authentication failures|maximum authentication attempts exceeded/i.test(stderr)) {
    return result("SSH_AUTH_LIMIT", "The SSH server stopped authentication after too many attempts.",
      "Check the account and authentication settings before retrying; repeated logins may lock the account.");
  }
  if (passwordAuth && methods.length && !methods.some(value => value === "password" || value === "keyboard-interactive")) {
    return result("SSH_PASSWORD_NOT_OFFERED",
      "This SSH server is not offering password login for the selected account.",
      rootLogin
        ? "Root password SSH may be disabled even if the root console password works. Prefer an authorized SSH key or a non-root account configured in your provider console."
        : "Use the SSH key connection option or enable password login for this account using the provider's VM console.");
  }
  if (passwordAuth && (Number(exitCode) === 5 || /Permission denied|Authentication failed|Access denied/i.test(stderr))) {
    return result("SSH_PASSWORD_REJECTED", "The SSH server rejected the supplied login.",
      rootLogin
        ? "Verify the SSH port and root password in the VM provider console. Root password SSH may be forbidden; use an SSH key or a non-root user instead."
        : "Confirm the SSH username, password and port in your provider console. If password authentication is disabled, use an SSH key.");
  }
  if (!passwordAuth && /Permission denied|Authentication failed|Access denied/i.test(stderr)) {
    return result("SSH_KEY_REJECTED", "The SSH server did not accept this SSH key.",
      "Verify the public key is installed in that account's authorized_keys and file permissions are correct.");
  }
  if (/subsystem request failed|This service allows sftp connections only/i.test(stderr)) {
    return result("SSH_SHELL_UNAVAILABLE", "SSH authentication reached the server but a remote shell is unavailable.",
      "Airshell requires remote command execution. Check the server's shell and SSH restrictions.");
  }
  if (provider === "instabox") {
    return result("SSH_INSTABOX_FAILED", "Instabox SSH did not establish a usable connection.",
      "Confirm the live Instabox SSH command or token, hostname, and session status.");
  }
  return result("SSH_CONNECTION_FAILED", "The SSH connection could not be verified.",
    passwordAuth
      ? "Check the server address, port and account authentication settings. If password SSH is unavailable, choose SSH key authentication."
      : "Check the server address, port, SSH key, and authorized_keys configuration.");
}

module.exports = { authenticationMethods, classifySSHFailure };
