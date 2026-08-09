import fs from 'node:fs';
import path from 'node:path';

type DevServer = { app?: { use(handler: (req: any, res: any, next: () => void) => void): void } };

const pointerFile = path.resolve(process.cwd(), '.brainlink-runtime', 'governance-source.json');

function resolveSnapshotFile() {
  const pointer = JSON.parse(fs.readFileSync(pointerFile, 'utf8')) as { snapshotFile?: unknown };
  if (typeof pointer.snapshotFile !== 'string' || !path.isAbsolute(pointer.snapshotFile)) {
    throw new Error('Ponteiro de governanca ausente ou invalido.');
  }
  return pointer.snapshotFile;
}

function readSnapshot() {
  const payload: unknown = JSON.parse(fs.readFileSync(resolveSnapshotFile(), 'utf8'));
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Snapshot invalido.');
  const snapshot = payload as Record<string, unknown>;
  const arrays = ['modules', 'tasks', 'alerts', 'changelog', 'logs', 'documents'];
  if (snapshot.schemaVersion !== '1.0' || arrays.some(key => !Array.isArray(snapshot[key]))) {
    throw new Error('Contrato do snapshot incompativel.');
  }
  const tasks = snapshot.tasks as Array<{ status?: string }>;
  const alerts = snapshot.alerts as Array<{ status?: string; severity?: string }>;
  const modules = snapshot.modules as Array<{ status?: string }>;
  const doneTasks = tasks.filter(task => task.status === 'DONE').length;
  const blockedTasks = tasks.filter(task => task.status === 'BLOCKED').length;
  const criticalOpen = alerts.some(alert => alert.status !== 'RESOLVED' && alert.severity === 'CRITICAL');
  return {
    ...snapshot,
    generatedAt: new Date().toISOString(),
    state: tasks.length === 0 && modules.length === 0 ? 'EMPTY' : criticalOpen || blockedTasks > 0 ? 'DEGRADED' : 'READY',
    summary: {
      totalModules: modules.length,
      activeModules: modules.filter(module => module.status === 'ACTIVE' || module.status === 'DONE').length,
      totalTasks: tasks.length,
      doneTasks,
      pendingTasks: tasks.length - doneTasks,
      blockedTasks,
      openAlerts: alerts.filter(alert => alert.status !== 'RESOLVED').length,
      documents: (snapshot.documents as unknown[]).length,
      progressPercent: tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0,
    },
  };
}

export function createBrainlinkGovernanceDevMiddleware() {
  return (middlewares: unknown[], devServer: DevServer) => {
    devServer.app?.use((req, res, next) => {
      const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
      if (pathname === '/api/governance/snapshot' && req.method === 'GET') {
        try {
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.statusCode = 200;
          res.end(JSON.stringify(readSnapshot()));
        } catch (error) {
          res.statusCode = 503;
          res.end(JSON.stringify({ error: 'GOVERNANCE_UNAVAILABLE', message: error instanceof Error ? error.message : String(error) }));
        }
        return;
      }
      if (pathname === '/api/governance/events' && req.method === 'GET') {
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Content-Type', 'text/event-stream');
        res.flushHeaders?.();
        res.write(`event: ready\ndata: ${JSON.stringify({ connected: true })}\n\n`);
        let watcher: fs.FSWatcher | undefined;
        let heartbeat: ReturnType<typeof setInterval> | undefined;
        try {
          const snapshotFile = resolveSnapshotFile();
          watcher = fs.watch(path.dirname(snapshotFile), (_event, filename) => {
            if (!filename || filename.toString() === path.basename(snapshotFile)) {
              res.write(`event: snapshot\ndata: ${JSON.stringify({ updatedAt: new Date().toISOString() })}\n\n`);
            }
          });
          heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20_000);
        } catch (error) {
          res.write(`event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : String(error) })}\n\n`);
        }
        res.on('close', () => { watcher?.close(); if (heartbeat) clearInterval(heartbeat); });
        return;
      }
      next();
    });
    return middlewares;
  };
}
