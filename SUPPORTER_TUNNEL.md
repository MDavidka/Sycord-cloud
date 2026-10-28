# Main VM → Supporter VM SSH tunnel

This is a **Main VM initiated** SSH connection, not the previous network-only reachability check. The `scripts/supporter-tunnel.sh` helper supports interactive SSH, local forwarding (`-L`), reverse forwarding (`-R`), and SOCKS5 (`-D`). It runs on the **Main VM**, not Heroku. The listener bind is restricted to loopback by default.

## Provision keys securely

1. On the **Main VM**, generate a dedicated key:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/sycord_supporter -C sycord-supporter -N ''
cat ~/.ssh/sycord_supporter.pub
```

2. On the **Supporter VM**, add the public key (not the private key) to the intended account's `~/.ssh/authorized_keys`, with permissions 700 on `~/.ssh` and 600 on `authorized_keys`. Prefer a dedicated non-root account with only the privileges required. Configure a key expiry using the OpenSSH `expiry-time="YYYYMMDDHHMMSS"` authorized_keys option where supported; remove the key when access ends. The app's existing 7/30-day saved-record expiry **does not revoke remote SSH keys**.

3. Transfer `scripts/supporter-tunnel.sh` to the Main VM as `~/supporter-tunnel` and `chmod 700 ~/supporter-tunnel`.

## Run from the Main VM

Interactive shell:

```sh
~/supporter-tunnel --host SUPPORTER_HOST --port 22 --user support --key ~/.ssh/sycord_supporter --shell
```

Forward Main VM localhost:8080 to Supporter VM localhost:80:

```sh
~/supporter-tunnel --host SUPPORTER_HOST --key ~/.ssh/sycord_supporter --local 127.0.0.1:8080:127.0.0.1:80
```

Reverse-forward Supporter VM localhost:9000 to Main VM localhost:3000:

```sh
~/supporter-tunnel --host SUPPORTER_HOST --key ~/.ssh/sycord_supporter --remote 127.0.0.1:9000:127.0.0.1:3000
```

SOCKS5 on Main VM localhost:1080:

```sh
~/supporter-tunnel --host SUPPORTER_HOST --key ~/.ssh/sycord_supporter --socks 127.0.0.1:1080
```

Multiple forward flags may be combined. Close the terminal or send Ctrl+C to stop the tunnel. For a durable tunnel, use a supervisor (systemd or autossh) and separately enforce access expiry and revocation.

## Requirements and limitations

- Main VM needs OpenSSH client, network reachability to Supporter VM SSH port, and a dedicated authorized SSH key. No `sshpass` is required **on Main VM** for this key-based tunnel.
- Supporter VM SSH daemon must allow `AllowTcpForwarding`; reverse forwarding additionally requires server policy to permit it.
- Do not use `GatewayPorts yes` unless you intend to expose a forwarded service publicly.
- SSH host keys are accepted on first use. Verify the fingerprint out of band before using this in production.
- This helper **does not automatically provision keys, install itself on Main VM, integrate with the browser's server picker, or revoke credentials**. Those require a separate authenticated deployment workflow. The existing Supporter VM creation route still attempts direct password SSH from Sycord Cloud and may report missing `sshpass` until Heroku is configured.
