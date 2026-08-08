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
assert('Evidence gate implemented', app.includes('Evidence gate blocked DONE'));
assert('Policy module exists', exists('packages/frontend/core/src/brainlink/policy.ts'));
assert('Policy unit tests exist', exists('packages/frontend/core/src/brainlink/__tests__/policy.spec.ts'));
assert('Cross-tab local sync implemented', app.includes("addEventListener('storage', sync)"));
assert('Worker read gate implemented', app.includes('WORKER_RULE_GATE_ACKNOWLEDGED'));
assert('Audit ledger implemented', app.includes('STATE_INITIALIZED') || app.includes('renderAudit'));
assert('Backup export implemented', app.includes('brainlink-backup-'));
assert('Backup import validates schema', app.includes('parsed.schemaVersion !== 1'));
assert('No secret value field in state model', !types.includes('secretValue'));
assert('AFFiNE technical workspace identity preserved', pkg.name === '@affine/monorepo');
assert('Brainlink scripts registered', Boolean(pkg.scripts?.['brainlink:dev'] && pkg.scripts?.['brainlink:build'] && pkg.scripts?.['brainlink:validate']));

for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
console.log(`\n${checks.length - failures.length}/${checks.length} checks passed.`);
if (failures.length) process.exit(1);
