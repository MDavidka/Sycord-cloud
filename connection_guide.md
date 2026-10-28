# Airshell connection guide

This guide covers standard SSH, Instabox, and the temporary **Supporter VM** workflow.

## 1. Add a normal server

Open **Servers → Add server**. Select **Standard server**, then choose SSH private key, SSH password, or Instabox. Provide a name and the requested connection details. Airshell verifies authentication before saving the server.

For SSH key connections, use an appropriate dedicated user and a key with the minimum privileges required. Password authentication requires `ssh` and `sshpass` on the Airshell/Sycord host. Never paste credentials into chat, logs, or issue trackers.

## 2. Connect a Supporter VM

A Supporter VM is a **separate, time-limited root SSH connection**. Use this only for a VM you administer or have explicit authorization to access. Root login grants full machine control; prefer a limited account whenever possible.

1. First save a **main VM** as a standard server in Airshell. This is the VM from which the network helper will run.
2. Open **Add server → Supporter VM**.
3. Select the saved **main VM**.
4. Enter the **Supporter VM hostname/IP**, **SSH port**, and **root password**. The SSH username is fixed to `root`.
5. Choose **7 or 30 days** of temporary access.
6. Select **Connect supporter VM**.

### What happens

**Stage 1 — main VM helper.** Airshell connects to the selected main VM using its already-saved SSH credentials. It executes a fixed, bounded reachability test to the supporter VM's SSH port. The command uses the validated host and port only:

```sh
timeout 8 bash -c 'exec 3<>/dev/tcp/SUPPORTER_HOST/22; exec 3<&-; exec 3>&-'
```

This tests **main VM → supporter VM TCP reachability**. It does **not** authenticate to the supporter VM, create an SSH tunnel, copy credentials, install an agent, or change firewall rules. `bash` and `timeout` must be available on the main VM. The root password is never included in this command or sent to the main VM.

**Stage 2 — direct root SSH verification.** After the helper succeeds, the **Airshell host** attempts a direct SSH connection to the supporter VM as `root`, using the supplied password. For this to work, the supporter VM must permit root password authentication, and the Airshell host must be able to reach the SSH port. The credential is encrypted in Airshell's workspace store; it is not returned by the server-list API.

**Stage 3 — save and expire.** If authentication succeeds, Airshell saves the supporter connection with its selected expiration date. After expiry, the saved connection is no longer available. Removing a saved supporter connection removes Airshell's access data but **does not** revoke a remote root account, rotate its password, or close external access.

### Important architecture limitation

The helper is a **connectivity preflight**, not a proxy or jump-host connection. The SSH terminal still connects directly from Airshell to the supporter VM. If the supporter VM is reachable **only** from the main VM, this workflow will not create a usable terminal connection. That requires a separately designed and secured SSH jump-host/proxy implementation.

### Troubleshooting

| Message or symptom | What to check |
| --- | --- |
| No main VM available | Add a standard server first; supporter connections cannot be selected as main VMs |
| Main VM helper failed | The main VM's SSH access, `bash`, `timeout`, DNS, outbound network access, target IP and SSH port |
| Root authentication failed | Correct root password, target SSH service, firewall, and whether root password login is allowed |
| Helper succeeds but direct SSH fails | Airshell/Sycord host may not have a route to the supporter VM; the helper does not create a tunnel |
| Password login tooling missing | Install `ssh` and `sshpass` on the Airshell host |
| Expired supporter connection | Add a new authorized temporary connection rather than assuming expiration changed the remote root account |

## 3. Security recommendations

- Prefer SSH keys and non-root accounts for ordinary servers.
- If root password login must be enabled, restrict inbound SSH to trusted source IPs, use a strong unique password, and rotate it after support.
- Never send passwords as command-line arguments, URL query strings, or environment variables on the main VM.
- Review and revoke external SSH authorization separately from deleting an Airshell connection.
- Treat the main VM reachability test as a network check only; it is not a guarantee of authenticated or end-to-end access.

## 4. User interface

Airshell's server dialog uses a unified dark theme, touch-friendly controls, and separate standard/supporter fields. The terminal and header share the same surface color; the terminal viewport has extra breathing room between the toolbar and terminal text.

