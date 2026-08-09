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
const flags = new Set(rawArgs.filter(argument => !argument.includes('=')));
const root = path.resolve(option('--root') ?? process.cwd());
const output = option('--output') ? path.resolve(option('--output')) : undefined;
const requirePinned = flags.has('--require-pinned');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = relative => fs.existsSync(path.join(root, relative));
const parseLock = content => Object.fromEntries(
  content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const separator = line.indexOf('=');
      return separator < 0 ? [line, ''] : [line.slice(0, separator), line.slice(separator + 1)];
    })
);
const fail = message => {
  throw new Error(`Brainlink v2.3 transport audit failed: ${message}`);
};
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.error) fail(`${command} could not start: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} ${args.join(' ')} exited ${result.status}: ${(result.stderr || result.stdout).trim()}`);
  return result.stdout;
};

const candidates = [
  '.brainlink-zip-candidate-v23-runtime',
  '.brainlink-zip-candidate-v23',
];
const partsRelative = candidates.find(candidate => exists(candidate));
if (!partsRelative) fail(`missing transport directory (${candidates.join(' or ')})`);
const runtimeTransport = partsRelative.endsWith('-runtime');
const manifestRelative = runtimeTransport
  ? 'BRAINLINK_ZIP_CANDIDATE_V23_RUNTIME.sha256'
  : 'BRAINLINK_ZIP_CANDIDATE_V23.sha256';
if (!exists(manifestRelative)) fail(`missing manifest ${manifestRelative}`);
if (!exists('BRAINLINK_ZIP_AUTHORITY.lock')) fail('missing BRAINLINK_ZIP_AUTHORITY.lock');

const partPattern = /^runtime\.part(\d+)([a-z]*)\.b64$/;
const parts = fs.readdirSync(path.join(root, partsRelative))
  .map(name => ({ name, match: name.match(partPattern) }))
  .filter(item => item.match)
  .sort((left, right) => {
    const numberDelta = Number(left.match[1]) - Number(right.match[1]);
    return numberDelta || left.match[2].localeCompare(right.match[2]);
  });
if (!parts.length) fail(`no runtime.part*.b64 files under ${partsRelative}`);
if (Number(parts[0].match[1]) !== 0) fail(`first transport fragment is ${parts[0].name}, expected index 00`);
for (let index = 1; index < parts.length; index += 1) {
  if (parts[index - 1].name === parts[index].name) fail(`duplicate fragment ${parts[index].name}`);
  const previousNumber = Number(parts[index - 1].match[1]);
  const currentNumber = Number(parts[index].match[1]);
  if (currentNumber > previousNumber + 1) fail(`fragment index gap between ${parts[index - 1].name} and ${parts[index].name}`);
}

const encoded = parts
  .map(item => fs.readFileSync(path.join(root, partsRelative, item.name), 'utf8'))
  .join('')
  .replace(/\s+/g, '');
if (!encoded || encoded.length % 4 === 1 || /[^A-Za-z0-9+/=]/.test(encoded)) fail('invalid base64 transport characters or length');
const archive = Buffer.from(encoded, 'base64');
if (archive.length < 4 || archive[0] !== 0x1f || archive[1] !== 0x8b) fail('decoded transport is not a gzip archive');

