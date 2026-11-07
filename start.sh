#!/usr/bin/env bash
set -eu
cd "$(dirname "$0")"

# The Antigravity CLI is optional for the web process. Installing it during
# boot used to miss Heroku's port-binding deadline whenever the download stalled,
# which crashed the dyno before Node could listen.
export PATH="${HOME}/.local/bin:${PATH}"
if ! command -v agy >/dev/null 2>&1; then
  (curl -fsSL https://antigravity.google/cli/install.sh | bash) >/tmp/agy-install.log 2>&1 &
fi

exec node server.js
