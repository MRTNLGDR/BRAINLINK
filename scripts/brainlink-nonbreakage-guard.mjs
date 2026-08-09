import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const absolute = file => path.join(root, file);
const read = file => fs.readFileSync(absolute(file), 'utf8');
const exists = file => fs.existsSync(absolute(file));
const hashBuffer = value => crypto.createHash('sha256').update(value).digest('hex');
const hashFile = file => hashBuffer(fs.readFileSync(absolute(file)));
const parseLock = content => Object.fromEntries(
  content.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const separator = line.indexOf('=');
    return separator < 0 ? [line, ''] : [line.slice(0, separator), line.slice(separator + 1)];
  })
);
const parseManifest = content => new Map(
  content.split(/\r?\n/).filter(Boolean).map((line, index) => {
    const match = line.match(/^([0-9a-f]{64})\s{2}(.+)$/);
    if (!match) throw new Error(`Invalid manifest line ${index + 1}: ${line}`);
    return [match[2].replace(/\\/g, '/'), match[1]];
  })
);
const isSha256 = value => /^[0-9a-f]{64}$/.test(value ?? '');
const transportPartPattern = /^runtime\.part(\d+)([a-z]*)\.b64$/;
const sortTransportParts = names => names.sort((left, right) => {
  const a = left.match(transportPartPattern);
  const b = right.match(transportPartPattern);
  return Number(a?.[1]) - Number(b?.[1]) || String(a?.[2]).localeCompare(String(b?.[2]));
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
const context = read('BRAINLINK_CONTEXT_V5.lock');
const stableManifestText = read('BRAINLINK_RUNTIME_V2.sha256');
const transportManifestText = read('BRAINLINK_ZIP_CANDIDATE_V23_RUNTIME.sha256');
const finalManifestText = read('BRAINLINK_ZIP_CANDIDATE_V23_FINAL.sha256');
const fullCorpusManifestText = read('BRAINLINK_ZIP_CANDIDATE_V23.sha256');
const stableManifest = parseManifest(stableManifestText);
const transportManifest = parseManifest(transportManifestText);
const finalManifest = parseManifest(finalManifestText);
const stablePackagePath = '.brainlink-runtime-overrides/package.json';
const finalPackagePath = '.brainlink-v23-final-overrides/package.json';
const stablePackageText = read(stablePackagePath);
const finalPackageText = read(finalPackagePath);
const stablePackage = JSON.parse(stablePackageText);
const finalPackage = JSON.parse(finalPackageText);
const stablePackageHash = hashFile(stablePackagePath);
const finalPackageHash = hashFile(finalPackagePath);
const stableSetup = read('BRAINLINK_SETUP.bat');
const v22Setup = read('BRAINLINK_SETUP_V22.bat');
const v23Setup = read('BRAINLINK_SETUP_ZIP_CANDIDATE.bat');
const stablePs = read('scripts/materialize-brainlink.ps1');
const stableSh = read('scripts/materialize-brainlink.sh');
const v22ps = read('scripts/materialize-brainlink-v22.ps1');
const v22sh = read('scripts/materialize-brainlink-v22.sh');
const v22Shim = read('scripts/apply-execution-v22-safe.mjs');
const v23ps = read('scripts/materialize-brainlink-zip-candidate.ps1');
const v23sh = read('scripts/materialize-brainlink-zip-candidate.sh');

const stableExecution = '.brainlink-runtime-overrides/packages/frontend/core/src/brainlink/execution.ts';
const stableExecutionTest = '.brainlink-runtime-overrides/packages/frontend/core/src/brainlink/__tests__/execution.spec.ts';
const candidateExecution = '.brainlink-v22-overrides/packages/frontend/core/src/brainlink/execution.ts';
const candidateExecutionTest = '.brainlink-v22-overrides/packages/frontend/core/src/brainlink/__tests__/execution.spec.ts';
const transportDir = '.brainlink-zip-candidate-v23-runtime';
const transportParts = exists(transportDir)
  ? sortTransportParts(fs.readdirSync(absolute(transportDir)).filter(name => transportPartPattern.test(name)))
  : [];
let transportArchiveHash = '';
let transportArchiveError = '';
try {
  const encoded = transportParts.map(name => read(path.posix.join(transportDir, name))).join('').replace(/\s+/g, '');
  const archive = encoded ? Buffer.from(encoded, 'base64') : Buffer.alloc(0);
  if (!archive.length || archive[0] !== 0x1f || archive[1] !== 0x8b) throw new Error('decoded transport lacks gzip magic');
  transportArchiveHash = hashBuffer(archive);
} catch (error) {
  transportArchiveError = error instanceof Error ? error.message : String(error);
}
const corpusLine = fullCorpusManifestText.split(/\r?\n/).find(line =>
  line.endsWith('  docs/corpus/v1.0.0/Brainlink_Documentacao_Completa_v1.0.0.zip')
);
const corpusHash = corpusLine?.split(/\s{2}/, 1)[0] ?? '';
const dependencyGraphEqual = JSON.stringify({
  workspaces: stablePackage.workspaces,
  engines: stablePackage.engines,
  devDependencies: stablePackage.devDependencies,
  resolutions: stablePackage.resolutions,
  packageManager: stablePackage.packageManager,
}) === JSON.stringify({
  workspaces: finalPackage.workspaces,
  engines: finalPackage.engines,
  devDependencies: finalPackage.devDependencies,
  resolutions: finalPackage.resolutions,
  packageManager: finalPackage.packageManager,
});
const stablePinsExact =
  stablePackage.devDependencies?.['@capacitor/cli'] === '^7.6.5' &&
  stablePackage.devDependencies?.vitest === '^4.1.8' &&
  stablePackage.devDependencies?.oxlint === '1.68.0' &&
  stablePackage.resolutions?.['@opentelemetry/core'] === '^2.8.0' &&
  stablePackage.resolutions?.['@opentelemetry/resources'] === '^2.8.0' &&
  stablePackage.resolutions?.['@opentelemetry/sdk-trace-base'] === '^2.8.0' &&
  stablePackage.resolutions?.['@tootallnate/once'] === '^2.0.1' &&
  stablePackage.resolutions?.['js-yaml@npm:^4.1.0'] === '^4.2.0' &&
  stablePackage.resolutions?.tar === '^7.5.16';

check('Stable runtime remains v2.1', stableLock.brainlink_runtime_release === 'v2.1');
check('v2.2 is explicitly superseded and not promoted', stableLock.brainlink_superseded_candidate === 'v2.2' && stableLock.brainlink_candidate_status === 'NOT_PROMOTED');
check('ZIP-authoritative v2.3 remains NOT_PROMOTED', zipLock.candidate_runtime === 'v2.3-zip-authority' && zipLock.candidate_status === 'NOT_PROMOTED');
check('Stable manifest hash matches AFFiNE lock', hashBuffer(Buffer.from(stableManifestText, 'utf8')) === stableLock.brainlink_runtime_v21_manifest_sha256);
check('Stable package hash matches stable manifest', stablePackageHash === stableManifest.get('package.json'), stablePackageHash);
check('Stable package preserves pinned AFFiNE dependency versions', stablePinsExact);
check('Stable package adds all Brainlink commands', Boolean(stablePackage.scripts?.['brainlink:validate'] && stablePackage.scripts?.['brainlink:test'] && stablePackage.scripts?.['brainlink:check'] && stablePackage.scripts?.['brainlink:dev'] && stablePackage.scripts?.['brainlink:build']));
check('Stable materializers pin corrected stable manifest', stableSh.includes(stableLock.brainlink_runtime_v21_manifest_sha256) && stablePs.includes(stableLock.brainlink_runtime_v21_manifest_sha256));
check('Stable setup still uses only stable materializer', stableSetup.includes('scripts\\materialize-brainlink.ps1') && !stableSetup.includes('v22') && !stableSetup.includes('ZIP_CANDIDATE'));
check('Stable materializers do not reference candidate overlays', !stablePs.includes('.brainlink-v22-overrides') && !stablePs.includes('.brainlink-zip-candidate-v23') && !stableSh.includes('.brainlink-v22-overrides') && !stableSh.includes('.brainlink-zip-candidate-v23'));
check('Stable overlay excludes v2.2 execution source/tests', !exists(stableExecution) && !exists(stableExecutionTest));
check('v2.2 candidate overlay owns execution source/tests', exists(candidateExecution) && exists(candidateExecutionTest));
check('Stable manifest excludes v2.2 execution files', !stableManifest.has('packages/frontend/core/src/brainlink/execution.ts') && !stableManifest.has('packages/frontend/core/src/brainlink/__tests__/execution.spec.ts'));
check('v2.2 remains a separate entrypoint', v22Setup.includes('materialize-brainlink-v22.ps1'));
check('v2.2 materializers use safe shim', v22ps.includes('apply-execution-v22-safe.mjs') && v22sh.includes('apply-execution-v22-safe.mjs'));
check('v2.2 shim preserves nested field/worker/task templates', v22Shim.includes("globalThis.field = '${field}'") && v22Shim.includes("name: '${worker.name}'") && v22Shim.includes("title: '${task.title}'"));
check('v2.3 remains a separate entrypoint', v23Setup.includes('materialize-brainlink-zip-candidate.ps1'));
check('v2.3 assembly policy is pinned', zipLock.candidate_assembly === 'VERIFIED_TRANSPORT_PLUS_LOCK_COMPATIBLE_FINAL_OVERRIDE');
check('Transport fragments exist', transportParts.length === Number(zipLock.candidate_transport_fragments), `found ${transportParts.length}`);
check('Transport archive hash is valid and pinned', isSha256(zipLock.candidate_runtime_overlay_sha256) && !transportArchiveError && transportArchiveHash === zipLock.candidate_runtime_overlay_sha256, transportArchiveError || transportArchiveHash);
check('Transport manifest hash is valid and pinned', isSha256(zipLock.candidate_runtime_manifest_sha256) && hashBuffer(Buffer.from(transportManifestText, 'utf8')) === zipLock.candidate_runtime_manifest_sha256);
check('Transport manifest file count is pinned', transportManifest.size === Number(zipLock.candidate_runtime_manifest_files));
check('Final package hash is independently pinned', isSha256(zipLock.candidate_final_package_sha256) && finalPackageHash === zipLock.candidate_final_package_sha256, finalPackageHash);
check('Final manifest hash is independently pinned', isSha256(zipLock.candidate_final_runtime_manifest_sha256) && hashBuffer(Buffer.from(finalManifestText, 'utf8')) === zipLock.candidate_final_runtime_manifest_sha256);
check('Final manifest file count is pinned', finalManifest.size === Number(zipLock.candidate_final_runtime_manifest_files));
check('Final package hash matches final manifest', finalPackageHash === finalManifest.get('package.json'));
check('Candidate and stable dependency graphs are identical', dependencyGraphEqual);
check('Candidate validate command includes stable and v2.3 validators', finalPackage.scripts?.['brainlink:validate'] === 'node scripts/brainlink-validate.mjs && node scripts/brainlink-validate-v23.mjs');
check('AFFiNE lock candidate transport hashes match ZIP authority', stableLock.brainlink_candidate_runtime_overlay_sha256 === zipLock.candidate_runtime_overlay_sha256 && stableLock.brainlink_candidate_runtime_manifest_sha256 === zipLock.candidate_runtime_manifest_sha256);
check('AFFiNE lock final candidate hashes match ZIP authority', stableLock.brainlink_candidate_final_package_sha256 === zipLock.candidate_final_package_sha256 && stableLock.brainlink_candidate_final_manifest_sha256 === zipLock.candidate_final_runtime_manifest_sha256);
check('v2.3 materializers apply and verify final override', v23ShHasFinal(v23sh) && v23PsHasFinal(v23ps));
check('Documentation corpus stays separate from runtime', zipLock.documentation_corpus_scope === 'REPOSITORY_LEVEL_SEPARATE_FROM_RUNTIME_OVERLAY');
check('Authority ZIP hash is preserved in corpus manifest', corpusHash === zipLock.authority_source_sha256, corpusHash);
check('Transport manifest contains validators and behavior tests', transportManifest.has('scripts/brainlink-validate-v23.mjs') && transportManifest.has('packages/frontend/core/src/brainlink/__tests__/canon.spec.ts') && transportManifest.has('packages/frontend/core/src/brainlink/__tests__/pretask.spec.ts') && transportManifest.has('packages/frontend/core/src/brainlink/__tests__/execution.spec.ts'));
check('V5 is explicitly context-only', context.includes('authority=CONTEXT_COMPLEMENT_ONLY'));
check('V5 cannot auto-promote runtime', context.includes('auto_promote_runtime=false'));
check('V5 cannot replace product boundaries', context.includes('preserve_product_boundaries=true'));
check('V5 source provenance is pinned', /source_sha256=[0-9a-f]{64}/.test(context));

console.log(`\n${checks.length - failures.length}/${checks.length} non-breakage checks passed.`);
if (failures.length) process.exit(1);

function v23ShHasFinal(source) {
  return source.includes('.brainlink-v23-final-overrides') &&
    source.includes('BRAINLINK_ZIP_CANDIDATE_V23_FINAL.sha256') &&
    source.includes('candidate_final_runtime_manifest_sha256') &&
    source.includes('candidate_final_package_sha256') &&
    source.includes('sha256sum -c "$FINAL_MANIFEST"');
}

function v23PsHasFinal(source) {
  return source.includes('.brainlink-v23-final-overrides') &&
    source.includes('BRAINLINK_ZIP_CANDIDATE_V23_FINAL.sha256') &&
    source.includes("candidate_final_runtime_manifest_sha256") &&
    source.includes("candidate_final_package_sha256") &&
    source.includes('Get-Content $FinalManifest');
}
