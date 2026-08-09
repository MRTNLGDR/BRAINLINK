import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGovernanceSnapshot, writeGovernanceSnapshot } from './brainlink-governance-store.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'governance', 'governance-snapshot.json');
const backupRoot = path.join(root, '.brainlink-backups', 'governance');
const stamp = () => new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');

function backup() {
  const snapshot = readGovernanceSnapshot(source);
  fs.mkdirSync(backupRoot, { recursive: true });
  const target = path.join(backupRoot, `governance-${stamp()}.json`);
  fs.writeFileSync(target, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
  console.log(target);
}

function restore(input) {
  if (!input) throw new Error('Informe o arquivo de backup para restaurar.');
  const backupFile = path.resolve(input);
  const snapshot = readGovernanceSnapshot(backupFile);
  backup();
  writeGovernanceSnapshot(source, snapshot);
  console.log(source);
}

const [command, input] = process.argv.slice(2);
if (command === 'backup') backup();
else if (command === 'restore') restore(input);
else throw new Error('Uso: node scripts/brainlink-governance-backup.mjs <backup|restore> [arquivo]');
