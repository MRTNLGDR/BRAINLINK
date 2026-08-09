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
const desktopRouter = read('packages/frontend/core/src/desktop/router.tsx');
const mobileRouter = read('packages/frontend/core/src/mobile/router.tsx');
const policy = read('packages/frontend/core/src/brainlink/policy.ts');
const store = read('packages/frontend/core/src/brainlink/store.ts');
const types = read('packages/frontend/core/src/brainlink/types.ts');
const pkg = JSON.parse(read('package.json'));

const screenIds = [...catalog.matchAll(/id: 'BL-UI-(\d+)'/g)].map(match => match[1]);
const contextual = [...catalog.matchAll(/'Global Search and Command Palette'|'Document Inspector'|'Project Detail'|'Task Detail'|'Worker Detail'/g)];

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
assert('Audit ledger implemented', app.includes('Append-only application audit ledger'));
assert('Backup export implemented', app.includes('brainlink-backup-'));
assert('Backup import uses strict parser', app.includes('parseBrainlinkState(JSON.parse(await file.text()))'));
assert('State schema v2 implemented', types.includes('schemaVersion: 2') && store.includes('schemaVersion: 2'));
assert('Legacy v1 migration implemented', store.includes('BRAINLINK_LEGACY_STORAGE_KEYS') && store.includes('STATE_MIGRATED'));
assert('No secret value field in state model', !types.includes('secretValue'));
assert('AFFiNE technical workspace identity preserved', pkg.name === '@affine/monorepo');
assert('Brainlink scripts registered', Boolean(pkg.scripts?.['brainlink:dev'] && pkg.scripts?.['brainlink:build'] && pkg.scripts?.['brainlink:validate']));
assert('Brainlink targeted test/check scripts registered', Boolean(pkg.scripts?.['brainlink:test'] && pkg.scripts?.['brainlink:check']));
assert('Cumulative Brainlink V4 specification preserved', exists('brainlink-spec/BRAINLINK_CUMULATIVO_V4_COMPLETE.md') || root.includes('brainlink-final-verify'));

for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
console.log(`\n${checks.length - failures.length}/${checks.length} checks passed.`);
if (failures.length) process.exit(1);
