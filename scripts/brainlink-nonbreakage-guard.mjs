import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const file = relative => path.join(root, relative);
const exists = relative => fs.existsSync(file(relative));
const read = relative => fs.readFileSync(file(relative), 'utf8');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const hashFile = relative => sha256(fs.readFileSync(file(relative)));
const isSha256 = value => /^[0-9a-f]{64}$/.test(value ?? '');
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
const fullManifestText = read('BRAINLINK_ZIP_CANDIDATE_V23.sha256');
const stableManifest = parseManifest(stableManifestText);
const transportManifest = parseManifest(transportManifestText);
const finalManifest = parseManifest(finalManifestText);
const stablePackagePath = '.brainlink-runtime-overrides/package.json';
const finalPackagePath = '.brainlink-v23-final-overrides/package.json';
const stablePackage = JSON.parse(read(stablePackagePath));
const finalPackage = JSON.parse(read(finalPackagePath));
const stablePackageHash = hashFile(stablePackagePath);
const finalPackageHash = hashFile(finalPackagePath);
const stableSetup = read('BRAINLINK_SETUP.bat');
const v22Setup = read('BRAINLINK_SETUP_V22.bat');
const v23Setup = read('BRAINLINK_SETUP_ZIP_CANDIDATE.bat');
const stablePs = read('scripts/materialize-brainlink.ps1');
const stableSh = read('scripts/materialize-brainlink.sh');
const v22Ps = read('scripts/materialize-brainlink-v22.ps1');
const v22Sh = read('scripts/materialize-brainlink-v22.sh');
const v22Shim = read('scripts/apply-execution-v22-safe.mjs');
const v23Ps = read('scripts/materialize-brainlink-zip-candidate.ps1');
const v23Sh = read('scripts/materialize-brainlink-zip-candidate.sh');

const transportDir = '.brainlink-zip-candidate-v23-runtime';
const partPattern = /^runtime\.part(\d+)([a-z]*)\.b64$/;
const parts = fs.readdirSync(file(transportDir)).filter(name => partPattern.test(name)).sort((a, b) => {
  const left = a.match(partPattern);
  const right = b.match(partPattern);
  return Number(left?.[1]) - Number(right?.[1]) || String(left?.[2]).localeCompare(String(right?.[2]));
});
let archiveHash = '';
let archiveError = '';
try {
  const encoded = parts.map(name => read(path.posix.join(transportDir, name))).join('').replace(/\s+/g, '');
  const archive = Buffer.from(encoded, 'base64');
  if (!archive.length || archive[0] !== 0x1f || archive[1] !== 0x8b) throw new Error('gzip magic missing');
  archiveHash = sha256(archive);
} catch (error) {
  archiveError = error instanceof Error ? error.message : String(error);
}
const corpusLine = fullManifestText.split(/\r?\n/).find(line =>
  line.endsWith('  docs/corpus/v1.0.0/Brainlink_Documentacao_Completa_v1.0.0.zip')
);
const corpusHash = corpusLine?.split(/\s{2}/, 1)[0] ?? '';
const dependencyShape = pkg => ({
  workspaces: pkg.workspaces,
  engines: pkg.engines,
  devDependencies: pkg.devDependencies,
  resolutions: pkg.resolutions,
  packageManager: pkg.packageManager,
});
const stablePinsExact =
  stablePackage.devDependencies?.['@capacitor/cli'] === '^7.6.5' &&
  stablePackage.devDependencies?.vitest === '^4.1.8' &&
  stablePackage.devDependencies?.oxlint === '1.68.0' &&
  stablePackage.resolutions?.['@opentelemetry/core'] === '^2.8.0' &&
  stablePackage.resolutions?.['@tootallnate/once'] === '^2.0.1' &&
  stablePackage.resolutions?.['js-yaml@npm:^4.1.0'] === '^4.2.0' &&
  stablePackage.resolutions?.tar === '^7.5.16';

