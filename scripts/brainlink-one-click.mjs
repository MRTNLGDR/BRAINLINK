import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { materializeBrainlink } from './brainlink-materialize.mjs';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const bootstrapSourceRoot = path.resolve(moduleDir, '..');
const args = process.argv.slice(2);
const flags = new Set(args.filter(value => value.startsWith('--')));
const has = flag => flags.has(flag);
const valueOf = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const isWindows = process.platform === 'win32';
const defaultHome = process.env.BRAINLINK_HOME ||
  (isWindows && fs.existsSync('D:\\')
    ? 'D:\\AIIA\\01-apps-canonicos\\26-Brainlink'
    : path.join(process.env.LOCALAPPDATA || os.homedir(), 'Brainlink'));
const home = path.resolve(valueOf('--home', defaultHome));
const sourceRoot = path.join(home, 'source');
const workspaceRoot = path.join(home, 'workspace');
const stateRoot = path.join(home, 'state');
const logRoot = path.join(home, 'logs');
const quarantineRoot = path.join(home, 'quarantine');
const git = process.env.BRAINLINK_GIT || valueOf('--git', 'git');
const managedStage = has('--managed-stage');
const ci = has('--ci') || process.env.CI === 'true';
const noLaunch = has('--no-launch') || ci;
const setupOnly = has('--setup-only');
const buildOnly = has('--build-only');
const devMode = has('--dev');
const force = has('--force');
const offline = has('--offline');
const skipUpdate = has('--skip-update');
const port = Number(valueOf('--port', process.env.BRAINLINK_PORT || '8080'));
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error(`Invalid Brainlink port: ${port}`);
if (devMode && port !== 8080) throw new Error('AFFiNE development server is pinned to port 8080; omit --port when using --dev.');

for (const directory of [home, stateRoot, logRoot, quarantineRoot]) {
  fs.mkdirSync(directory, { recursive: true });
}

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logRoot, `brainlink-${runId}.log`);
const appendLog = message => fs.appendFileSync(logFile, `${message}\n`, 'utf8');
const log = message => {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  appendLog(line);
};
const fail = message => {
  const line = `[${new Date().toISOString()}] ERROR ${message}`;
  console.error(line);
  appendLog(line);
};

const quoteCommand = (command, commandArgs) =>
  [command, ...commandArgs].map(value => (String(value).includes(' ') ? JSON.stringify(String(value)) : String(value))).join(' ');

const run = (command, commandArgs, options = {}) => {
  log(`> ${quoteCommand(command, commandArgs)}`);
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    windowsHide: false,
  });
  if (result.error) throw result.error;
  if (options.capture) {
    if (result.stdout) appendLog(result.stdout.trimEnd());
    if (result.stderr) appendLog(result.stderr.trimEnd());
  }
  if (result.status !== 0) {
    throw new Error(`${quoteCommand(command, commandArgs)} failed with exit code ${result.status}.`);
  }
  return options.capture ? String(result.stdout ?? '').trim() : '';
};

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const retry = async (label, attempts, action) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action(attempt);
    } catch (error) {
      lastError = error;
      fail(`${label} attempt ${attempt}/${attempts}: ${error.message}`);
      if (attempt < attempts) await sleep(attempt * 3000);
    }
  }
  throw lastError;
};

const gitOutput = (commandArgs, cwd) => run(git, commandArgs, { cwd, capture: true });
const repoUrl = 'https://github.com/MRTNLGDR/BRAINLINK.git';

const quarantine = item => {
  if (!fs.existsSync(item)) return;
  const destination = path.join(quarantineRoot, `${path.basename(item)}-${runId}`);
  fs.renameSync(item, destination);
  log(`Preserved invalid managed source at ${destination}`);
};