const manifestText = read(manifestRelative);
const manifest = new Map();
for (const [lineIndex, line] of manifestText.split(/\r?\n/).entries()) {
  if (!line.trim()) continue;
  const match = line.match(/^([0-9a-f]{64})\s{2}(.+)$/);
  if (!match) fail(`invalid manifest line ${lineIndex + 1}`);
  const [, hash, relative] = match;
  const normalized = relative.replace(/\\/g, '/');
  if (path.posix.isAbsolute(normalized) || normalized.split('/').includes('..')) fail(`unsafe manifest path ${relative}`);
  if (manifest.has(normalized)) fail(`duplicate manifest path ${relative}`);
  manifest.set(normalized, hash);
}
if (!manifest.size) fail('empty final-file manifest');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'brainlink-v23-transport-'));
const archivePath = path.join(temp, 'candidate.tar.gz');
const extractRoot = path.join(temp, 'extract');
fs.mkdirSync(extractRoot);
fs.writeFileSync(archivePath, archive);
try {
  const listing = run('tar', ['-tzf', archivePath])
    .split(/\r?\n/)
    .map(entry => entry.trim().replace(/^\.\//, ''))
    .filter(Boolean);
  const archiveFiles = new Set();
  for (const entry of listing) {
    const normalized = entry.replace(/\\/g, '/');
    if (path.posix.isAbsolute(normalized) || normalized.split('/').includes('..')) fail(`unsafe archive path ${entry}`);
    if (!normalized.endsWith('/')) archiveFiles.add(normalized);
  }
  const missing = [...manifest.keys()].filter(relative => !archiveFiles.has(relative));
  const unexpected = [...archiveFiles].filter(relative => !manifest.has(relative));
  if (missing.length) fail(`archive is missing ${missing.length} manifested file(s): ${missing.slice(0, 5).join(', ')}`);
  if (unexpected.length) fail(`archive has ${unexpected.length} unmanifested file(s): ${unexpected.slice(0, 5).join(', ')}`);

  run('tar', ['-xzf', archivePath, '-C', extractRoot]);
  const mismatches = [];
  for (const [relative, expected] of manifest) {
    const file = path.join(extractRoot, ...relative.split('/'));
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      mismatches.push({ relative, expected, actual: 'MISSING' });
      continue;
    }
    const actual = sha256(fs.readFileSync(file));
    if (actual !== expected) mismatches.push({ relative, expected, actual });
  }
  if (mismatches.length) fail(`final-file checksum mismatch: ${JSON.stringify(mismatches.slice(0, 5))}`);

  const lock = parseLock(read('BRAINLINK_ZIP_AUTHORITY.lock'));
  const archiveHash = sha256(archive);
  const manifestHash = sha256(Buffer.from(manifestText, 'utf8'));
  const pinnedArchive = runtimeTransport
    ? lock.candidate_runtime_overlay_sha256
    : lock.candidate_overlay_sha256;
  const pinnedManifest = runtimeTransport
    ? lock.candidate_runtime_manifest_sha256
    : lock.candidate_final_manifest_sha256;
  if (pinnedArchive && pinnedArchive !== archiveHash) fail(`archive SHA-256 ${archiveHash} differs from pinned ${pinnedArchive}`);
  if (pinnedManifest && pinnedManifest !== manifestHash) fail(`manifest SHA-256 ${manifestHash} differs from pinned ${pinnedManifest}`);
  if (requirePinned && (!pinnedArchive || !pinnedManifest)) fail('runtime archive/manifest hashes are not both pinned in BRAINLINK_ZIP_AUTHORITY.lock');

  const evidence = {
    schemaVersion: 1,
    kind: 'BRAINLINK_V23_TRANSPORT_AUDIT',
    generatedAt: new Date().toISOString(),
    transportDirectory: partsRelative,
    transportKind: runtimeTransport ? 'COMPACT_RUNTIME' : 'FULL_CORPUS_AND_RUNTIME',
    fragmentCount: parts.length,
    fragments: parts.map(item => item.name),
    archiveBytes: archive.length,
    archiveSha256: archiveHash,
    manifest: manifestRelative,
    manifestSha256: manifestHash,
    manifestedFiles: manifest.size,
    pinnedArchiveSha256: pinnedArchive ?? null,
    pinnedManifestSha256: pinnedManifest ?? null,
    pinned: Boolean(pinnedArchive && pinnedManifest),
    safePaths: true,
    exactArchiveManifestSet: true,
    allFinalFileHashesValid: true,
    status: 'PASS',
  };
  if (output) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
