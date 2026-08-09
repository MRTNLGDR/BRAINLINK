import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createGovernanceBridge } from './brainlink-governance-store.mjs';

const args = process.argv.slice(2);
const valueOf = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const root = path.resolve(valueOf('--root', process.cwd()));
const host = valueOf('--host', '127.0.0.1');
const port = Number(valueOf('--port', '8080'));
const indexPath = path.join(root, 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error(`Brainlink web build is missing: ${indexPath}`);
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.wasm', 'application/wasm'],
  ['.map', 'application/json; charset=utf-8'],
]);

const safeFile = urlPath => {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^([/\\])+/, '');
  const candidate = path.resolve(root, normalized);
  return candidate === root || candidate.startsWith(`${root}${path.sep}`)
    ? candidate
    : undefined;
};

const sendFile = (res, file) => {
  const stat = fs.statSync(file);
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mime.get(ext) ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });
  fs.createReadStream(file).pipe(res);
};

const governanceFile = path.resolve(
  process.env.BRAINLINK_GOVERNANCE_FILE ??
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'governance', 'governance-snapshot.json')
);
const governanceBridge = createGovernanceBridge({ snapshotFile: governanceFile });

const server = http.createServer(async (req, res) => {
  try {
    if (await governanceBridge.handle(req, res)) return;
    if (req.url === '/healthz') {
      const body = JSON.stringify({ status: 'ok', product: 'brainlink', pid: process.pid });
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store',
      });
      res.end(body);
      return;
    }

    const candidate = safeFile(req.url ?? '/');
    if (!candidate) {
      res.writeHead(400).end('Invalid path');
      return;
    }
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      sendFile(res, candidate);
      return;
    }
    sendFile(res, indexPath);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Brainlink server error');
  }
});

server.listen(port, host, () => {
  console.log(`[BRAINLINK] Serving ${root} at http://${host}:${port}/brainlink`);
});

const stop = () => server.close(() => process.exit(0));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
