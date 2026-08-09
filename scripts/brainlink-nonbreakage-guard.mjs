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

const failures = [];
const checks = [];
const check = (name, condition, detail = '') => {
  const ok = Boolean(condition);
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
};

const stableLockText = read('AFFINE_UPSTREAM.lock');
const stableLock = parseLock(stableLockText);
const zipLockText = read('BRAINLINK_ZIP_AUTHORITY.lock');
const zipLock = parseLock(zipLockText);
const stableManifestText = read('BRAINLINK_RUNTIME_V2.sha256');
const zipManifestText = read('BRAINLINK_ZIP_CANDIDATE_V23.sha256');
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
const zipPartsDir = '.brainlink-zip-candidate-v23';
const zipPartNames = exists(zipPartsDir)
  ? fs.readdirSync(absolute(zipPartsDir)).filter(name => /^runtime\.part.*\.b64$/.test(name)).sort()
  : [];
let zipOverlayHash = '';
let zipOverlayDecodeError = '';
try {
  const encoded = zipPartNames.map(name => read(path.posix.join(zipPartsDir, name))).join('').replace(/\s+/g, '');
  zipOverlayHash = encoded ? sha256(Buffer.from(encoded, 'base64')) : '';
} catch (error) {
  zipOverlayDecodeError = error instanceof Error ? error.message : String(error);
}
const zipCorpusLine = zipManifestText
  .split(/\r?\n/)
  .find(line => line.endsWith('  docs/corpus/v1.0.0/Brainlink_Documentacao_Completa_v1.0.0.zip'));
const zipCorpusHash = zipCorpusLine?.split(/\s{2}/, 1)[0] ?? '';

check('Stable runtime remains v2.1', stableLock.brainlink_runtime_release === 'v2.1');
check('v2.2 metadata remains NOT_PROMOTED', stableLock.brainlink_candidate_release === 'v2.2' && stableLock.brainlink_candidate_status === 'NOT_PROMOTED');
check('ZIP authority keeps stable runtime at v2.1', zipLock.stable_runtime === 'v2.1');
check('ZIP-authoritative v2.3 remains NOT_PROMOTED', zipLock.candidate_runtime === 'v2.3-zip-authority' && zipLock.candidate_status === 'NOT_PROMOTED');
check('Stable setup still uses only v2.1 materializer', stableSetup.includes('scripts\\materialize-brainlink.ps1') && !stableSetup.includes('v22') && !stableSetup.includes('ZIP_CANDIDATE'));
check('Stable materializers do not reference candidate overlays', !stablePs.includes('.brainlink-v22-overrides') && !stablePs.includes('.brainlink-zip-candidate-v23') && !stableSh.includes('.brainlink-v22-overrides') && !stableSh.includes('.brainlink-zip-candidate-v23'));
check('v2.2 remains a separate candidate entrypoint', v22Setup.includes('materialize-brainlink-v22.ps1'));
check('ZIP-authoritative v2.3 remains a separate candidate entrypoint', v23Setup.includes('materialize-brainlink-zip-candidate.ps1'));
check('Windows v2.2 uses transport-safe migrator', v22ps.includes('apply-execution-v22-safe.mjs'));
check('Unix v2.2 uses transport-safe migrator', v22sh.includes('apply-execution-v22-safe.mjs'));
check('Windows v2.3 rebuilds stable baseline before overlay', v23ps.includes("$Stable") && v23ps.includes("& $Stable") && v23ps.includes('Candidate overlay checksum mismatch'));
check('Unix v2.3 rebuilds stable baseline before overlay', v23sh.includes('materialize-brainlink.sh') && v23sh.includes('ARCHIVE_SHA=') && v23sh.includes('MANIFEST_SHA='));
check('Stable overlay excludes v2.2 execution source/tests', !exists(stableExecution) && !exists(stableExecutionTest));
check('Candidate overlay owns v2.2 execution source/tests', exists(candidateExecution) && exists(candidateExecutionTest));
check('Stable runtime manifest excludes v2.2 execution files', !stableManifestText.includes('execution.ts') && !stableManifestText.includes('execution.spec.ts'));
check('ZIP candidate transport parts exist', zipPartNames.length > 0, `found ${zipPartNames.length}`);
check('ZIP candidate overlay SHA-256 matches authority lock', !zipOverlayDecodeError && zipOverlayHash === zipLock.candidate_overlay_sha256, zipOverlayDecodeError || zipOverlayHash);
check('ZIP candidate final manifest SHA-256 matches authority lock', sha256(Buffer.from(zipManifestText, 'utf8')) === zipLock.candidate_final_manifest_sha256);
check('Authoritative source ZIP hash is preserved inside candidate manifest', zipCorpusHash === zipLock.authority_source_sha256, zipCorpusHash);
check('ZIP candidate manifest contains runtime validators and tests', zipManifestText.includes('scripts/brainlink-validate-v23.mjs') && zipManifestText.includes('packages/frontend/core/src/brainlink/__tests__/canon.spec.ts') && zipManifestText.includes('packages/frontend/core/src/brainlink/__tests__/pretask.spec.ts'));
check('V5 is explicitly context-only', context.includes('authority=CONTEXT_COMPLEMENT_ONLY'));
check('V5 cannot auto-promote runtime', context.includes('auto_promote_runtime=false'));
check('V5 cannot replace product boundaries', context.includes('preserve_product_boundaries=true'));
check('V5 source provenance is pinned', /source_sha256=[0-9a-f]{64}/.test(context));

console.log(`\n${checks.length - failures.length}/${checks.length} non-breakage checks passed.`);
if (failures.length) process.exit(1);
