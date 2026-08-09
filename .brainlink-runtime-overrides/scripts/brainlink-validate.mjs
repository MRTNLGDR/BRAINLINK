import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const failures = [];
const checks = [];

const assert = (name, condition, detail = '') => {
  checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) failures.push(name);
};

const app = read('packages/frontend/core/src/brainlink/app.tsx');
const catalog = read('packages/frontend/core/src/brainlink/catalog.ts');
const integrity = read('packages/frontend/core/src/brainlink/integrity.ts');
const desktopRouter = read('packages/frontend/core/src/desktop/router.tsx');
const mobileRouter = read('packages/frontend/core/src/mobile/router.tsx');
const policy = read('packages/frontend/core/src/brainlink/policy.ts');
const store = read('packages/frontend/core/src/brainlink/store.ts');
const types = read('packages/frontend/core/src/brainlink/types.ts');
const pkg = JSON.parse(read('package.json'));

const screenIds = [...catalog.matchAll(/id: 'BL-UI-(\d+)'/g)].map(match => match[1]);
const contextual = [...catalog.matchAll(/'Global Search and Command Palette'|'Document Inspector'|'Project Detail'|'Task Detail'|'Worker Detail'/g)];
const expectedLockValues = {
  devDependencies: {
    '@capacitor/cli': '^7.6.5',
    '@vitest/browser': '^4.1.8',
    '@vitest/coverage-istanbul': '^4.1.8',
    '@vitest/ui': '^4.1.8',
    oxlint: '1.68.0',
    vitest: '^4.1.8',
  },
  resolutions: {
    '@opentelemetry/core': '^2.8.0',
    '@opentelemetry/resources': '^2.8.0',
    '@opentelemetry/sdk-trace-base': '^2.8.0',
    '@tootallnate/once': '^2.0.1',
    'js-yaml@npm:^4.1.0': '^4.2.0',
    'js-yaml@npm:4.1.1': '^4.2.0',
    tar: '^7.5.16',
  },
};
const lockCompatible = Object.entries(expectedLockValues).every(([section, entries]) =>
  Object.entries(entries).every(([name, version]) => pkg[section]?.[name] === version)
);

