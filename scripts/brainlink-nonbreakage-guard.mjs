import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const absolute = file => path.join(root, ...file.split('/'));
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
const mainBat = read('BRAINLINK.bat');
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
const oneClick = read('scripts/brainlink-one-click.mjs');
const materializer = read('scripts/brainlink-materialize.mjs');

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
  if (!encoded || encoded.length % 4 === 1 || /[^A-Za-z0-9+/=]/.test(encoded)) {
    throw new Error('invalid base64 transport');
  }
  const decoded = Buffer.from(encoded, 'base64');
  if (decoded.length < 4 || decoded[0] !== 0x1f || decoded[1] !== 0x8b) {
    throw new Error('decoded transport lacks gzip magic');
  }
  zipRuntimeArchiveHash = sha256(decoded);
} catch (error) {
  zipOverlayDecodeError = error instanceof Error ? error.message : String(error);
}

const zipCorpusLine = zipFullManifestText
  .split(/\r?\n/)
  .find(line => line.endsWith('  docs/corpus/v1.0.0/Brainlink_Documentacao_Completa_v1.0.0.zip'));
const zipCorpusHash = zipCorpusLine?.split(/\s{2}/, 1)[0] ?? '';
const zipBlocked = zipLock.candidate_status === 'BLOCKED_CORRUPT_TRANSPORT';
const zipRunnable = zipLock.candidate_status === 'NOT_PROMOTED';
const expectedArchive = zipLock.candidate_runtime_overlay_sha256;
const observedArchive = zipLock.candidate_runtime_observed_sha256;

check('Stable runtime remains v2.1', stableLock.brainlink_runtime_release === 'v2.1');
check('Legacy v2.2 metadata remains NOT_PROMOTED', stableLock.brainlink_candidate_release === 'v2.2' && stableLock.brainlink_candidate_status === 'NOT_PROMOTED');
check('ZIP authority keeps stable runtime at v2.1', zipLock.stable_runtime === 'v2.1');
check('ZIP candidate state is explicit', zipRunnable || zipBlocked, zipLock.candidate_status);
check('Blocked ZIP candidate cannot be promoted', !zipBlocked || zipLock.candidate_promotion_allowed === 'false');
check('Stable one-click BAT uses verified bootstrap', mainBat.includes('scripts\\brainlink-bootstrap.ps1') && !mainBat.includes('ZIP_CANDIDATE') && !mainBat.includes('V22'));
check('Legacy stable setup delegates only to one-click stable path', stableSetup.includes('BRAINLINK.bat') && !stableSetup.includes('ZIP_CANDIDATE') && !stableSetup.includes('V22'));
check('Stable materializers do not reference candidate overlays', !stablePs.includes('.brainlink-v22-overrides') && !stablePs.includes('.brainlink-zip-candidate-v23') && !stableSh.includes('.brainlink-v22-overrides') && !stableSh.includes('.brainlink-zip-candidate-v23'));
check('Stable one-click orchestrator does not inject candidate overlays', !oneClick.includes('.brainlink-v22-overrides') && !oneClick.includes('.brainlink-zip-candidate-v23'));
check('Stable core materializer does not inject candidate overlays', !materializer.includes('.brainlink-v22-overrides') && !materializer.includes('.brainlink-zip-candidate-v23'));
check('v2.2 remains a separate candidate entrypoint', v22Setup.includes('materialize-brainlink-v22.ps1'));
check('ZIP-authoritative v2.3 remains a separate candidate entrypoint', v23Setup.includes('materialize-brainlink-zip-candidate.ps1'));
check('Windows v2.2 uses transport-safe migrator', v22ps.includes('apply-execution-v22-safe.mjs'));
check('Unix v2.2 uses transport-safe migrator', v22sh.includes('apply-execution-v22-safe.mjs'));
check('Windows v2.3 is fail-closed behind independent audit', v23ps.includes('brainlink-audit-v23-transport.mjs') && v23ps.includes('--require-pinned'));
check('Unix v2.3 is fail-closed behind independent audit', v23sh.includes('brainlink-audit-v23-transport.mjs') && v23sh.includes('--require-pinned'));
check('Stable overlay excludes v2.2 execution source/tests', !exists(stableExecution) && !exists(stableExecutionTest));
check('Candidate overlay owns v2.2 execution source/tests', exists(candidateExecution) && exists(candidateExecutionTest));
check('Stable runtime manifest excludes candidate execution files', !stableManifestText.includes('execution.ts') && !stableManifestText.includes('execution.spec.ts'));
check('ZIP compact runtime transport parts exist', zipPartNames.length === Number(zipLock.candidate_transport_fragments), `found ${zipPartNames.length}`);
check('ZIP expected runtime archive SHA-256 is pinned', isSha256(expectedArchive));
check('ZIP observed runtime archive SHA-256 is pinned when blocked', !zipBlocked || isSha256(observedArchive));
check('ZIP transport observation matches repository bytes', !zipOverlayDecodeError && zipRuntimeArchiveHash === (zipBlocked ? observedArchive : expectedArchive), zipOverlayDecodeError || zipRuntimeArchiveHash);
check('Blocked ZIP transport differs from intended release archive', !zipBlocked || observedArchive !== expectedArchive);
check('Blocked ZIP transport records concrete integrity failure', !zipBlocked || zipLock.candidate_runtime_integrity === 'FAILED_GZIP_CRC_AND_LENGTH');
check('Runnable ZIP transport must equal intended release archive', !zipRunnable || zipRuntimeArchiveHash === expectedArchive);
check('ZIP compact runtime manifest SHA-256 is pinned', isSha256(zipLock.candidate_runtime_manifest_sha256));
check('ZIP compact runtime manifest matches authority lock', sha256(Buffer.from(zipRuntimeManifestText, 'utf8')) === zipLock.candidate_runtime_manifest_sha256);
check('ZIP full corpus/final manifest SHA-256 is pinned', isSha256(zipLock.candidate_final_manifest_sha256));
check('ZIP full corpus/final manifest matches authority lock', sha256(Buffer.from(zipFullManifestText, 'utf8')) === zipLock.candidate_final_manifest_sha256);
check('Authoritative source ZIP hash is preserved inside full manifest', zipCorpusHash === zipLock.authority_source_sha256, zipCorpusHash);
check('ZIP compact runtime manifest contains validators and behavior tests', zipRuntimeManifestText.includes('scripts/brainlink-validate-v23.mjs') && zipRuntimeManifestText.includes('packages/frontend/core/src/brainlink/__tests__/canon.spec.ts') && zipRuntimeManifestText.includes('packages/frontend/core/src/brainlink/__tests__/pretask.spec.ts') && zipRuntimeManifestText.includes('packages/frontend/core/src/brainlink/__tests__/execution.spec.ts'));
check('V5 is explicitly context-only', context.includes('authority=CONTEXT_COMPLEMENT_ONLY'));
check('V5 cannot auto-promote runtime', context.includes('auto_promote_runtime=false'));
check('V5 cannot replace product boundaries', context.includes('preserve_product_boundaries=true'));
check('V5 source provenance is pinned', /source_sha256=[0-9a-f]{64}/.test(context));

console.log(`\n${checks.length - failures.length}/${checks.length} non-breakage checks passed.`);
if (failures.length) process.exit(1);
