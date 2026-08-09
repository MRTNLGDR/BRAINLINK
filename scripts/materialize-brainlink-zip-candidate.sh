#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$ROOT/.brainlink-workspace/AFFiNE"
PARTS="$ROOT/.brainlink-zip-candidate-v23"
ARCHIVE="$ROOT/.brainlink-workspace/brainlink-zip-candidate-v23.tar.gz"
MANIFEST="$ROOT/BRAINLINK_ZIP_CANDIDATE_V23.sha256"
ARCHIVE_SHA='cf1274c5ed29f57590e71a1273edd51415a5ac88e889633b4be627a97c3baed4'
MANIFEST_SHA='95eaea164ea608f9fe52095468c40abcda85ba646a2077a273db6d4a799913f1'
"$ROOT/scripts/materialize-brainlink.sh"
echo "$MANIFEST_SHA  $MANIFEST" | sha256sum -c -
cat "$PARTS"/runtime.part*.b64 | base64 --decode > "$ARCHIVE"
echo "$ARCHIVE_SHA  $ARCHIVE" | sha256sum -c -
tar -xzf "$ARCHIVE" -C "$TARGET"
(cd "$TARGET" && sha256sum -c "$MANIFEST" && node scripts/brainlink-validate.mjs && node scripts/brainlink-validate-v23.mjs)
if [[ "${1:-}" == '--install' ]]; then
  node -e "const [a,b]=process.versions.node.split('.').map(Number); if(a!==22||b<12) process.exit(1)" || { echo 'Node >=22.12 <23 required' >&2; exit 1; }
  corepack enable
  (cd "$TARGET" && corepack yarn install --immutable && corepack yarn brainlink:check)
fi
echo '[BRAINLINK] ZIP-authoritative candidate v2.3 materialized and verified.'
echo '[BRAINLINK] Run the normal stable setup to restore v2.1.'