const ensureManagedSource = async () => {
  if (fs.existsSync(sourceRoot) && !fs.existsSync(path.join(sourceRoot, '.git'))) quarantine(sourceRoot);
  if (!fs.existsSync(path.join(sourceRoot, '.git'))) {
    fs.mkdirSync(path.dirname(sourceRoot), { recursive: true });
    await retry('Brainlink source clone', 3, () =>
      run(git, ['-c', 'core.longpaths=true', '-c', 'core.symlinks=true', '-c', 'core.autocrlf=false', 'clone', '--depth', '1', '--single-branch', '--branch', 'main', repoUrl, sourceRoot])
    );
  }

  const remote = gitOutput(['-C', sourceRoot, 'remote', 'get-url', 'origin']);
  if (remote.replace(/\/$/, '') !== repoUrl.replace(/\/$/, '')) {
    quarantine(sourceRoot);
    return ensureManagedSource();
  }

  run(git, ['-C', sourceRoot, 'config', 'core.longpaths', 'true']);
  run(git, ['-C', sourceRoot, 'config', 'core.symlinks', 'true']);
  run(git, ['-C', sourceRoot, 'config', 'core.autocrlf', 'false']);

  if (!skipUpdate && !offline) {
    try {
      await retry('Brainlink source update', 3, () =>
        run(git, ['-C', sourceRoot, 'fetch', '--prune', 'origin', 'main'])
      );
      run(git, ['-C', sourceRoot, 'reset', '--hard', 'origin/main']);
      run(git, ['-C', sourceRoot, 'clean', '-fdx']);
    } catch (error) {
      if (!fs.existsSync(path.join(sourceRoot, 'scripts', 'brainlink-one-click.mjs'))) throw error;
      log(`Update unavailable; continuing with the last verified managed source: ${error.message}`);
    }
  }

  const head = gitOutput(['-C', sourceRoot, 'rev-parse', 'HEAD']);
  fs.writeFileSync(path.join(stateRoot, 'source-head.txt'), `${head}\n`, 'utf8');
  log(`Managed Brainlink source: ${head}`);
};

