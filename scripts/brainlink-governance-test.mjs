import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { calculateGovernanceSnapshot, createGovernanceBridge, readGovernanceSnapshot, validateGovernanceSnapshot, writeGovernanceSnapshot } from './brainlink-governance-store.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canonical = JSON.parse(fs.readFileSync(path.join(root, 'governance', 'governance-snapshot.json'), 'utf8'));
let temporary;
let snapshotFile;
let bridge;
let server;
let baseUrl;

before(async () => {
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'brainlink-governance-'));
  snapshotFile = path.join(temporary, 'snapshot.json');
  fs.writeFileSync(snapshotFile, JSON.stringify(canonical));
  bridge = createGovernanceBridge({ snapshotFile, mutationToken: 'test-token' });
  server = http.createServer(async (req, res) => { if (!(await bridge.handle(req, res))) { res.statusCode = 404; res.end(); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  bridge.close();
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(temporary, { recursive: true, force: true });
});

test('valida o contrato e recalcula o resumo', () => {
  const snapshot = calculateGovernanceSnapshot(canonical);
  assert.equal(validateGovernanceSnapshot(snapshot), snapshot);
  assert.equal(snapshot.summary.totalTasks, snapshot.tasks.length);
  assert.equal(snapshot.summary.doneTasks, snapshot.tasks.filter(task => task.status === 'DONE').length);
  assert.equal(snapshot.summary.progressPercent, Math.round((snapshot.summary.doneTasks / snapshot.summary.totalTasks) * 100));
});

test('rejeita snapshot invalido sem fallback', () => {
  assert.throws(() => validateGovernanceSnapshot({ schemaVersion: '1.0' }), /colecoes obrigatorias/);
  assert.throws(() => readGovernanceSnapshot(path.join(temporary, 'ausente.json')));
});

test('grava de forma atomica e preserva contrato', () => {
  const target = path.join(temporary, 'written.json');
  const result = writeGovernanceSnapshot(target, canonical);
  assert.equal(readGovernanceSnapshot(target).schemaVersion, '1.0');
  assert.equal(result.summary.totalModules, 4);
  assert.deepEqual(fs.readdirSync(temporary).filter(file => file.endsWith('.tmp')), []);
});

test('GET entrega snapshot real, sem cache e com resumo calculado', async () => {
  const response = await fetch(`${baseUrl}/api/governance/snapshot`);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(payload.summary.totalTasks, payload.tasks.length);
  assert.equal(payload.state, 'READY');
});

test('mutacao exige token e atualiza tarefa atomicamente', async () => {
  const denied = await fetch(`${baseUrl}/api/governance/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'TASK_STATUS', id: 'BL-TASK-008', status: 'DONE' }) });
  assert.equal(denied.status, 401);
  const accepted = await fetch(`${baseUrl}/api/governance/events`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-brainlink-governance-token': 'test-token' }, body: JSON.stringify({ kind: 'TASK_STATUS', id: 'BL-TASK-008', status: 'DONE' }) });
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).summary.progressPercent, 100);
});

test('frontend possui todos os gatilhos de sincronizacao e estados explicitos', () => {
  const panel = fs.readFileSync(path.join(root, 'brainlink-runtime', 'governance', 'governance-panel.tsx'), 'utf8');
  for (const marker of ['useQuery({', 'staleTime: 0', 'refetchInterval: 15_000', 'refetchOnWindowFocus: true', 'GOVERNANCE_UPDATED_EVENT', 'connectGovernanceEvents', 'query.isPending', 'query.isError', 'query.refetch()']) assert.match(panel, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('transformador preserva e restaura a rota funcional de projetos', () => {
  const transform = fs.readFileSync(path.join(root, 'scripts', 'apply-affine-governance-bridge.mjs'), 'utf8');
  assert.match(transform, /const nextRenderer = app\.indexOf\('\\n\\n  const renderProjects ='/);
  assert.match(transform, /const PROJECTS_RENDERER/);
  assert.match(transform, /PROJECT_CREATED/);
  assert.doesNotMatch(transform, /const renderWorld =\/;/);
});
