import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function copy(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function patchOnce(content, marker, replacement, label) {
  if (content.includes(replacement)) return content;
  if (!content.includes(marker)) throw new Error(`Nao foi possivel aplicar ${label}: ancora ausente.`);
  return content.replace(marker, replacement);
}

export function applyAffineGovernanceBridge({ sourceRoot = scriptRoot, targetRoot } = {}) {
  if (!targetRoot) throw new Error('targetRoot e obrigatorio.');
  const runtimeRoot = path.join(sourceRoot, 'brainlink-runtime', 'governance');
  const appRoot = path.join(targetRoot, 'packages', 'frontend', 'core', 'src', 'brainlink');
  for (const file of ['governance-types.ts', 'governance-service.ts', 'governance-panel.tsx', 'governance-panel.css']) {
    copy(path.join(runtimeRoot, file), path.join(appRoot, file));
  }
  copy(path.join(runtimeRoot, 'brainlink-governance-dev.ts'), path.join(targetRoot, 'tools', 'cli', 'src', 'brainlink-governance-dev.ts'));

  const pointerPath = path.join(targetRoot, '.brainlink-runtime', 'governance-source.json');
  fs.mkdirSync(path.dirname(pointerPath), { recursive: true });
  fs.writeFileSync(pointerPath, `${JSON.stringify({ snapshotFile: path.join(sourceRoot, 'governance', 'governance-snapshot.json') }, null, 2)}\n`);

  const appFile = path.join(appRoot, 'app.tsx');
  let app = fs.readFileSync(appFile, 'utf8');
  app = patchOnce(app, "import {", "import { GovernancePanel } from './governance-panel';\n\nimport {", 'import do painel');
  const dashboardPattern = /  const renderDashboard = \(\) =>[\s\S]*?\n\n  const renderWorld =/;
  if (!app.includes('const renderDashboard = () => <GovernancePanel />;')) {
    if (!dashboardPattern.test(app)) throw new Error('Nao foi possivel localizar renderDashboard.');
    app = app.replace(dashboardPattern, '  const renderDashboard = () => <GovernancePanel />;\n\n  const renderWorld =');
  }
  fs.writeFileSync(appFile, app);

  const bundleFile = path.join(targetRoot, 'tools', 'cli', 'src', 'bundle-shared.ts');
  let bundle = fs.readFileSync(bundleFile, 'utf8');
  bundle = patchOnce(bundle, "import ", "import { createBrainlinkGovernanceDevMiddleware } from './brainlink-governance-dev';\n\nimport ", 'import do middleware');
  bundle = patchOnce(bundle, '  setupExitSignals: true,', '  setupExitSignals: true,\n  setupMiddlewares: createBrainlinkGovernanceDevMiddleware(),', 'middleware de desenvolvimento');
  fs.writeFileSync(bundleFile, bundle);

  const corePackageFile = path.join(targetRoot, 'packages', 'frontend', 'core', 'package.json');
  const corePackage = JSON.parse(fs.readFileSync(corePackageFile, 'utf8'));
  corePackage.dependencies['@tanstack/react-query'] = '^5.90.16';
  corePackage.dependencies = Object.fromEntries(Object.entries(corePackage.dependencies).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(corePackageFile, `${JSON.stringify(corePackage, null, 2)}\n`);

  return { appFile, bundleFile, pointerPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const targetRoot = process.argv[2];
  const result = applyAffineGovernanceBridge({ targetRoot: path.resolve(targetRoot) });
  console.log(JSON.stringify(result));
}
