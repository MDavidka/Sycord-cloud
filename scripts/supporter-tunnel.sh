#!/usr/bin/env bash
# Main VM -> Supporter VM SSH transport. Requires a provisioned, authorized SSH key.
set -euo pipefail
umask 077
usage() {
  cat <<'EOF'
Usage: supporter-tunnel --host HOST [--port SSH_PORT] [--user USER] --key PRIVATE_KEY [--shell] [--local BIND:PORT:HOST:PORT] [--remote BIND:PORT:HOST:PORT] [--socks BIND:PORT]
Run this on the Main VM. Default is a persistent tunnel (no remote shell).
  --shell             Open an interactive Supporter VM shell instead of -N
  --local SPEC        Forward Main VM local port to destination reachable by Supporter VM (-L)
  --remote SPEC       Forward Supporter VM port to destination reachable by Main VM (-R)
  --socks SPEC        Local SOCKS5 proxy on Main VM (-D)
Examples:
  supporter-tunnel --host 10.0.0.8 --key ~/.ssh/supporter --shell
  supporter-tunnel --host 10.0.0.8 --key ~/.ssh/supporter --local 127.0.0.1:8080:127.0.0.1:80
EOF
}
host="" port=22 user=root key="" shell=false
declare -a forwards=()
while (($#)); do
  case "$1" in
    --host|--port|--user|--key|--local|--remote|--socks)
      (($# >= 2)) || { echo "Missing value for $1" >&2; exit 2; }
      option="$1"; value="$2"; shift 2
      case "$option" in
        --host) host="$value";;
        --port) port="$value";;
        --user) user="$value";;
        --key) key="$value";;
        --local|--remote|--socks)
          # Bind to loopback only. Explicit public exposure requires a separate audited workflow.
          [[ "$value" == 127.0.0.1:* || "$value" == localhost:* || "$value" == '[::1]:'* ]] || { echo "Forward listeners must bind to loopback." >&2; exit 2; }
          [[ "$value" != *[[:space:]]* && "$value" != *$'\n'* ]] || exit 2
          case "$option" in --local) forwards+=(-L "$value");; --remote) forwards+=(-R "$value");; --socks) forwards+=(-D "$value");; esac
          ;;
      esac;;
    --shell) shell=true; shift;;
    --help|-h) usage; exit 0;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2;;
  esac
done
[[ "$host" =~ ^[a-zA-Z0-9.-]{1,253}$ ]] || { echo "Invalid host" >&2; exit 2; }
[[ "$port" =~ ^[0-9]{1,5}$ ]] && ((10#$port >= 1 && 10#$port <= 65535)) || { echo "Invalid port" >&2; exit 2; }
[[ "$user" =~ ^[a-zA-Z_][a-zA-Z0-9._-]{0,127}$ ]] || { echo "Invalid user" >&2; exit 2; }
[[ -f "$key" ]] || { echo "SSH private key file not found" >&2; exit 2; }
(( ${#forwards[@]} > 0 )) || [[ "$shell" == true ]] || { echo "Choose a forward or --shell" >&2; exit 2; }
args=(-p "$port" -i "$key" -o IdentitiesOnly=yes -o BatchMode=yes -o ExitOnForwardFailure=yes -o ConnectTimeout=10 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o StrictHostKeyChecking=accept-new)
args+=("${forwards[@]}")
if [[ "$shell" == true ]]; then
  exec ssh -tt "${args[@]}" -- "$user@$host"
else
  exec ssh -N -T "${args[@]}" -- "$user@$host"
fi
