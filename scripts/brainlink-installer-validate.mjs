import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const at = file => path.join(root, ...file.split('/'));
const exists = file => fs.existsSync(at(file));
const read = file => fs.readFileSync(at(file), 'utf8');
const failures = [];
const checks = [];
const check = (name, condition, detail = '') => {
  const ok = Boolean(condition);
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
};

const mainBat = read('BRAINLINK.bat');
const setupBat = read('BRAINLINK_SETUP.bat');
const devBat = read('BRAINLINK_DEV.bat');
const buildBat = read('BRAINLINK_BUILD.bat');
const bootstrap = read('scripts/brainlink-bootstrap.ps1');
const oneClick = read('scripts/brainlink-one-click.mjs');
const materialize = read('scripts/brainlink-materialize.mjs');
const affineLocalAi = read('scripts/apply-affine-local-ai.mjs');
const affineUiIntegration = read('scripts/apply-affine-ui-integration.mjs');
const webPostcssFix = read('scripts/apply-affine-web-postcss-fix.mjs');
const auditTransform = read('scripts/apply-audit-v21.mjs');
const packagePatch = read('scripts/brainlink-package-patch.mjs');
const serve = read('scripts/brainlink-serve.mjs');
const browserSmoke = read('scripts/brainlink-browser-smoke.mjs');
const stableManifest = read('BRAINLINK_RUNTIME_V2.sha256');
const stableLock = read('AFFINE_UPSTREAM.lock');
const workflow = exists('.github/workflows/windows-one-click.yml')
  ? read('.github/workflows/windows-one-click.yml')
  : '';

