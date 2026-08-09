import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';

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
const writeEvidence = evidence => {
  if (!output) return;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
};

const transportCandidates = [
  '.brainlink-zip-candidate-v23-runtime',
  '.brainlink-zip-candidate-v23',
];
const partsRelative = transportCandidates.find(candidate => exists(candidate));
if (!partsRelative) fail(`missing transport directory (${transportCandidates.join(' or ')})`);
const runtimeTransport = partsRelative.endsWith('-runtime');
const manifestRelative = runtimeTransport
  ? 'BRAINLINK_ZIP_CANDIDATE_V23_RUNTIME.sha256'
  : 'BRAINLINK_ZIP_CANDIDATE_V23.sha256';
if (!exists(manifestRelative)) fail(`missing manifest ${manifestRelative}`);
if (!exists('BRAINLINK_ZIP_AUTHORITY.lock')) fail('missing BRAINLINK_ZIP_AUTHORITY.lock');

const partPattern = /^runtime\.part(\d+)([a-z]*)\.b64$/;
const naturalParts = fs.readdirSync(path.join(root, partsRelative))
  .map(name => ({ name, match: name.match(partPattern) }))
  .filter(item => item.match)
  .map(item => ({
    ...item,
    encoded: fs.readFileSync(path.join(root, partsRelative, item.name), 'utf8').replace(/\s+/g, ''),
  }))
  .sort((left, right) => {
    const numberDelta = Number(left.match[1]) - Number(right.match[1]);
    return numberDelta || left.match[2].localeCompare(right.match[2]);
  });
if (!naturalParts.length) fail(`no runtime.part*.b64 files under ${partsRelative}`);
if (Number(naturalParts[0].match[1]) !== 0) fail(`first transport fragment is ${naturalParts[0].name}, expected index 00`);
for (let index = 1; index < naturalParts.length; index += 1) {
  if (naturalParts[index - 1].name === naturalParts[index].name) fail(`duplicate fragment ${naturalParts[index].name}`);
  const previousNumber = Number(naturalParts[index - 1].match[1]);
  const currentNumber = Number(naturalParts[index].match[1]);
  if (currentNumber > previousNumber + 1) fail(`fragment index gap between ${naturalParts[index - 1].name} and ${naturalParts[index].name}`);
}
for (const part of naturalParts) {
  if (!part.encoded || part.encoded.length % 4 === 1 || /[^A-Za-z0-9+/=]/.test(part.encoded)) {
    fail(`invalid base64 fragment ${part.name}`);
  }
}

const lock = parseLock(read('BRAINLINK_ZIP_AUTHORITY.lock'));
const pinnedArchive = runtimeTransport
  ? lock.candidate_runtime_overlay_sha256
  : lock.candidate_overlay_sha256;
const pinnedManifest = runtimeTransport
  ? lock.candidate_runtime_manifest_sha256
  : lock.candidate_final_manifest_sha256;
const manifestText = read(manifestRelative);
const manifestHash = sha256(Buffer.from(manifestText, 'utf8'));
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

const reversedSplitParts = [...naturalParts];
for (let index = 0; index < reversedSplitParts.length - 1; index += 1) {
  const left = reversedSplitParts[index];
  const right = reversedSplitParts[index + 1];
  if (left.match[1] === right.match[1] && left.match[2] && right.match[2]) {
    reversedSplitParts[index] = right;
    reversedSplitParts[index + 1] = left;
    index += 1;
  }
}
const lexicalParts = [...naturalParts].sort((left, right) => left.name.localeCompare(right.name));
const orderCandidates = [
  { name: 'natural-numeric-suffix', parts: naturalParts },
  { name: 'lexical', parts: lexicalParts },
  { name: 'reversed-same-index-suffix', parts: reversedSplitParts },
];
const uniqueOrders = orderCandidates.filter((candidate, index, all) =>
  all.findIndex(other => other.parts.map(part => part.name).join('|') === candidate.parts.map(part => part.name).join('|')) === index
);
const assemblyDiagnostics = [];
const successfulAssemblies = [];
for (const order of uniqueOrders) {
  const assemblyModes = [
    {
      name: 'decode-joined-base64',
      archive: Buffer.from(order.parts.map(part => part.encoded).join(''), 'base64'),
    },
    {
      name: 'decode-each-fragment',
      archive: Buffer.concat(order.parts.map(part => Buffer.from(part.encoded, 'base64'))),
    },
  ];
  for (const mode of assemblyModes) {
    const archiveHash = sha256(mode.archive);
    let gzipValid = false;
    let tarBytes = 0;
    let gzipError;
    try {
      const tar = gunzipSync(mode.archive);
      gzipValid = true;
      tarBytes = tar.length;
    } catch (error) {
      gzipError = error instanceof Error ? error.message : String(error);
    }
    const result = {
      order: order.name,
      mode: mode.name,
      archiveBytes: mode.archive.length,
      archiveSha256: archiveHash,
      matchesPinnedArchive: Boolean(pinnedArchive && archiveHash === pinnedArchive),
      gzipMagic: mode.archive[0] === 0x1f && mode.archive[1] === 0x8b,
      gzipValid,
      tarBytes,
      gzipError,
    };
    assemblyDiagnostics.push(result);
    if (gzipValid) successfulAssemblies.push({ ...result, archive: mode.archive, orderParts: order.parts });
  }
}

