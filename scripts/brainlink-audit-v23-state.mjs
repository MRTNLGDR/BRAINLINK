import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rawArgs = process.argv.slice(2);
const option = name => {
  const prefix = `${name}=`;
  const value = rawArgs.find(argument => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : undefined;
};
const root = path.resolve(option('--root') ?? process.cwd());
const output = path.resolve(option('--output') ?? path.join(root, 'brainlink-v23-transport-audit.json'));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const parseLock = content => Object.fromEntries(
  content.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const separator = line.indexOf('=');
    return separator < 0 ? [line, ''] : [line.slice(0, separator), line.slice(separator + 1)];
  })
);
const fail = message => {
  throw new Error(`Brainlink v2.3 candidate-state audit failed: ${message}`);
};

const lock = parseLock(read('BRAINLINK_ZIP_AUTHORITY.lock'));
if (lock.candidate_status !== 'BLOCKED_CORRUPT_TRANSPORT') {
  const strict = path.join(root, 'scripts', 'brainlink-audit-v23-transport.mjs');
  const result = spawnSync(process.execPath, [strict, `--root=${root}`, `--output=${output}`, '--require-pinned'], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

if (lock.candidate_promotion_allowed !== 'false') fail('blocked candidate must set candidate_promotion_allowed=false');
if (!/^[0-9a-f]{64}$/.test(lock.candidate_runtime_overlay_sha256 ?? '')) fail('missing intended archive pin');
if (!/^[0-9a-f]{64}$/.test(lock.candidate_runtime_observed_sha256 ?? '')) fail('missing observed archive pin');
if (lock.candidate_runtime_integrity !== 'FAILED_GZIP_CRC_AND_LENGTH') fail('integrity failure classification is missing');

const directory = path.join(root, '.brainlink-zip-candidate-v23-runtime');
const pattern = /^runtime\.part(\d+)([a-z]*)\.b64$/;
const parts = fs.readdirSync(directory)
  .map(name => ({ name, match: name.match(pattern) }))
  .filter(item => item.match)
  .sort((left, right) => Number(left.match[1]) - Number(right.match[1]) || left.match[2].localeCompare(right.match[2]));
if (!parts.length) fail('no candidate transport fragments found');

const encoded = parts.map(item => fs.readFileSync(path.join(directory, item.name), 'utf8')).join('').replace(/\s+/g, '');
if (!encoded || encoded.length % 4 === 1 || /[^A-Za-z0-9+/=]/.test(encoded)) fail('invalid base64 transport');
const archive = Buffer.from(encoded, 'base64');
const observed = sha256(archive);
if (observed !== lock.candidate_runtime_observed_sha256) {
  fail(`repository transport changed: expected observed ${lock.candidate_runtime_observed_sha256}, got ${observed}`);
}
if (observed === lock.candidate_runtime_overlay_sha256) {
  fail('blocked candidate unexpectedly equals the intended release archive; update governance after strict audit');
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'brainlink-v23-blocked-audit-'));
const archivePath = path.join(temporary, 'candidate.tar.gz');
fs.writeFileSync(archivePath, archive);
const tar = spawnSync('tar', ['-tzf', archivePath], { encoding: 'utf8' });
const diagnostic = `${tar.stderr ?? ''}\n${tar.stdout ?? ''}`.trim();
fs.rmSync(temporary, { recursive: true, force: true });
if (tar.status === 0) fail('candidate archive became readable; strict audit and governance update are required before continuing');
if (!/crc|invalid compressed data|length error|unexpected end|child returned status/i.test(diagnostic)) {
  fail(`archive failed for an unclassified reason: ${diagnostic}`);
}

const evidence = {
  schemaVersion: 1,
  kind: 'BRAINLINK_V23_BLOCKED_TRANSPORT_EVIDENCE',
  generatedAt: new Date().toISOString(),
  candidate: lock.candidate_runtime,
  status: lock.candidate_status,
  promotionAllowed: false,
  fragmentCount: parts.length,
  fragments: parts.map(item => item.name),
  archiveBytes: archive.length,
  intendedArchiveSha256: lock.candidate_runtime_overlay_sha256,
  observedArchiveSha256: observed,
  integrity: lock.candidate_runtime_integrity,
  tarExitCode: tar.status,
  diagnostic,
  stableRuntimeUnaffected: lock.stable_runtime === 'v2.1',
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(evidence, null, 2));
