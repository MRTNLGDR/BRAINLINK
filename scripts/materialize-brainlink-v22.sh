#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$ROOT/.brainlink-workspace/AFFiNE"
V21="$ROOT/scripts/materialize-brainlink.sh"
TRANSFORM="$ROOT/scripts/apply-execution-v22.mjs"
VALIDATE22="$ROOT/scripts/brainlink-v22-validate.mjs"
DOC46="$ROOT/docs/46_EXECUTION_ENVELOPES_2026-08-08.md"

node -e "const [a,b]=process.versions.node.split('.').map(Number); if(a!==22||b<12) process.exit(1)" || { echo 'Node >=22.12 <23 required' >&2; exit 1; }

echo '[BRAINLINK] Materializing and verifying stable v2.1 base first...'
bash "$V21"

echo '[BRAINLINK] Applying deterministic Execution Envelope v2.2 migration...'
node "$TRANSFORM" "$TARGET"
[[ ! -f "$DOC46" ]] || cp "$DOC46" "$TARGET/docs/46_EXECUTION_ENVELOPES_2026-08-08.md"

echo '[BRAINLINK] Re-running the 42 v2.1 regression invariants on the upgraded tree...'
(cd "$TARGET" && node scripts/brainlink-validate.mjs)
echo '[BRAINLINK] Running 12 v2.2 Execution Envelope invariants...'
node "$VALIDATE22" "$TARGET"

if [[ "${1:-}" == '--install' ]]; then
  corepack enable
  (cd "$TARGET" && corepack yarn install --immutable && corepack yarn brainlink:validate && corepack yarn brainlink:test)
  node "$VALIDATE22" "$TARGET"
fi

echo "[BRAINLINK] Runtime v2.2 materialized at $TARGET"
echo '[BRAINLINK] Regression: 42/42 | Execution Envelopes: 12/12 | combined structural invariants: 54/54'