const partDiagnostics = naturalParts.map((part, index) => ({
  index,
  name: part.name,
  encodedCharacters: part.encoded.length,
  encodedMod4: part.encoded.length % 4,
  decodedBytes: Buffer.from(part.encoded, 'base64').length,
  paddingCount: (part.encoded.match(/=/g) ?? []).length,
  paddingBeforeEnd: /=/.test(part.encoded.slice(0, -2)),
  first16: part.encoded.slice(0, 16),
  last16: part.encoded.slice(-16),
}));
const baseEvidence = {
  schemaVersion: 2,
  kind: 'BRAINLINK_V23_TRANSPORT_AUDIT',
  generatedAt: new Date().toISOString(),
  transportDirectory: partsRelative,
  transportKind: runtimeTransport ? 'COMPACT_RUNTIME' : 'FULL_CORPUS_AND_RUNTIME',
  fragmentCount: naturalParts.length,
  fragments: partDiagnostics,
  manifest: manifestRelative,
  manifestSha256: manifestHash,
  manifestedFiles: manifest.size,
  pinnedArchiveSha256: pinnedArchive ?? null,
  pinnedManifestSha256: pinnedManifest ?? null,
  manifestMatchesPin: Boolean(pinnedManifest && manifestHash === pinnedManifest),
  assemblyDiagnostics,
};

if (requirePinned && (!pinnedArchive || !pinnedManifest)) {
  const evidence = { ...baseEvidence, status: 'FAIL', failure: 'runtime archive/manifest hashes are not both pinned' };
  writeEvidence(evidence);
  fail(evidence.failure);
}
if (pinnedManifest && pinnedManifest !== manifestHash) {
  const evidence = { ...baseEvidence, status: 'FAIL', failure: `manifest SHA-256 ${manifestHash} differs from pinned ${pinnedManifest}` };
  writeEvidence(evidence);
  fail(evidence.failure);
}
if (!successfulAssemblies.length) {
  const evidence = { ...baseEvidence, status: 'FAIL', failure: 'no deterministic fragment assembly produced a valid gzip stream' };
  writeEvidence(evidence);
  console.error(JSON.stringify(evidence, null, 2));
  fail(evidence.failure);
}
if (successfulAssemblies.length > 1) {
  const distinctHashes = new Set(successfulAssemblies.map(candidate => candidate.archiveSha256));
  if (distinctHashes.size > 1) {
    const evidence = { ...baseEvidence, status: 'FAIL', failure: 'multiple distinct valid gzip assemblies found' };
    writeEvidence(evidence);
    fail(evidence.failure);
  }
}
const selected = successfulAssemblies.find(candidate => candidate.matchesPinnedArchive) ?? successfulAssemblies[0];
if (pinnedArchive && selected.archiveSha256 !== pinnedArchive) {
  const evidence = {
    ...baseEvidence,
    selectedAssembly: { order: selected.order, mode: selected.mode, archiveBytes: selected.archiveBytes, archiveSha256: selected.archiveSha256 },
    status: 'FAIL',
    failure: `valid archive SHA-256 ${selected.archiveSha256} differs from pinned ${pinnedArchive}`,
  };
  writeEvidence(evidence);
  fail(evidence.failure);
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'brainlink-v23-transport-'));
const archivePath = path.join(temp, 'candidate.tar.gz');
const extractRoot = path.join(temp, 'extract');
fs.mkdirSync(extractRoot);
fs.writeFileSync(archivePath, selected.archive);
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

  const evidence = {
    ...baseEvidence,
    selectedAssembly: {
      order: selected.order,
      mode: selected.mode,
      archiveBytes: selected.archiveBytes,
      archiveSha256: selected.archiveSha256,
      tarBytes: selected.tarBytes,
    },
    pinned: Boolean(pinnedArchive && pinnedManifest),
    safePaths: true,
    exactArchiveManifestSet: true,
    allFinalFileHashesValid: true,
    status: 'PASS',
  };
  writeEvidence(evidence);
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const evidence = {
    ...baseEvidence,
    selectedAssembly: { order: selected.order, mode: selected.mode, archiveBytes: selected.archiveBytes, archiveSha256: selected.archiveSha256 },
    status: 'FAIL',
    failure: message,
  };
  writeEvidence(evidence);
  throw error;
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
