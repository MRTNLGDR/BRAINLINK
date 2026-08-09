#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$ROOT/.brainlink-workspace/AFFiNE"
V21="$ROOT/scripts/materialize-brainlink.sh"
V22_OVERRIDES="$ROOT/.brainlink-v22-overrides"
TRANSFORM="$ROOT/scripts/apply-execution-v22-safe.mjs"
VALIDATE22="$ROOT/scripts/brainlink-v22-validate.mjs"
NON_BREAKAGE="$ROOT/scripts/brainlink-nonbreakage-guard.mjs"
DOC46="$ROOT/docs/46_EXECUTION_ENVELOPES_2026-08-08.md"

node -e "const [a,b]=process.versions.node.split('.').map(Number); if(a!==22||b<12) process.exit(1)" || { echo 'Node >=22.12 <23 required' >&2; exit 1; }
[[ -d "$V22_OVERRIDES" ]] || { echo 'Missing isolated Brainlink v2.2 overrides' >&2; exit 1; }
[[ -f "$TRANSFORM" ]] || { echo 'Missing transport-safe Brainlink v2.2 source migrator' >&2; exit 1; }
[[ -f "$NON_BREAKAGE" ]] || { echo 'Missing Brainlink non-breakage guard' >&2; exit 1; }

echo '[BRAINLINK] Enforcing repository non-breakage policy before candidate work...'
node "$NON_BREAKAGE" "$ROOT"

echo '[BRAINLINK] Materializing and verifying stable v2.1 base first...'
bash "$V21"

echo '[BRAINLINK] Injecting isolated v2.2-only source files...'
cp -a "$V22_OVERRIDES"/. "$TARGET"/

echo '[BRAINLINK] Applying transport-safe deterministic Execution Envelope v2.2 migration...'
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

echo "[BRAINLINK] Runtime v2.2 candidate materialized at $TARGET"
echo '[BRAINLINK] Stable release remains v2.1 until candidate promotion gates pass.'
echo '[BRAINLINK] Non-breakage: 13/13 | Regression: 42/42 | Execution Envelopes: 12/12 | stable/candidate sources isolated'
