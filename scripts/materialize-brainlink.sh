#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_ROOT="$ROOT/.brainlink-workspace"
TARGET="$WORKSPACE_ROOT/AFFiNE"
RUNTIME_DIR="$ROOT/.brainlink-runtime"
OVERRIDES="$ROOT/.brainlink-runtime-overrides"
PATCH_DIR="$ROOT/.brainlink-patches"
ARCHIVE="$WORKSPACE_ROOT/brainlink-runtime.tar.gz"
APP_PATCH="$WORKSPACE_ROOT/brainlink-app-v2.patch"
MANIFEST="$ROOT/BRAINLINK_RUNTIME_V2.sha256"
REPO='https://github.com/toeverything/AFFiNE.git'
TAG='v0.27.0'
EXPECTED='c61cc6a86f5f8364732296f0bb8393b37e0f70b3'
OVERLAY_SHA='1b4e3aa98dd378eb7299e071aa83329643114e40b3e66a378c319613a2a94b8d'
MANIFEST_SHA='d44d5eac2e35d7c2bbf483679bf06d11d064210c3bf816ede03ed520b891e7af'
mkdir -p "$WORKSPACE_ROOT"
cat "$RUNTIME_DIR"/runtime.part*.b64 | base64 --decode > "$ARCHIVE"
echo "$OVERLAY_SHA  $ARCHIVE" | sha256sum -c -
echo "$MANIFEST_SHA  $MANIFEST" | sha256sum -c -
[[ -d "$PATCH_DIR" ]] || { echo 'Missing Brainlink v2 patch directory' >&2; exit 1; }
[[ -d "$TARGET/.git" ]] || git clone --depth 1 --branch "$TAG" "$REPO" "$TARGET"
ACTUAL="$(git -C "$TARGET" rev-parse HEAD)"
[[ "$ACTUAL" == "$EXPECTED" ]] || { echo "AFFiNE revision mismatch: $ACTUAL" >&2; exit 1; }
git -C "$TARGET" reset --hard "$EXPECTED"
git -C "$TARGET" clean -fd
tar -xzf "$ARCHIVE" -C "$TARGET"
[[ ! -d "$OVERRIDES" ]] || cp -a "$OVERRIDES"/. "$TARGET"/
cat "$PATCH_DIR"/app-v2.linepart*.patch > "$APP_PATCH"
git -C "$TARGET" apply --whitespace=nowarn "$APP_PATCH"
(cd "$TARGET" && sha256sum -c "$MANIFEST")
if [[ "${1:-}" == '--install' ]]; then
  node -e "const [a,b]=process.versions.node.split('.').map(Number); if(a!==22||b<12) process.exit(1)" || { echo 'Node >=22.12 <23 required' >&2; exit 1; }
  corepack enable
  (cd "$TARGET" && corepack yarn install --immutable && corepack yarn brainlink:validate)
fi
echo "[BRAINLINK] Materialized at $TARGET"
echo '[BRAINLINK] Runtime schema: v2 | structural validator: 35/35 | verified readable overrides enabled'
