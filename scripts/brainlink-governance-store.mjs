import { timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const arrays = ['modules', 'tasks', 'alerts', 'changelog', 'logs', 'documents'];
const allowed = {
  state: new Set(['READY', 'DEGRADED', 'EMPTY']),
  module: new Set(['ACTIVE', 'DEGRADED', 'BLOCKED', 'DONE', 'PLANNED']),
  task: new Set(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']),
  priority: new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  alert: new Set(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']),
  log: new Set(['INFO', 'WARN', 'ERROR']),
  document: new Set(['CURRENT', 'STALE', 'ARCHIVED']),
};

const isRecord = value => typeof value === 'object' && value !== null && !Array.isArray(value);
const hasText = (value, field) => typeof value[field] === 'string' && value[field].trim().length > 0;

function assertRows(rows, kind, fields, statusField, statusValues) {
  const ids = new Set();
  for (const row of rows) {
    if (!isRecord(row) || fields.some(field => !hasText(row, field))) throw new Error(`${kind} contem registro incompleto.`);
    if (ids.has(row.id)) throw new Error(`${kind} contem ID duplicado: ${row.id}.`);
    if (statusField && !statusValues.has(row[statusField])) throw new Error(`${kind} contem ${statusField} invalido: ${row[statusField]}.`);
    ids.add(row.id);
  }
}

export function validateGovernanceSnapshot(payload) {
  if (!isRecord(payload)) throw new Error('Snapshot deve ser um objeto JSON.');
  if (payload.schemaVersion !== '1.0') throw new Error('schemaVersion deve ser 1.0.');
  if (arrays.some(key => !Array.isArray(payload[key]))) throw new Error('Snapshot nao contem todas as colecoes obrigatorias.');
  if (!allowed.state.has(payload.state)) throw new Error('Estado geral invalido.');

  assertRows(payload.modules, 'modules', ['id', 'name', 'description', 'owner', 'updatedAt'], 'status', allowed.module);
  assertRows(payload.tasks, 'tasks', ['id', 'title', 'moduleId', 'owner', 'acceptanceCriteria', 'updatedAt'], 'status', allowed.task);
  payload.tasks.forEach(task => { if (!allowed.priority.has(task.priority)) throw new Error(`Prioridade invalida em ${task.id}.`); });
  assertRows(payload.alerts, 'alerts', ['id', 'title', 'description', 'action', 'updatedAt'], 'status', allowed.alert);
  payload.alerts.forEach(alert => { if (!allowed.priority.has(alert.severity)) throw new Error(`Severidade invalida em ${alert.id}.`); });
  assertRows(payload.changelog, 'changelog', ['id', 'version', 'title', 'description', 'at']);
  assertRows(payload.logs, 'logs', ['id', 'event', 'message', 'at'], 'level', allowed.log);
  assertRows(payload.documents, 'documents', ['id', 'title', 'kind', 'path', 'updatedAt'], 'status', allowed.document);

  const moduleIds = new Set(payload.modules.map(module => module.id));
  const missingModule = payload.tasks.find(task => !moduleIds.has(task.moduleId));
  if (missingModule) throw new Error(`Tarefa ${missingModule.id} referencia modulo inexistente.`);
  return payload;
}

export function calculateGovernanceSnapshot(payload) {
  const source = validateGovernanceSnapshot(structuredClone(payload));
  const doneTasks = source.tasks.filter(task => task.status === 'DONE').length;
  const blockedTasks = source.tasks.filter(task => task.status === 'BLOCKED').length;
  const criticalOpen = source.alerts.some(alert => alert.status !== 'RESOLVED' && alert.severity === 'CRITICAL');
  source.generatedAt = new Date().toISOString();
  source.state = source.tasks.length === 0 && source.modules.length === 0 ? 'EMPTY' : criticalOpen || blockedTasks > 0 ? 'DEGRADED' : 'READY';
  source.summary = {
    totalModules: source.modules.length,
    activeModules: source.modules.filter(module => module.status === 'ACTIVE' || module.status === 'DONE').length,
    totalTasks: source.tasks.length,
    doneTasks,
    pendingTasks: source.tasks.length - doneTasks,
    blockedTasks,
    openAlerts: source.alerts.filter(alert => alert.status !== 'RESOLVED').length,
    documents: source.documents.length,
    progressPercent: source.tasks.length ? Math.round((doneTasks / source.tasks.length) * 100) : 0,
  };
  return source;
}

export function readGovernanceSnapshot(snapshotFile) {
  return calculateGovernanceSnapshot(JSON.parse(fs.readFileSync(snapshotFile, 'utf8')));
}

export function writeGovernanceSnapshot(snapshotFile, payload) {
  const snapshot = calculateGovernanceSnapshot(payload);
  fs.mkdirSync(path.dirname(snapshotFile), { recursive: true });
  const temporary = `${snapshotFile}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, snapshotFile);
  return snapshot;
}

function sameSecret(left, right) {
  const a = Buffer.from(left ?? '');
  const b = Buffer.from(right ?? '');
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

function isLoopback(address = '') {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65_536) throw new Error('Evento excede 64 KiB.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function mutateSnapshot(snapshot, event) {
  if (!isRecord(event) || !['TASK_STATUS', 'ALERT_STATUS', 'LOG'].includes(event.kind)) throw new Error('Tipo de evento invalido.');
  if (event.kind === 'TASK_STATUS') {
    const task = snapshot.tasks.find(item => item.id === event.id);
    if (!task || !allowed.task.has(event.status)) throw new Error('Tarefa ou estado invalido.');
    task.status = event.status;
    task.updatedAt = new Date().toISOString();
  }
  if (event.kind === 'ALERT_STATUS') {
    const alert = snapshot.alerts.find(item => item.id === event.id);
    if (!alert || !allowed.alert.has(event.status)) throw new Error('Alerta ou estado invalido.');
    alert.status = event.status;
    alert.updatedAt = new Date().toISOString();
  }
  if (event.kind === 'LOG') {
    if (!isRecord(event.log)) throw new Error('Log invalido.');
    const log = { ...event.log, id: event.log.id ?? `BL-LOG-${Date.now()}`, at: event.log.at ?? new Date().toISOString() };
    assertRows([log], 'log', ['id', 'event', 'message', 'at'], 'level', allowed.log);
    snapshot.logs.unshift(log);
  }
  return snapshot;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

export function createGovernanceBridge({ snapshotFile, mutationToken = process.env.BRAINLINK_GOVERNANCE_TOKEN } = {}) {
  if (!snapshotFile) throw new Error('snapshotFile e obrigatorio.');
  const clients = new Set();
  let watcher;
  let debounce;

  try {
    watcher = fs.watch(path.dirname(snapshotFile), (_event, filename) => {
      if (filename && filename.toString() !== path.basename(snapshotFile)) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const message = `event: snapshot\ndata: ${JSON.stringify({ updatedAt: new Date().toISOString() })}\n\n`;
        clients.forEach(client => client.write(message));
      }, 80);
    });
  } catch {
    watcher = undefined;
  }

  return {
    async handle(req, res) {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (url.pathname === '/api/governance/snapshot') {
        if (req.method !== 'GET') { sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' }); return true; }
        try { sendJson(res, 200, readGovernanceSnapshot(snapshotFile)); }
        catch (error) { sendJson(res, 503, { error: 'GOVERNANCE_UNAVAILABLE', message: error instanceof Error ? error.message : String(error) }); }
        return true;
      }
      if (url.pathname === '/api/governance/events' && req.method === 'GET') {
        res.writeHead(200, { 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'Content-Type': 'text/event-stream', 'X-Accel-Buffering': 'no' });
        res.write(`event: ready\ndata: ${JSON.stringify({ connected: true })}\n\n`);
        clients.add(res);
        const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20_000);
        req.on('close', () => { clearInterval(heartbeat); clients.delete(res); });
        return true;
      }
      if (url.pathname === '/api/governance/events' && req.method === 'POST') {
        if (!isLoopback(req.socket.remoteAddress)) { sendJson(res, 403, { error: 'LOOPBACK_ONLY' }); return true; }
        if (!mutationToken) { sendJson(res, 503, { error: 'MUTATIONS_DISABLED' }); return true; }
        if (!sameSecret(req.headers['x-brainlink-governance-token'], mutationToken)) { sendJson(res, 401, { error: 'UNAUTHORIZED' }); return true; }
        try {
          const event = await readJsonBody(req);
          const snapshot = writeGovernanceSnapshot(snapshotFile, mutateSnapshot(readGovernanceSnapshot(snapshotFile), event));
          sendJson(res, 200, snapshot);
        } catch (error) {
          sendJson(res, 400, { error: 'INVALID_GOVERNANCE_EVENT', message: error instanceof Error ? error.message : String(error) });
        }
        return true;
      }
      return false;
    },
    close() { clearTimeout(debounce); watcher?.close(); clients.forEach(client => client.end()); clients.clear(); },
  };
}