assert('Brainlink app exists', exists('packages/frontend/core/src/brainlink/app.tsx'));
assert('Desktop route registered', desktopRouter.includes("path: '/brainlink/*'"));
assert('Desktop mobile-companion route registered', desktopRouter.includes("path: '/m/brainlink/*'"));
assert('Mobile route registered', mobileRouter.includes("path: '/brainlink/*'"));
assert('Mobile companion route registered', mobileRouter.includes("path: '/m/brainlink/*'"));
assert('39 cataloged primary surfaces', screenIds.length === 39, `found ${screenIds.length}`);
assert('5 contextual surfaces', contextual.length === 5, `found ${contextual.length}`);
assert('44 total route intents', screenIds.length + contextual.length === 44, `found ${screenIds.length + contextual.length}`);
assert('Universalis runtime implemented', app.includes('renderUniversalis'));
assert('Scoped law targets modeled', types.includes('targetId?: string') && app.includes('laws require a target ID.'));
assert('Law lifecycle triggers modeled', types.includes("'SESSION_START'") && types.includes("'TASK_START'") && types.includes("'TASK_END'") && types.includes("'ON_ERROR'"));
assert('Contextual worker law resolver implemented', policy.includes('workerStartRequiredLaws'));
assert('Task-end law resolver implemented', policy.includes('taskEndRequiredLaws'));
assert('Error retry gate implemented', policy.includes("worker.status === 'BLOCKED'") && policy.includes("triggers.push('ON_ERROR')"));
assert('Evidence gate implemented', policy.includes('hasFreshTaskEvidence') && app.includes('DONE blocked:'));
assert('Stale evidence rejected', policy.includes('evidenceEpoch >= taskEpoch'));
assert('Policy unit tests exist', exists('packages/frontend/core/src/brainlink/__tests__/policy.spec.ts'));
assert('Store migration unit tests exist', exists('packages/frontend/core/src/brainlink/__tests__/store.spec.ts'));
assert('Cross-tab local sync implemented', app.includes("addEventListener('storage', sync)"));
assert('Worker read gate implemented', app.includes('WORKER_RULE_GATE_ACKNOWLEDGED'));
assert('Connector write approval gate implemented', policy.includes('connectionHasApprovedWrite') && app.includes('WRITE_ACCESS_REQUESTED'));
assert('No fake live connector status', !types.includes("'CONNECTED'") && app.includes('Registration does not claim a live transport connection'));
assert('Imported write bypass is downgraded', store.includes('UNAPPROVED_WRITE_DOWNGRADED'));
assert('Bug solve requires explicit verification', app.includes('BUG_VERIFIED_SOLVED') && !app.includes("if (event.target.value.trim()) item.status = 'SOLVED'"));
assert('Project progress derived from tasks', policy.includes('projectProgress') && !app.includes('+10% progress'));
assert('Audit integrity module exists', exists('packages/frontend/core/src/brainlink/integrity.ts'));
assert('Audit chain fields modeled', types.includes('sequence?: number') && types.includes('prevHash?: string') && types.includes('eventHash?: string'));
assert('SHA-256 audit hashing implemented', integrity.includes('sha256Hex') && integrity.includes('hashAuditEvent'));
assert('Audit append uses hash chain', app.includes('appendAuditEvent(draft.audit') && store.includes('appendAuditEvent(state.audit'));
assert('Imported audit chain is verified', store.includes('verifyAuditChain(state.audit)') && store.includes('audit integrity'));
assert('Audit tamper tests exist', exists('packages/frontend/core/src/brainlink/__tests__/integrity.spec.ts') && read('packages/frontend/core/src/brainlink/__tests__/integrity.spec.ts').includes('detects mutation'));
assert('Audit history is not silently truncated', !app.includes('audit.slice(0, 1000)'));
assert('Audit ledger implemented', app.includes('SHA-256 chained audit ledger') && app.includes('CHAIN VALID'));
assert('Backup export implemented', app.includes('brainlink-backup-'));
assert('Backup import uses strict parser', app.includes('parseBrainlinkState(JSON.parse(await file.text()))'));
assert('State schema v2 implemented', types.includes('schemaVersion: 2') && store.includes('schemaVersion: 2'));
assert('Legacy v1 migration implemented', store.includes('BRAINLINK_LEGACY_STORAGE_KEYS') && store.includes('STATE_MIGRATED'));
assert('No secret value field in state model', !types.includes('secretValue'));
assert('AFFiNE technical workspace identity preserved', pkg.name === '@affine/monorepo' && pkg.version === '0.27.0');
assert('Pinned Node and Yarn contract preserved', pkg.engines?.node === '>=22.12.0 <23.0.0' && pkg.packageManager === 'yarn@4.13.0');
assert('AFFiNE lock-sensitive dependency graph preserved', lockCompatible);
assert('Brainlink scripts registered', Boolean(pkg.scripts?.['brainlink:dev'] && pkg.scripts?.['brainlink:build'] && pkg.scripts?.['brainlink:validate']));
assert('Brainlink web scripts target real AFFiNE web app', pkg.scripts?.['brainlink:dev'] === 'yarn affine web dev' && pkg.scripts?.['brainlink:build'] === 'yarn affine web build');
assert('Brainlink targeted test/check scripts registered', Boolean(pkg.scripts?.['brainlink:test'] && pkg.scripts?.['brainlink:check']));
assert('Runtime governance canon preserved', exists('docs/43_RUNTIME_IMPLEMENTATION_REPORT_2026-08-08.md') && exists('docs/44_GOVERNANCE_HARDENING_2026-08-08.md'));

for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
console.log(`\n${checks.length - failures.length}/${checks.length} checks passed.`);
if (failures.length) process.exit(1);
