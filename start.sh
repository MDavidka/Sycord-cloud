#!/usr/bin/env bash
set -euo pipefail

# Install the official Antigravity CLI into the non-root app user's home.
export PATH="$HOME/.local/bin:$PATH"
if ! command -v agy >/dev/null 2>&1; then
  curl -fsSL https://antigravity.google/cli/install.sh | bash
fi

agy --version
exec node /app/server.js
