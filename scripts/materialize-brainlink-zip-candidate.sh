#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$ROOT/.brainlink-workspace/AFFiNE"
PARTS="$ROOT/.brainlink-zip-candidate-v23-runtime"
ARCHIVE="$ROOT/.brainlink-workspace/brainlink-zip-candidate-v23-runtime.tar.gz"
TRANSPORT_MANIFEST="$ROOT/BRAINLINK_ZIP_CANDIDATE_V23_RUNTIME.sha256"
FINAL_MANIFEST="$ROOT/BRAINLINK_ZIP_CANDIDATE_V23_FINAL.sha256"
FINAL_OVERRIDES="$ROOT/.brainlink-v23-final-overrides"
AUTHORITY="$ROOT/BRAINLINK_ZIP_AUTHORITY.lock"
AUDITOR="$ROOT/scripts/brainlink-audit-v23-transport.mjs"
AUDIT_EVIDENCE="$ROOT/.brainlink-workspace/brainlink-v23-transport-audit.json"

command -v node >/dev/null || { echo 'Node >=22.12 <23 required' >&2; exit 1; }
command -v tar >/dev/null || { echo 'tar is required' >&2; exit 1; }
command -v base64 >/dev/null || { echo 'base64 is required' >&2; exit 1; }
command -v sha256sum >/dev/null || { echo 'sha256sum is required' >&2; exit 1; }
[[ -f "$ROOT/scripts/materialize-brainlink.sh" ]] || { echo 'Stable materializer is missing' >&2; exit 1; }
[[ -d "$PARTS" ]] || { echo 'Compact v2.3 runtime transport is missing' >&2; exit 1; }
[[ -f "$TRANSPORT_MANIFEST" ]] || { echo 'Compact v2.3 transport manifest is missing' >&2; exit 1; }
[[ -f "$FINAL_MANIFEST" ]] || { echo 'Final v2.3 assembled-runtime manifest is missing' >&2; exit 1; }
[[ -d "$FINAL_OVERRIDES" ]] || { echo 'Final v2.3 overrides are missing' >&2; exit 1; }
[[ -f "$AUTHORITY" ]] || { echo 'ZIP authority lock is missing' >&2; exit 1; }
[[ -f "$AUDITOR" ]] || { echo 'ZIP transport auditor is missing' >&2; exit 1; }

read_lock() {
  local key="$1"
  awk -v key="$key" 'index($0, key "=") == 1 { print substr($0, length(key) + 2); exit }' "$AUTHORITY"
}
ARCHIVE_SHA="$(read_lock candidate_runtime_overlay_sha256)"
TRANSPORT_MANIFEST_SHA="$(read_lock candidate_runtime_manifest_sha256)"
FINAL_MANIFEST_SHA="$(read_lock candidate_final_runtime_manifest_sha256)"
FINAL_PACKAGE_SHA="$(read_lock candidate_final_package_sha256)"
[[ "$ARCHIVE_SHA" =~ ^[0-9a-f]{64}$ ]] || { echo 'candidate_runtime_overlay_sha256 is not pinned' >&2; exit 1; }
[[ "$TRANSPORT_MANIFEST_SHA" =~ ^[0-9a-f]{64}$ ]] || { echo 'candidate_runtime_manifest_sha256 is not pinned' >&2; exit 1; }
[[ "$FINAL_MANIFEST_SHA" =~ ^[0-9a-f]{64}$ ]] || { echo 'candidate_final_runtime_manifest_sha256 is not pinned' >&2; exit 1; }
[[ "$FINAL_PACKAGE_SHA" =~ ^[0-9a-f]{64}$ ]] || { echo 'candidate_final_package_sha256 is not pinned' >&2; exit 1; }

mkdir -p "$ROOT/.brainlink-workspace"
echo '[BRAINLINK] Auditing compact v2.3 transport before touching the AFFiNE workspace...'
node "$AUDITOR" --root="$ROOT" --output="$AUDIT_EVIDENCE" --require-pinned

echo '[BRAINLINK] Rebuilding verified stable v2.1 baseline first...'
"$ROOT/scripts/materialize-brainlink.sh"
echo "$TRANSPORT_MANIFEST_SHA  $TRANSPORT_MANIFEST" | sha256sum -c -
echo "$FINAL_MANIFEST_SHA  $FINAL_MANIFEST" | sha256sum -c -
echo "$FINAL_PACKAGE_SHA  $FINAL_OVERRIDES/package.json" | sha256sum -c -

mapfile -t PART_FILES < <(printf '%s\n' "$PARTS"/runtime.part*.b64 | sort -V)
[[ ${#PART_FILES[@]} -gt 0 && -f "${PART_FILES[0]}" ]] || { echo 'No compact v2.3 runtime fragments found' >&2; exit 1; }
cat "${PART_FILES[@]}" | tr -d '\r\n\t ' | base64 --decode > "$ARCHIVE"
echo "$ARCHIVE_SHA  $ARCHIVE" | sha256sum -c -

echo '[BRAINLINK] Applying signed ZIP-authoritative transport over stable baseline...'
tar -xzf "$ARCHIVE" -C "$TARGET"
(cd "$TARGET" && sha256sum -c "$TRANSPORT_MANIFEST")

echo '[BRAINLINK] Applying the independently pinned lock-compatible final package...'
cp -a "$FINAL_OVERRIDES"/. "$TARGET"/
(cd "$TARGET" && sha256sum -c "$FINAL_MANIFEST" && node scripts/brainlink-validate.mjs && node scripts/brainlink-validate-v23.mjs)

if [[ "${1:-}" == '--install' ]]; then
  node -e "const [a,b]=process.versions.node.split('.').map(Number); if(a!==22||b<12) process.exit(1)" || { echo 'Node >=22.12 <23 required' >&2; exit 1; }
  command -v corepack >/dev/null || { echo 'Corepack is required' >&2; exit 1; }
  corepack enable
  (cd "$TARGET" && corepack yarn install --immutable && corepack yarn brainlink:check)
fi

echo '[BRAINLINK] ZIP-authoritative candidate v2.3 assembled runtime materialized and verified.'
echo "[BRAINLINK] Transport audit evidence: $AUDIT_EVIDENCE"
echo '[BRAINLINK] Run the normal stable setup to restore v2.1.'