check('Stable runtime remains v2.1', stableLock.brainlink_runtime_release === 'v2.1');
check('v2.2 is superseded and not promoted', stableLock.brainlink_superseded_candidate === 'v2.2' && stableLock.brainlink_candidate_status === 'NOT_PROMOTED');
check('v2.3 remains NOT_PROMOTED', zipLock.candidate_runtime === 'v2.3-zip-authority' && zipLock.candidate_status === 'NOT_PROMOTED');
check('Stable manifest hash is pinned', sha256(Buffer.from(stableManifestText)) === stableLock.brainlink_runtime_v21_manifest_sha256);
check('Stable package hash matches stable manifest', stablePackageHash === stableManifest.get('package.json'), stablePackageHash);
check('Stable package keeps exact AFFiNE dependency pins', stablePinsExact);
check('Stable Brainlink scripts exist', Boolean(stablePackage.scripts?.['brainlink:validate'] && stablePackage.scripts?.['brainlink:test'] && stablePackage.scripts?.['brainlink:check'] && stablePackage.scripts?.['brainlink:dev'] && stablePackage.scripts?.['brainlink:build']));
check('Stable materializers pin stable manifest', stablePs.includes(stableLock.brainlink_runtime_v21_manifest_sha256) && stableSh.includes(stableLock.brainlink_runtime_v21_manifest_sha256));
check('Stable setup invokes only stable materializer', stableSetup.includes('scripts\\materialize-brainlink.ps1') && !stableSetup.includes('v22') && !stableSetup.includes('ZIP_CANDIDATE'));
check('Stable materializers exclude candidate overlays', !stablePs.includes('.brainlink-v22-overrides') && !stablePs.includes('.brainlink-zip-candidate-v23') && !stableSh.includes('.brainlink-v22-overrides') && !stableSh.includes('.brainlink-zip-candidate-v23'));
check('Stable overlay excludes v2.2 execution files', !exists('.brainlink-runtime-overrides/packages/frontend/core/src/brainlink/execution.ts') && !exists('.brainlink-runtime-overrides/packages/frontend/core/src/brainlink/__tests__/execution.spec.ts'));
check('v2.2 overlay owns execution files', exists('.brainlink-v22-overrides/packages/frontend/core/src/brainlink/execution.ts') && exists('.brainlink-v22-overrides/packages/frontend/core/src/brainlink/__tests__/execution.spec.ts'));
check('v2.2 remains separate', v22Setup.includes('materialize-brainlink-v22.ps1'));
check('v2.2 materializers use safe shim', v22Ps.includes('apply-execution-v22-safe.mjs') && v22Sh.includes('apply-execution-v22-safe.mjs'));
check('v2.2 shim preserves nested templates', v22Shim.includes("globalThis.field = '${field}'") && v22Shim.includes("name: '${worker.name}'") && v22Shim.includes("title: '${task.title}'"));
check('v2.3 remains separate', v23Setup.includes('materialize-brainlink-zip-candidate.ps1'));
check('v2.3 assembly policy is explicit', zipLock.candidate_assembly === 'VERIFIED_TRANSPORT_PLUS_LOCK_COMPATIBLE_FINAL_OVERRIDE');
check('Transport fragment count is pinned', parts.length === Number(zipLock.candidate_transport_fragments), `found ${parts.length}`);
check('Transport archive hash matches lock', !archiveError && archiveHash === zipLock.candidate_runtime_overlay_sha256, archiveError || archiveHash);
check('Transport manifest hash matches lock', sha256(Buffer.from(transportManifestText)) === zipLock.candidate_runtime_manifest_sha256);
check('Transport manifest count matches lock', transportManifest.size === Number(zipLock.candidate_runtime_manifest_files));
check('Final package hash matches lock', isSha256(zipLock.candidate_final_package_sha256) && finalPackageHash === zipLock.candidate_final_package_sha256, finalPackageHash);
check('Final manifest hash matches lock', isSha256(zipLock.candidate_final_runtime_manifest_sha256) && sha256(Buffer.from(finalManifestText)) === zipLock.candidate_final_runtime_manifest_sha256);
check('Final manifest count matches lock', finalManifest.size === Number(zipLock.candidate_final_runtime_manifest_files));
check('Final package hash matches final manifest', finalPackageHash === finalManifest.get('package.json'));
check('Stable and candidate dependency graphs are identical', JSON.stringify(dependencyShape(stablePackage)) === JSON.stringify(dependencyShape(finalPackage)));
check('Candidate runs both validators', finalPackage.scripts?.['brainlink:validate'] === 'node scripts/brainlink-validate.mjs && node scripts/brainlink-validate-v23.mjs');
check('Locks agree on transport hashes', stableLock.brainlink_candidate_runtime_overlay_sha256 === zipLock.candidate_runtime_overlay_sha256 && stableLock.brainlink_candidate_runtime_manifest_sha256 === zipLock.candidate_runtime_manifest_sha256);
check('Locks agree on final hashes', stableLock.brainlink_candidate_final_package_sha256 === zipLock.candidate_final_package_sha256 && stableLock.brainlink_candidate_final_manifest_sha256 === zipLock.candidate_final_runtime_manifest_sha256);
check('v2.3 materializers apply final override', v23Sh.includes('.brainlink-v23-final-overrides') && v23Sh.includes('BRAINLINK_ZIP_CANDIDATE_V23_FINAL.sha256') && v23Ps.includes('.brainlink-v23-final-overrides') && v23Ps.includes('BRAINLINK_ZIP_CANDIDATE_V23_FINAL.sha256'));
check('Corpus remains separate from runtime', zipLock.documentation_corpus_scope === 'REPOSITORY_LEVEL_SEPARATE_FROM_RUNTIME_OVERLAY');
check('Authority ZIP hash remains preserved', corpusHash === zipLock.authority_source_sha256, corpusHash);
check('Transport includes validators and behavior tests', transportManifest.has('scripts/brainlink-validate-v23.mjs') && transportManifest.has('packages/frontend/core/src/brainlink/__tests__/canon.spec.ts') && transportManifest.has('packages/frontend/core/src/brainlink/__tests__/pretask.spec.ts') && transportManifest.has('packages/frontend/core/src/brainlink/__tests__/execution.spec.ts'));
check('V5 is context-only', context.includes('authority=CONTEXT_COMPLEMENT_ONLY'));
check('V5 cannot auto-promote', context.includes('auto_promote_runtime=false'));
check('V5 preserves product boundaries', context.includes('preserve_product_boundaries=true'));
check('V5 provenance is pinned', /source_sha256=[0-9a-f]{64}/.test(context));

console.log(`\n${checks.length - failures.length}/${checks.length} non-breakage checks passed.`);
if (failures.length) process.exit(1);
