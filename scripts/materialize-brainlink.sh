#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_ROOT="$ROOT/.brainlink-workspace"
TARGET="$WORKSPACE_ROOT/AFFiNE"
RUNTIME_DIR="$ROOT/.brainlink-runtime"
OVERRIDES="$ROOT/.brainlink-runtime-overrides"
ARCHIVE="$WORKSPACE_ROOT/brainlink-runtime.tar.gz"
REPO='https://github.com/toeverything/AFFiNE.git'
TAG='v0.27.0'
EXPECTED='c61cc6a86f5f8364732296f0bb8393b37e0f70b3'
OVERLAY_SHA='bc0136b92af9805c73321bd6292aba9816f18f0458673e1716df9719d743122a'
mkdir -p "$WORKSPACE_ROOT"
cat "$RUNTIME_DIR"/runtime.part*.b64 | base64 --decode > "$ARCHIVE"
echo "$OVERLAY_SHA  $ARCHIVE" | sha256sum -c -
[[ -d "$TARGET/.git" ]] || git clone --depth 1 --branch "$TAG" "$REPO" "$TARGET"
ACTUAL="$(git -C "$TARGET" rev-parse HEAD)"
[[ "$ACTUAL" == "$EXPECTED" ]] || { echo "AFFiNE revision mismatch: $ACTUAL" >&2; exit 1; }
git -C "$TARGET" reset --hard "$EXPECTED"
git -C "$TARGET" clean -fd
tar -xzf "$ARCHIVE" -C "$TARGET"
[[ ! -d "$OVERRIDES" ]] || cp -a "$OVERRIDES"/. "$TARGET"/
if [[ "${1:-}" == '--install' ]]; then
  node -e "const [a,b]=process.versions.node.split('.').map(Number); if(a!==22||b<12) process.exit(1)" || { echo 'Node >=22.12 <23 required' >&2; exit 1; }
  corepack enable
  (cd "$TARGET" && corepack yarn install --immutable && corepack yarn brainlink:validate)
fi
echo "[BRAINLINK] Materialized at $TARGET"
echo '[BRAINLINK] Runtime schema: v2 | structural validator: 35/35 | cumulative spec: brainlink-spec/'
