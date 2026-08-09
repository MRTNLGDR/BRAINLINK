import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { applyAuditV21 } from './apply-audit-v21.mjs';
import { patchBrainlinkPackage } from './brainlink-package-patch.mjs';

const DEFAULTS = Object.freeze({
  upstreamUrl: 'https://github.com/toeverything/AFFiNE.git',
  upstreamTag: 'v0.27.0',
  upstreamCommit: 'c61cc6a86f5f8364732296f0bb8393b37e0f70b3',
  overlaySha256: '1b4e3aa98dd378eb7299e071aa83329643114e40b3e66a378c319613a2a94b8d',
  manifestSha256: 'e16f1e4b9043c3a4d35a201f307f0f41811cad06280e87070acc92dc49e9c1c1',
});

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultSourceRoot = path.resolve(moduleDir, '..');

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const sha256Buffer = value => crypto.createHash('sha256').update(value).digest('hex');
const sha256File = file => sha256Buffer(fs.readFileSync(file));
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const commandString = (command, args) =>
  [command, ...args].map(value => (String(value).includes(' ') ? JSON.stringify(String(value)) : String(value))).join(' ');

const run = (command, args, options = {}) => {
  console.log(`[BRAINLINK] > ${commandString(command, args)}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    windowsHide: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture
      ? `\n${result.stdout ?? ''}\n${result.stderr ?? ''}`
      : '';
    throw new Error(`${commandString(command, args)} failed with exit code ${result.status}.${detail}`);
  }
  return options.capture ? String(result.stdout ?? '').trim() : '';
};

const retry = async (label, attempts, action) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action(attempt);
    } catch (error) {
      lastError = error;
      console.error(`[BRAINLINK] ${label} attempt ${attempt}/${attempts} failed: ${error.message}`);
      if (attempt < attempts) await sleep(attempt * 3000);
    }
  }
  throw lastError;
};

const gitOutput = (git, args, cwd) => run(git, args, { cwd, capture: true });

const moveToQuarantine = (item, quarantineRoot) => {
  if (!fs.existsSync(item)) return undefined;
  fs.mkdirSync(quarantineRoot, { recursive: true });
  const target = path.join(quarantineRoot, `${path.basename(item)}-${stamp()}`);
  fs.renameSync(item, target);
  console.warn(`[BRAINLINK] Preserved invalid managed workspace at ${target}`);
  return target;
};

const findTar = git => {
  const candidates = [
    process.env.BRAINLINK_TAR,
    process.platform === 'win32' ? path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : undefined,
    process.platform === 'win32' && path.isAbsolute(git)
      ? path.resolve(path.dirname(git), '..', 'usr', 'bin', 'tar.exe')
      : undefined,
    'tar',
  ].filter(Boolean);
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ['--version'], { stdio: 'ignore', windowsHide: true });
    if (!probe.error && probe.status === 0) return candidate;
  }
  throw new Error('A tar implementation is required. Windows 10/11 normally provides System32\\tar.exe.');
};

const ensureUpstreamWorkspace = async ({ git, target, quarantineRoot }) => {
  const gitDir = path.join(target, '.git');
  if (fs.existsSync(target) && !fs.existsSync(gitDir)) {
    moveToQuarantine(target, quarantineRoot);
  }

  if (!fs.existsSync(gitDir)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await retry('AFFiNE clone', 3, () => {
      if (fs.existsSync(target)) moveToQuarantine(target, quarantineRoot);
      run(git, [
        '-c', 'core.longpaths=true',
        '-c', 'core.symlinks=true',
        '-c', 'core.autocrlf=false',
        'clone', '--depth', '1', '--single-branch', '--branch', DEFAULTS.upstreamTag,
        DEFAULTS.upstreamUrl, target,
      ]);
    });
  }

  const remote = gitOutput(git, ['-C', target, 'remote', 'get-url', 'origin']);
  if (remote.replace(/\/$/, '') !== DEFAULTS.upstreamUrl.replace(/\/$/, '')) {
    moveToQuarantine(target, quarantineRoot);
    return ensureUpstreamWorkspace({ git, target, quarantineRoot });
  }

  run(git, ['-C', target, 'config', 'core.longpaths', 'true']);
  run(git, ['-C', target, 'config', 'core.symlinks', 'true']);
  run(git, ['-C', target, 'config', 'core.autocrlf', 'false']);
  await retry('AFFiNE pinned revision fetch', 3, () =>
    run(git, ['-C', target, 'fetch', '--force', '--depth', '1', 'origin', `refs/tags/${DEFAULTS.upstreamTag}:refs/tags/${DEFAULTS.upstreamTag}`])
  );
  run(git, ['-C', target, 'reset', '--hard', DEFAULTS.upstreamCommit]);
  run(git, ['-C', target, 'clean', '-fd']);

  const actual = gitOutput(git, ['-C', target, 'rev-parse', 'HEAD']);
  if (actual !== DEFAULTS.upstreamCommit) {
    throw new Error(`AFFiNE revision mismatch. Expected ${DEFAULTS.upstreamCommit}, got ${actual}.`);
  }
};

const reconstructBaseOverlay = ({ sourceRoot, workspaceRoot }) => {
  const runtimeDir = path.join(sourceRoot, '.brainlink-runtime');
  const parts = fs.readdirSync(runtimeDir)
    .filter(name => /^runtime\.part.*\.b64$/.test(name))
    .sort();
  if (!parts.length) throw new Error(`No Brainlink runtime parts found in ${runtimeDir}`);
  const encoded = parts.map(name => fs.readFileSync(path.join(runtimeDir, name), 'utf8')).join('').replace(/\s+/g, '');
  const archive = Buffer.from(encoded, 'base64');
  const actual = sha256Buffer(archive);
  if (actual !== DEFAULTS.overlaySha256) {
    throw new Error(`Brainlink base overlay checksum mismatch. Expected ${DEFAULTS.overlaySha256}, got ${actual}.`);
  }
  fs.mkdirSync(workspaceRoot, { recursive: true });
  const archivePath = path.join(workspaceRoot, 'brainlink-runtime.tar.gz');
  fs.writeFileSync(archivePath, archive);
  return archivePath;
};

const assembleAppPatch = ({ sourceRoot, workspaceRoot }) => {
  const patchDir = path.join(sourceRoot, '.brainlink-patches');
  const parts = fs.readdirSync(patchDir)
    .filter(name => /^app-v2\.linepart.*\.patch$/.test(name))
    .sort();
  if (!parts.length) throw new Error(`No Brainlink app patch parts found in ${patchDir}`);
  const patchPath = path.join(workspaceRoot, 'brainlink-app-v2.patch');
  fs.writeFileSync(patchPath, parts.map(name => fs.readFileSync(path.join(patchDir, name), 'utf8')).join(''), 'utf8');
  return patchPath;
};

const copyOverrides = (sourceRoot, target) => {
  const overrides = path.join(sourceRoot, '.brainlink-runtime-overrides');
  if (!fs.existsSync(overrides)) return;
  for (const entry of fs.readdirSync(overrides, { withFileTypes: true })) {
    const source = path.join(overrides, entry.name);
    const destination = path.join(target, entry.name);
    fs.cpSync(source, destination, { recursive: true, force: true });
  }
};

const verifyManifest = ({ sourceRoot, target }) => {
  const manifest = path.join(sourceRoot, 'BRAINLINK_RUNTIME_V2.sha256');
  const manifestHash = sha256File(manifest);
  if (manifestHash !== DEFAULTS.manifestSha256) {
    throw new Error(`Brainlink manifest checksum mismatch. Expected ${DEFAULTS.manifestSha256}, got ${manifestHash}.`);
  }
  for (const line of fs.readFileSync(manifest, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match = /^([0-9a-f]{64})\s+(.+)$/.exec(line);
    if (!match) throw new Error(`Invalid Brainlink manifest line: ${line}`);
    const [, expected, relative] = match;
    const candidate = path.join(target, ...relative.split('/'));
    if (!fs.existsSync(candidate)) throw new Error(`Missing Brainlink runtime file: ${relative}`);
    const actual = sha256File(candidate);
    if (actual !== expected) {
      throw new Error(`Brainlink runtime checksum mismatch for ${relative}. Expected ${expected}, got ${actual}.`);
    }
  }
};

const cleanYarnInstallState = target => {
  for (const item of ['node_modules', '.pnp.cjs', '.pnp.loader.mjs', path.join('.yarn', 'install-state.gz')]) {
    fs.rmSync(path.join(target, item), { recursive: true, force: true });
  }
};

const runYarn = async ({ target, node, args, env, attempts = 1 }) => {
  const yarn = path.join(target, '.yarn', 'releases', 'yarn-4.13.0.cjs');
  if (!fs.existsSync(yarn)) throw new Error(`Pinned Yarn runtime is missing: ${yarn}`);
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return run(node, [yarn, ...args], { cwd: target, env });
    } catch (error) {
      lastError = error;
      console.error(`[BRAINLINK] yarn ${args.join(' ')} attempt ${attempt}/${attempts} failed: ${error.message}`);
      if (attempt < attempts) {
        if (args[0] === 'install') {
          console.warn('[BRAINLINK] Cleaning only generated Yarn install state before retry; source and user data are preserved.');
          cleanYarnInstallState(target);
        }
        await sleep(attempt * 3000);
      }
    }
  }
  throw lastError;
};

export const materializeBrainlink = async options => {
  const sourceRoot = path.resolve(options.sourceRoot ?? defaultSourceRoot);
  const workspaceRoot = path.resolve(options.workspaceRoot ?? path.join(sourceRoot, '.brainlink-workspace'));
  const target = path.join(workspaceRoot, 'AFFiNE');
  const quarantineRoot = path.resolve(options.quarantineRoot ?? path.join(workspaceRoot, 'quarantine'));
  const git = options.git ?? process.env.BRAINLINK_GIT ?? 'git';
  const node = options.node ?? process.execPath;

  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major !== 22 || minor < 12) {
    throw new Error(`Brainlink requires Node >=22.12.0 <23.0.0; current runtime is ${process.versions.node}.`);
  }

  const manifest = path.join(sourceRoot, 'BRAINLINK_RUNTIME_V2.sha256');
  const auditTransform = path.join(sourceRoot, 'scripts', 'apply-audit-v21.mjs');
  if (!fs.existsSync(manifest)) throw new Error(`Missing Brainlink manifest: ${manifest}`);
  if (!fs.existsSync(auditTransform)) throw new Error(`Missing deterministic audit transform: ${auditTransform}`);
  if (fs.existsSync(path.join(sourceRoot, '.brainlink-runtime-overrides', 'package.json'))) {
    throw new Error('Unsafe lockfile-drifting package.json override is present. Stable materialization is blocked.');
  }

  const archivePath = reconstructBaseOverlay({ sourceRoot, workspaceRoot });
  const appPatch = assembleAppPatch({ sourceRoot, workspaceRoot });
  await ensureUpstreamWorkspace({ git, target, quarantineRoot });

  const tar = findTar(git);
  run(tar, ['-xzf', archivePath, '-C', target]);
  copyOverrides(sourceRoot, target);

  // The historical overlay contained a root package manifest from a different
  // dependency snapshot. Restore every lock-sensitive upstream file before
  // adding Brainlink scripts so `yarn install --immutable` is genuinely valid.
  run(git, ['-C', target, 'checkout', '--',
    'package.json', 'yarn.lock', '.yarnrc.yml', '.yarn/releases/yarn-4.13.0.cjs']);
  run(git, ['-C', target, 'apply', '--whitespace=nowarn', appPatch]);

  // The historical audit patch transport has an invalid final hunk count and
  // is preserved only as provenance. The executable path applies the same
  // six source changes through exact anchors and requires the published final
  // app.tsx SHA-256 before continuing.
  applyAuditV21(target);

  patchBrainlinkPackage(target);
  verifyManifest({ sourceRoot, target });

  const runtimeEnv = {
    ...process.env,
    NPM_TOKEN: process.env.NPM_TOKEN || 'NONE',
    YARN_HTTP_TIMEOUT: process.env.YARN_HTTP_TIMEOUT || '600000',
    YARN_HTTP_RETRY: process.env.YARN_HTTP_RETRY || '5',
    YARN_ENABLE_HARDENED_MODE: '0',
  };

  if (options.install) {
    await runYarn({ target, node, args: ['install', '--immutable'], env: runtimeEnv, attempts: 2 });
    await runYarn({ target, node, args: ['brainlink:validate'], env: runtimeEnv });
    await runYarn({ target, node, args: ['brainlink:test'], env: runtimeEnv });
  } else {
    run(node, [path.join(target, 'scripts', 'brainlink-validate.mjs')], { cwd: target, env: runtimeEnv });
  }

  const evidence = {
    status: 'verified',
    sourceRoot,
    target,
    upstreamCommit: DEFAULTS.upstreamCommit,
    runtimeRelease: 'v2.1',
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    manifestSha256: sha256File(manifest),
    packageJsonSha256: sha256File(path.join(target, 'package.json')),
    appSha256: sha256File(path.join(target, 'packages', 'frontend', 'core', 'src', 'brainlink', 'app.tsx')),
    verifiedAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.join(workspaceRoot, 'evidence'), { recursive: true });
  fs.writeFileSync(
    path.join(workspaceRoot, 'evidence', 'last-materialization.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
    'utf8'
  );
  console.log(`[BRAINLINK] Stable runtime materialized and verified at ${target}`);
  return { ...evidence, workspaceRoot };
};

const parseCli = argv => {
  const options = { install: argv.includes('--install') };
  const value = name => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  options.sourceRoot = value('--source-root');
  options.workspaceRoot = value('--workspace-root');
  options.quarantineRoot = value('--quarantine-root');
  options.git = value('--git');
  return options;
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  materializeBrainlink(parseCli(process.argv.slice(2))).catch(error => {
    console.error(`[BRAINLINK] MATERIALIZATION FAILED: ${error.stack ?? error.message}`);
    process.exit(1);
  });
}
