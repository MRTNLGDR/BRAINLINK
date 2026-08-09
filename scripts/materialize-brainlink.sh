#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT/scripts/brainlink-materialize.mjs"
WORKSPACE="$ROOT/.brainlink-workspace"
node -e "const [a,b]=process.versions.node.split('.').map(Number); if(a!==22||b<12) process.exit(1)" || {
  echo 'Node.js >=22.12.0 <23.0.0 is required.' >&2
  exit 1
}
ARGS=("$SCRIPT" --source-root "$ROOT" --workspace-root "$WORKSPACE")
[[ -z "${BRAINLINK_GIT:-}" ]] || ARGS+=(--git "$BRAINLINK_GIT")
[[ "${1:-}" != '--install' ]] || ARGS+=(--install)
node "${ARGS[@]}"
