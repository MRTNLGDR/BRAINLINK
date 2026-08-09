import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const absolute = file => path.join(root, file);
const read = file => fs.readFileSync(absolute(file), 'utf8');
const exists = file => fs.existsSync(absolute(file));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const parseLock = content => Object.fromEntries(
  content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const separator = line.indexOf('=');
      return separator < 0 ? [line, ''] : [line.slice(0, separator), line.slice(separator + 1)];
    })
);
const isSha256 = value => /^[0-9a-f]{64}$/.test(value ?? '');
const transportPartPattern = /^runtime\.part(\d+)([a-z]*)\.b64$/;
const sortTransportParts = names => names.sort((left, right) => {
  const leftMatch = left.match(transportPartPattern);
  const rightMatch = right.match(transportPartPattern);
  const numberDelta = Number(leftMatch?.[1]) - Number(rightMatch?.[1]);
  return numberDelta || String(leftMatch?.[2]).localeCompare(String(rightMatch?.[2]));
});

const failures = [];
const checks = [];
const check = (name, condition, detail = '') => {
  const ok = Boolean(condition);
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
};

const stableLock = parseLock(read('AFFINE_UPSTREAM.lock'));
const zipLock = parseLock(read('BRAINLINK_ZIP_AUTHORITY.lock'));
const stableManifestText = read('BRAINLINK_RUNTIME_V2.sha256');
const zipFullManifestText = read('BRAINLINK_ZIP_CANDIDATE_V23.sha256');
const zipRuntimeManifestText = read('BRAINLINK_ZIP_CANDIDATE_V23_RUNTIME.sha256');
const stableSetup = read('BRAINLINK_SETUP.bat');
const v22Setup = exists('BRAINLINK_SETUP_V22.bat') ? read('BRAINLINK_SETUP_V22.bat') : '';
const v23Setup = exists('BRAINLINK_SETUP_ZIP_CANDIDATE.bat') ? read('BRAINLINK_SETUP_ZIP_CANDIDATE.bat') : '';
const stablePs = read('scripts/materialize-brainlink.ps1');
const stableSh = read('scripts/materialize-brainlink.sh');
const v22ps = exists('scripts/materialize-brainlink-v22.ps1') ? read('scripts/materialize-brainlink-v22.ps1') : '';
const v22sh = exists('scripts/materialize-brainlink-v22.sh') ? read('scripts/materialize-brainlink-v22.sh') : '';
const v23ps = exists('scripts/materialize-brainlink-zip-candidate.ps1') ? read('scripts/materialize-brainlink-zip-candidate.ps1') : '';
const v23sh = exists('scripts/materialize-brainlink-zip-candidate.sh') ? read('scripts/materialize-brainlink-zip-candidate.sh') : '';
const context = read('BRAINLINK_CONTEXT_V5.lock');

const stableExecution = '.brainlink-runtime-overrides/packages/frontend/core/src/brainlink/execution.ts';
const stableExecutionTest = '.brainlink-runtime-overrides/packages/frontend/core/src/brainlink/__tests__/execution.spec.ts';
const candidateExecution = '.brainlink-v22-overrides/packages/frontend/core/src/brainlink/execution.ts';
const candidateExecutionTest = '.brainlink-v22-overrides/packages/frontend/core/src/brainlink/__tests__/execution.spec.ts';
const zipRuntimePartsDir = '.brainlink-zip-candidate-v23-runtime';
const zipPartNames = exists(zipRuntimePartsDir)
  ? sortTransportParts(fs.readdirSync(absolute(zipRuntimePartsDir)).filter(name => transportPartPattern.test(name)))
  : [];
let zipRuntimeArchiveHash = '';
let zipOverlayDecodeError = '';
try {
  const encoded = zipPartNames
    .map(name => read(path.posix.join(zipRuntimePartsDir, name)))
    .join('')
    .replace(/\s+/g, '');
  const decoded = encoded ? Buffer.from(encoded, 'base64') : Buffer.alloc(0);
  if (decoded.length && (decoded[0] !== 0x1f || decoded[1] !== 0x8b)) throw new Error('decoded transport lacks gzip magic');
  zipRuntimeArchiveHash = decoded.length ? sha256(decoded) : '';
} catch (error) {
  zipOverlayDecodeError = error instanceof Error ? error.message : String(error);
}
const zipCorpusLine = zipFullManifestText
  .split(/\r?\n/)
  .find(line => line.endsWith('  docs/corpus/v1.0.0/Brainlink_Documentacao_Completa_v1.0.0.zip'));
const zipCorpusHash = zipCorpusLine?.split(/\s{2}/, 1)[0] ?? '';
const v22Inactive = (
  stableLock.brainlink_candidate_release === 'v2.2' &&
  stableLock.brainlink_candidate_status === 'NOT_PROMOTED'
) || (
  stableLock.brainlink_candidate_release === 'v2.3-zip-authority' &&
  stableLock.brainlink_candidate_status === 'NOT_PROMOTED' &&
  stableLock.brainlink_superseded_candidate === 'v2.2'
);
const stableCandidateHashesMatchAuthority = stableLock.brainlink_candidate_release !== 'v2.3-zip-authority' || (
  stableLock.brainlink_candidate_runtime_overlay_sha256 === zipLock.candidate_runtime_overlay_sha256 &&
  stableLock.brainlink_candidate_runtime_manifest_sha256 === zipLock.candidate_runtime_manifest_sha256
);