const reenterManagedSource = () => {
  const updatedScript = path.join(sourceRoot, 'scripts', 'brainlink-one-click.mjs');
  if (!fs.existsSync(updatedScript)) throw new Error(`Updated Brainlink entrypoint is missing: ${updatedScript}`);
  const forwarded = args.filter(value => value !== '--managed-stage');
  const result = spawnSync(process.execPath, [updatedScript, '--managed-stage', ...forwarded], {
    cwd: sourceRoot,
    env: { ...process.env, BRAINLINK_HOME: home, BRAINLINK_GIT: git, BRAINLINK_SOURCE_ROOT: sourceRoot },
    stdio: 'inherit',
    windowsHide: false,
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
};

const acquireLock = () => {
  const lockPath = path.join(stateRoot, 'installer.lock');
  if (fs.existsSync(lockPath)) {
    const previousPid = Number(fs.readFileSync(lockPath, 'utf8').trim());
    let alive = false;
    if (Number.isInteger(previousPid) && previousPid > 0) {
      try { process.kill(previousPid, 0); alive = true; } catch { alive = false; }
    }
    if (alive) throw new Error(`Another Brainlink installer is already running (PID ${previousPid}).`);
    fs.rmSync(lockPath, { force: true });
  }
  fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
  const release = () => fs.rmSync(lockPath, { force: true });
  process.on('exit', release);
  process.on('SIGINT', () => { release(); process.exit(130); });
  process.on('SIGTERM', () => { release(); process.exit(143); });
  return release;
};

const sha256File = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const runYarn = (target, yarnArgs, env = process.env) => {
  const yarn = path.join(target, '.yarn', 'releases', 'yarn-4.13.0.cjs');
  return run(process.execPath, [yarn, ...yarnArgs], { cwd: target, env });
};

const runBuildWithRecovery = (target, env) => {
  try {
    runYarn(target, ['brainlink:build'], env);
  } catch (firstError) {
    log(`First production build failed; removing only generated web output and retrying once: ${firstError.message}`);
    for (const generated of [
      path.join(target, 'packages', 'frontend', 'apps', 'web', 'dist'),
      path.join(target, 'packages', 'frontend', 'apps', 'web', '.webpack'),
    ]) fs.rmSync(generated, { recursive: true, force: true });
    runYarn(target, ['brainlink:build'], env);
  }
};

const buildFingerprint = (target, managedSource) => {
  const hash = crypto.createHash('sha256');
  for (const value of [
    gitOutput(['-C', managedSource, 'rev-parse', 'HEAD']),
    sha256File(path.join(managedSource, 'BRAINLINK_RUNTIME_V2.sha256')),
    sha256File(path.join(target, 'package.json')),
    process.version,
    process.platform,
    process.arch,
  ]) hash.update(`${value}\n`);
  return hash.digest('hex');
};

const findWebDist = target => {
  const candidates = [
    path.join(target, 'packages', 'frontend', 'apps', 'web', 'dist'),
    path.join(target, 'packages', 'frontend', 'apps', 'web', '.webpack'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) return candidate;
  }
  const packageRoot = path.join(target, 'packages', 'frontend', 'apps', 'web');
  if (fs.existsSync(packageRoot)) {
    const queue = [packageRoot];
    while (queue.length) {
      const current = queue.shift();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const item = path.join(current, entry.name);
        if (entry.isDirectory() && !['node_modules', '.git'].includes(entry.name)) queue.push(item);
        if (entry.isFile() && entry.name === 'index.html') return current;
      }
    }
  }
  throw new Error('AFFiNE web build completed without a discoverable index.html output.');
};

const stopPreviousServer = () => {
  const pidPath = path.join(stateRoot, 'server.pid');
  if (!fs.existsSync(pidPath)) return;
  const pid = Number(fs.readFileSync(pidPath, 'utf8').trim());
  if (Number.isInteger(pid) && pid > 0) {
    try {
      if (isWindows) run('taskkill.exe', ['/PID', String(pid), '/T', '/F']);
      else process.kill(pid, 'SIGTERM');
    } catch (error) {
      log(`Previous server PID ${pid} was not active: ${error.message}`);
    }
  }
  fs.rmSync(pidPath, { force: true });
};

const requestStatus = url => new Promise(resolve => {
  const request = http.get(url, response => {
    response.resume();
    resolve(response.statusCode ?? 0);
  });
  request.setTimeout(3000, () => { request.destroy(); resolve(0); });
  request.on('error', () => resolve(0));
});

const waitForHttp = async (url, seconds) => {
  for (let attempt = 0; attempt < seconds; attempt += 1) {
    if ((await requestStatus(url)) === 200) return;
    await sleep(1000);
  }
  throw new Error(`Brainlink did not become healthy at ${url} within ${seconds}s.`);
};

const startStaticServer = async (dist, managedSource) => {
  stopPreviousServer();
  const stdout = fs.openSync(path.join(logRoot, 'server.out.log'), 'a');
  const stderr = fs.openSync(path.join(logRoot, 'server.err.log'), 'a');
  const serverScript = path.join(managedSource, 'scripts', 'brainlink-serve.mjs');
  const child = spawn(process.execPath, [serverScript, '--root', dist, '--port', String(port)], {
    cwd: dist,
    env: process.env,
    detached: !ci,
    stdio: ['ignore', stdout, stderr],
    windowsHide: true,
  });
  child.on('error', error => fail(`Server process error: ${error.message}`));
  fs.writeFileSync(path.join(stateRoot, 'server.pid'), `${child.pid}\n`, 'utf8');
  if (!ci) child.unref();
  await waitForHttp(`http://127.0.0.1:${port}/healthz`, 120);
  await waitForHttp(`http://127.0.0.1:${port}/brainlink`, 30);
  log(`Brainlink is healthy at http://127.0.0.1:${port}/brainlink (PID ${child.pid}).`);
  return child;
};

const runBrowserSmoke = (target, managedSource, url) => {
  const script = path.join(managedSource, 'scripts', 'brainlink-browser-smoke.mjs');
  const evidence = path.join(workspaceRoot, 'evidence', 'browser');
  run(process.execPath, [script, '--target', target, '--url', url, '--evidence', evidence], {
    cwd: target,
    env: process.env,
  });
  log(`Real browser smoke test passed for ${url}.`);
};

const openBrowser = url => {
  if (noLaunch) return;
  if (isWindows) {
    spawn('cmd.exe', ['/d', '/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
};

const main = async () => {
  log(`Brainlink one-click start. home=${home} node=${process.version} platform=${process.platform}-${process.arch}`);
  if (!managedStage) {
    await ensureManagedSource();
    reenterManagedSource();
    return;
  }

  const managedSource = path.resolve(process.env.BRAINLINK_SOURCE_ROOT || bootstrapSourceRoot);
  if (managedSource !== path.resolve(sourceRoot)) {
    throw new Error(`Managed-stage source mismatch. Expected ${sourceRoot}, got ${managedSource}.`);
  }

  const releaseLock = acquireLock();
  try {
    run(process.execPath, [path.join(managedSource, 'scripts', 'brainlink-installer-validate.mjs')], { cwd: managedSource });
    run(process.execPath, [path.join(managedSource, 'scripts', 'brainlink-nonbreakage-guard.mjs')], { cwd: managedSource });

    stopPreviousServer();
    const materialized = await materializeBrainlink({
      sourceRoot: managedSource,
      workspaceRoot,
      quarantineRoot,
      git,
      node: process.execPath,
      install: true,
    });
    const target = materialized.target;

    const maxMb = Math.max(4096, Math.min(16384, Math.floor(os.totalmem() / 1024 / 1024 * 0.7)));
    const runtimeEnv = {
      ...process.env,
      NODE_OPTIONS: `--max-old-space-size=${maxMb}`,
      NPM_TOKEN: process.env.NPM_TOKEN || 'NONE',
      YARN_HTTP_TIMEOUT: process.env.YARN_HTTP_TIMEOUT || '600000',
      YARN_HTTP_RETRY: process.env.YARN_HTTP_RETRY || '5',
      YARN_ENABLE_HARDENED_MODE: '0',
    };

    if (setupOnly) {
      log('Setup, integrity validation and Brainlink tests completed.');
      return;
    }

    if (devMode) {
      const stdout = fs.openSync(path.join(logRoot, 'dev.out.log'), 'a');
      const stderr = fs.openSync(path.join(logRoot, 'dev.err.log'), 'a');
      const yarn = path.join(target, '.yarn', 'releases', 'yarn-4.13.0.cjs');
      const child = spawn(process.execPath, [yarn, 'brainlink:dev'], {
        cwd: target,
        env: runtimeEnv,
        detached: !ci,
        stdio: ['ignore', stdout, stderr],
        windowsHide: true,
      });
      fs.writeFileSync(path.join(stateRoot, 'server.pid'), `${child.pid}\n`, 'utf8');
      if (!ci) child.unref();
      const devUrl = `http://127.0.0.1:${port}/brainlink`;
      await waitForHttp(devUrl, 240);
      runBrowserSmoke(target, managedSource, devUrl);
      openBrowser(devUrl);
      if (ci) {
        if (isWindows) run('taskkill.exe', ['/PID', String(child.pid), '/T', '/F']);
        else child.kill('SIGTERM');
      }
      return;
    }

    const fingerprint = buildFingerprint(target, managedSource);
    const buildStampPath = path.join(stateRoot, 'web-build.json');
    let previousFingerprint;
    if (fs.existsSync(buildStampPath)) {
      try { previousFingerprint = JSON.parse(fs.readFileSync(buildStampPath, 'utf8')).fingerprint; } catch { previousFingerprint = undefined; }
    }

    let dist;
    if (!force && previousFingerprint === fingerprint) {
      try {
        dist = findWebDist(target);
        log(`Reusing previously verified web build ${fingerprint}.`);
      } catch {
        dist = undefined;
      }
    }
    if (!dist) {
      runBuildWithRecovery(target, runtimeEnv);
      dist = findWebDist(target);
      fs.writeFileSync(buildStampPath, `${JSON.stringify({ fingerprint, dist, verifiedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
      log(`Production web build verified: ${dist}`);
    }

    if (buildOnly) return;
    const server = await startStaticServer(dist, managedSource);
    const appUrl = `http://127.0.0.1:${port}/brainlink`;
    runBrowserSmoke(target, managedSource, appUrl);
    openBrowser(appUrl);
    if (ci) {
      if (isWindows) run('taskkill.exe', ['/PID', String(server.pid), '/T', '/F']);
      else server.kill('SIGTERM');
      fs.rmSync(path.join(stateRoot, 'server.pid'), { force: true });
      log('CI server health test completed and server stopped.');
    }
  } finally {
    releaseLock();
  }
};

main().catch(error => {
  fail(error.stack ?? error.message);
  console.error(`\n[BRAINLINK] Falha. Log completo: ${logFile}`);
  process.exit(1);
});
