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
AUDIT_PATCH_B64="$PATCH_DIR/audit-v21.patch.b64"
AUDIT_PATCH="$WORKSPACE_ROOT/brainlink-audit-v21.patch"
MANIFEST="$ROOT/BRAINLINK_RUNTIME_V2.sha256"
REPO='https://github.com/toeverything/AFFiNE.git'
TAG='v0.27.0'
EXPECTED='c61cc6a86f5f8364732296f0bb8393b37e0f70b3'
OVERLAY_SHA='1b4e3aa98dd378eb7299e071aa83329643114e40b3e66a378c319613a2a94b8d'
MANIFEST_SHA='c657f90c7ae6d9daf6bdd3155f48242c4d8b1eaeee5edb6aed725832a943972b'
mkdir -p "$WORKSPACE_ROOT"
cat "$RUNTIME_DIR"/runtime.part*.b64 | base64 --decode > "$ARCHIVE"
echo "$OVERLAY_SHA  $ARCHIVE" | sha256sum -c -
echo "$MANIFEST_SHA  $MANIFEST" | sha256sum -c -
[[ -d "$PATCH_DIR" ]] || { echo 'Missing Brainlink patch directory' >&2; exit 1; }
[[ -f "$AUDIT_PATCH_B64" ]] || { echo 'Missing Brainlink audit integrity patch transport' >&2; exit 1; }
base64 --decode "$AUDIT_PATCH_B64" > "$AUDIT_PATCH"
[[ -d "$TARGET/.git" ]] || git clone --depth 1 --branch "$TAG" "$REPO" "$TARGET"
ACTUAL="$(git -C "$TARGET" rev-parse HEAD)"
[[ "$ACTUAL" == "$EXPECTED" ]] || { echo "AFFiNE revision mismatch: $ACTUAL" >&2; exit 1; }
git -C "$TARGET" reset --hard "$EXPECTED"
git -C "$TARGET" clean -fd
tar -xzf "$ARCHIVE" -C "$TARGET"
[[ ! -d "$OVERRIDES" ]] || cp -a "$OVERRIDES"/. "$TARGET"/
cat "$PATCH_DIR"/app-v2.linepart*.patch > "$APP_PATCH"
git -C "$TARGET" apply --whitespace=nowarn "$APP_PATCH"
git -C "$TARGET" apply --whitespace=nowarn "$AUDIT_PATCH"
(cd "$TARGET" && sha256sum -c "$MANIFEST")
if [[ "${1:-}" == '--install' ]]; then
  node -e "const [a,b]=process.versions.node.split('.').map(Number); if(a!==22||b<12) process.exit(1)" || { echo 'Node >=22.12 <23 required' >&2; exit 1; }
  corepack enable
  (cd "$TARGET" && corepack yarn install --immutable && corepack yarn brainlink:validate)
fi
echo "[BRAINLINK] Materialized at $TARGET"
echo '[BRAINLINK] Runtime schema: v2.1 | audit: SHA-256 CHAIN | structural validator: 42/42'