check('Stable runtime remains v2.1', stableLock.brainlink_runtime_release === 'v2.1');
check('v2.2 is inactive or superseded by an unpromoted v2.3 candidate', v22Inactive);
check('ZIP authority keeps stable runtime at v2.1', zipLock.stable_runtime === 'v2.1');
check('ZIP-authoritative v2.3 remains NOT_PROMOTED', zipLock.candidate_runtime === 'v2.3-zip-authority' && zipLock.candidate_status === 'NOT_PROMOTED');
check('AFFiNE lock candidate hashes match ZIP authority lock', stableCandidateHashesMatchAuthority);
check('Stable setup still uses only v2.1 materializer', stableSetup.includes('scripts\\materialize-brainlink.ps1') && !stableSetup.includes('v22') && !stableSetup.includes('ZIP_CANDIDATE'));
check('Stable materializers do not reference candidate overlays', !stablePs.includes('.brainlink-v22-overrides') && !stablePs.includes('.brainlink-zip-candidate-v23') && !stableSh.includes('.brainlink-v22-overrides') && !stableSh.includes('.brainlink-zip-candidate-v23'));
check('v2.2 remains a separate candidate entrypoint', v22Setup.includes('materialize-brainlink-v22.ps1'));
check('ZIP-authoritative v2.3 remains a separate candidate entrypoint', v23Setup.includes('materialize-brainlink-zip-candidate.ps1'));
check('Windows v2.2 uses transport-safe migrator', v22ps.includes('apply-execution-v22-safe.mjs'));
check('Unix v2.2 uses transport-safe migrator', v22sh.includes('apply-execution-v22-safe.mjs'));
check('Windows v2.3 uses compact runtime transport and independent auditor', v23ps.includes('.brainlink-zip-candidate-v23-runtime') && v23ps.includes('BRAINLINK_ZIP_CANDIDATE_V23_RUNTIME.sha256') && v23ps.includes('brainlink-audit-v23-transport.mjs'));
check('Unix v2.3 uses compact runtime transport and independent auditor', v23sh.includes('.brainlink-zip-candidate-v23-runtime') && v23sh.includes('BRAINLINK_ZIP_CANDIDATE_V23_RUNTIME.sha256') && v23sh.includes('brainlink-audit-v23-transport.mjs'));
check('Stable overlay excludes v2.2 execution source/tests', !exists(stableExecution) && !exists(stableExecutionTest));
check('Candidate overlay owns v2.2 execution source/tests', exists(candidateExecution) && exists(candidateExecutionTest));
check('Stable runtime manifest excludes v2.2 execution files', !stableManifestText.includes('execution.ts') && !stableManifestText.includes('execution.spec.ts'));
check('ZIP compact runtime transport parts exist', zipPartNames.length > 0, `found ${zipPartNames.length}`);
check('ZIP compact runtime archive SHA-256 is independently pinned', isSha256(zipLock.candidate_runtime_overlay_sha256));
check('ZIP compact runtime manifest SHA-256 is independently pinned', isSha256(zipLock.candidate_runtime_manifest_sha256));
check('ZIP compact runtime archive matches authority lock', !zipOverlayDecodeError && zipRuntimeArchiveHash === zipLock.candidate_runtime_overlay_sha256, zipOverlayDecodeError || zipRuntimeArchiveHash);
check('ZIP compact runtime manifest matches authority lock', sha256(Buffer.from(zipRuntimeManifestText, 'utf8')) === zipLock.candidate_runtime_manifest_sha256);
check('Full documentation corpus remains separate from runtime overlay', zipLock.documentation_corpus_scope === 'REPOSITORY_LEVEL_SEPARATE_FROM_RUNTIME_OVERLAY');
check('Authoritative source ZIP hash is preserved inside full manifest', zipCorpusHash === zipLock.authority_source_sha256, zipCorpusHash);
check('ZIP compact runtime manifest contains validators and behavior tests', zipRuntimeManifestText.includes('scripts/brainlink-validate-v23.mjs') && zipRuntimeManifestText.includes('packages/frontend/core/src/brainlink/__tests__/canon.spec.ts') && zipRuntimeManifestText.includes('packages/frontend/core/src/brainlink/__tests__/pretask.spec.ts') && zipRuntimeManifestText.includes('packages/frontend/core/src/brainlink/__tests__/execution.spec.ts'));
check('V5 is explicitly context-only', context.includes('authority=CONTEXT_COMPLEMENT_ONLY'));
check('V5 cannot auto-promote runtime', context.includes('auto_promote_runtime=false'));
check('V5 cannot replace product boundaries', context.includes('preserve_product_boundaries=true'));
check('V5 source provenance is pinned', /source_sha256=[0-9a-f]{64}/.test(context));

console.log(`\n${checks.length - failures.length}/${checks.length} non-breakage checks passed.`);
if (failures.length) process.exit(1);