check('Single one-click BAT exists', exists('BRAINLINK.bat'));
check('One-click BAT delegates only to verified PowerShell bootstrap', mainBat.includes('scripts\\brainlink-bootstrap.ps1') && !mainBat.includes('corepack') && !mainBat.includes('yarn '));
check('Legacy setup wrapper delegates to one-click BAT', setupBat.includes('BRAINLINK.bat') && setupBat.includes('--setup-only'));
check('Legacy dev wrapper delegates to one-click BAT', devBat.includes('BRAINLINK.bat') && devBat.includes('--dev'));
check('Legacy build wrapper delegates to one-click BAT', buildBat.includes('BRAINLINK.bat') && buildBat.includes('--build-only'));
check('Portable Node is pinned to AFFiNE .nvmrc release', bootstrap.includes("$version = '22.23.0'") && bootstrap.includes('node-v$version-win-$Architecture.zip'));
check('Portable Node archives have pinned SHA-256 checksums', bootstrap.includes('425a5bd68cc95e8eb16bcccd0a75081b48983fc6a26f67126bd4d6c7198231e8') && bootstrap.includes('8d540a7a1eeb3ff6681f516c47d786964b874acdaa4fd83338d6898bbb4f68a4'));
check('Git for Windows comes from official release API', bootstrap.includes('api.github.com/repos/git-for-windows/git/releases/latest') && bootstrap.includes('MinGit-'));
check('Portable Git requires digest or Authenticode verification', bootstrap.includes("asset.digest -match '^sha256:") && bootstrap.includes('Get-AuthenticodeSignature'));
check('Windows symlink and long-path prerequisites are handled', bootstrap.includes('Test-SymbolicLinkCapability') && bootstrap.includes('AllowDevelopmentWithoutDevLicense') && bootstrap.includes('LongPathsEnabled'));
check('Installer maintains a canonical move-safe home', bootstrap.includes('01-apps-canonicos\\26-Brainlink') && oneClick.includes("const sourceRoot = path.join(home, 'source')"));
check('Managed source self-updates from Brainlink main', oneClick.includes("'fetch', '--prune', 'origin', 'main'") && oneClick.includes("'reset', '--hard', 'origin/main'"));
check('Stable AFFiNE source is pinned and self-healed', materialize.includes("upstreamTag: 'v0.27.0'") && materialize.includes("upstreamCommit: 'c61cc6a86f5f8364732296f0bb8393b37e0f70b3'") && materialize.includes('moveToQuarantine'));
check('Historical overlay cannot replace lock-sensitive upstream files', materialize.includes("'package.json', 'yarn.lock', '.yarnrc.yml', '.yarn/releases/yarn-4.13.0.cjs'") && materialize.includes("import { applyAffineWebPostcssFix } from './apply-affine-web-postcss-fix.mjs';") && materialize.includes('applyAffineWebPostcssFix(target);') && webPostcssFix.includes("loader: 'postcss-loader'") && webPostcssFix.includes('AFFiNE web PostCSS anchor expected exactly once'));
check('Unsafe root package override is absent', !exists('.brainlink-runtime-overrides/package.json'));
check('Malformed audit patch is provenance only', exists('.brainlink-patches/audit-v21.patch') && exists('.brainlink-patches/audit-v21.patch.b64') && !materialize.includes('decodeAuditPatch') && !materialize.includes('brainlink-audit-v21.patch'));
check('Stable materializer invokes deterministic audit, UI and local AI transforms', materialize.includes("import { applyAuditV21 } from './apply-audit-v21.mjs';") && materialize.includes('applyAuditV21(target);') && materialize.includes("import { applyAffineUiIntegration } from './apply-affine-ui-integration.mjs';") && materialize.includes('applyAffineUiIntegration(target);') && materialize.includes("import { applyAffineLocalAi } from './apply-affine-local-ai.mjs';") && materialize.includes('applyAffineLocalAi({ sourceRoot, targetRoot: target });') && affineUiIntegration.includes('data-ui="affine-integrated"') && affineUiIntegration.includes('Administration') && affineLocalAi.includes('BRAINLINK_LOCAL_AI_PROVIDER_ROUTER') && affineLocalAi.includes('affine-cloud.tsx'));
check('Audit transform requires exact final app checksum and anchors', auditTransform.includes("EXPECTED_APP_SHA256 = '5434d86452f0b1cabc6b3ee612c4ca3ac34223d5763db03649075829151fb6ad'") && auditTransform.includes('expected exactly once') && auditTransform.includes('legacy marker remains'));
check('Package patch verifies exact upstream blob', packagePatch.includes("AFFINE_PACKAGE_BLOB_SHA1 = '35ad088813dc2078137a46795000a60d8e70ddc4'"));
check('Package patch preserves AFFiNE dependency graph and deterministic web preview', packagePatch.includes("'@capacitor/cli': '^7.6.5'") && packagePatch.includes("vitest: '^4.1.8'") && packagePatch.includes("tar: '^7.5.16'") && packagePatch.includes("'brainlink:dev': 'yarn affine dev --package @affine/web'"));
check('Install is immutable and uses bundled Yarn directly', materialize.includes("['install', '--immutable']") && materialize.includes(".yarn', 'releases', 'yarn-4.13.0.cjs") && !materialize.includes('corepack'));
check('Stable runtime validation and tests run before build', materialize.includes("['brainlink:validate']") && materialize.includes("['brainlink:test']"));
check('Production path builds the real AFFiNE web package', packagePatch.includes("'brainlink:build': 'yarn affine web build'") && oneClick.includes('runBuildWithRecovery'));
check('Static server exposes a real health endpoint and SPA fallback', serve.includes("req.url === '/healthz'") && serve.includes('sendFile(res, indexPath)'));
check('Real browser smoke uses Playwright with installed Edge', browserSmoke.includes("requireFromTarget('@playwright/test')") && browserSmoke.includes("launchOptions.channel = 'msedge'") && browserSmoke.includes('page.screenshot'));
check('Browser navigation cannot hide diagnostics behind DOM lifecycle timeout', browserSmoke.includes("waitUntil: 'commit'") && browserSmoke.includes("page.locator('body').waitFor") && !browserSmoke.includes("waitUntil: 'domcontentloaded'"));
check('Browser failure preserves screenshot, HTML, text and JSON evidence', browserSmoke.includes("status: 'FAIL'") && browserSmoke.includes('htmlEvidence') && browserSmoke.includes('textEvidence') && browserSmoke.includes('safePageSnapshot'));
check('Browser success still requires Brainlink markers and clean critical assets', browserSmoke.includes("const markers = ['Brainlink', 'Project World', 'Universalis', 'Governance']") && browserSmoke.includes('criticalFailedRequests') && browserSmoke.includes('criticalBadResponses'));
check('One-click requires browser smoke before user launch', oneClick.includes('runBrowserSmoke(target, managedSource, appUrl)') && oneClick.indexOf('runBrowserSmoke(target, managedSource, appUrl)') < oneClick.indexOf('openBrowser(appUrl)'));
check('Stable manifest excludes mutable package and candidates', !stableManifest.includes('package.json') && !stableManifest.includes('execution.ts') && !stableManifest.includes('v23'));
check('Stable/candidate release boundary remains explicit', stableLock.includes('brainlink_runtime_release=v2.1') && stableLock.includes('brainlink_candidate_status=NOT_PROMOTED'));
check('Windows CI runs the same public one-click BAT', workflow.includes('windows-latest') && workflow.includes('BRAINLINK.bat --ci') && workflow.includes('upload-artifact'));

console.log(`\n${checks.length - failures.length}/${checks.length} installer invariants passed.`);
if (failures.length) process.exit(1);
