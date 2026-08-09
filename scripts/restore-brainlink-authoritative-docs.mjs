import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const transport = path.join(root, 'docs', 'corpus', 'v1.0.0', 'original-zip');
const expectedSha = '4bce9d511680c70d7cfd51dbc4ef203172a46fa4d10388acd16209fa6b556c09';
const expectedBytes = 320832;
const targetRoot = path.resolve(process.argv[2] ?? path.join(root, '.brainlink-workspace', 'authoritative-docs'));
const zipPath = path.join(targetRoot, 'Brainlink_Documentacao_Completa_v1.0.0.zip');
const extractPath = path.join(targetRoot, 'extracted');

const parts = fs.readdirSync(transport)
  .filter(name => /^zip\.part\d+[a-z]*\.b64$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (!parts.length) throw new Error('No authoritative ZIP transport fragments were found.');
const expectedIndexes = parts.map(name => Number(name.match(/part(\d+)/i)?.[1]));
for (let i = 0; i < expectedIndexes.length; i += 1) {
  if (expectedIndexes[i] !== i) throw new Error(`ZIP transport fragment gap at index ${i}.`);
}

const encoded = parts.map(name => fs.readFileSync(path.join(transport, name), 'utf8').trim()).join('');
const bytes = Buffer.from(encoded, 'base64');
if (bytes.length !== expectedBytes) throw new Error(`Authoritative ZIP size mismatch: ${bytes.length}.`);
const sha = crypto.createHash('sha256').update(bytes).digest('hex');
if (sha !== expectedSha) throw new Error(`Authoritative ZIP checksum mismatch: ${sha}.`);

fs.mkdirSync(targetRoot, { recursive: true });
fs.writeFileSync(zipPath, bytes);
fs.rmSync(extractPath, { recursive: true, force: true });
fs.mkdirSync(extractPath, { recursive: true });

if (process.platform === 'win32') {
  execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zipPath.replaceAll("'", "''")}' -DestinationPath '${extractPath.replaceAll("'", "''")}' -Force`], { stdio: 'inherit' });
} else {
  execFileSync('unzip', ['-q', '-o', zipPath, '-d', extractPath], { stdio: 'inherit' });
}

console.log(JSON.stringify({
  status: 'PASS',
  source: 'Brainlink_Documentacao_Completa_v1.0.0.zip',
  sha256: sha,
  bytes: bytes.length,
  fragments: parts.length,
  zipPath,
  extractPath,
}, null, 2));
