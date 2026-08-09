import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PROJECTS_RENDERER = `  const renderProjects = () => {
    const addProject = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const name = String(data.get('name') || '').trim();
      if (!name) return;
      commit('PROJECT_CREATED', name, draft => draft.projects.unshift({
        id: createBrainlinkId('PRJ'),
        name,
        description: String(data.get('description') || '').trim(),
        health: 100,
        progress: 0,
        createdAt: new Date().toISOString(),
      }));
      event.currentTarget.reset();
    };
    return <div className="bl-grid">
      <Card title="Create project" span="12"><form className="bl-form" onSubmit={addProject}><div className="bl-field" data-span="4"><label>Name</label><input name="name" required /></div><div className="bl-field" data-span="6"><label>Description</label><input name="description" /></div><div className="bl-field"><label>&nbsp;</label><button className="bl-btn" data-primary="true">Create project</button></div></form></Card>
      {state.projects.map(project => { const tasks = state.tasks.filter(task => task.projectId === project.id); const progress = projectProgress(state, project.id); return <Card key={project.id} title={project.name} span="6"><p>{project.description || 'No description.'}</p><div className="bl-meta"><Badge tone={project.health >= 75 ? 'good' : project.health >= 50 ? 'warn' : 'bad'}>health {project.health}</Badge><Badge>{progress}%</Badge><Badge>{tasks.length} tasks</Badge></div><div className="bl-progress"><span style={{ width: progress + '%' }} /></div><div className="bl-actions" style={{ marginTop: 12 }}><button className="bl-btn" data-primary="true" onClick={() => navigate(base + '/projects/' + project.id)}>Open project</button></div></Card>; })}
      {state.projects.length === 0 ? <Card span="12"><div className="bl-empty">No projects. Create the first governed project above.</div></Card> : null}
    </div>;
  };`;

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
  if (!app.includes('const renderDashboard = () => <GovernancePanel />;')) {
    const dashboardStart = app.indexOf('  const renderDashboard = () =>');
    const nextRenderer = app.indexOf('\n\n  const renderProjects =', dashboardStart);
    if (dashboardStart < 0 || nextRenderer < 0) throw new Error('Nao foi possivel isolar renderDashboard sem atingir renderProjects.');
    app = `${app.slice(0, dashboardStart)}  const renderDashboard = () => <GovernancePanel />;${app.slice(nextRenderer)}`;
  }
  if (!app.includes('  const renderProjects = () =>')) {
    const dashboard = '  const renderDashboard = () => <GovernancePanel />;';
    if (!app.includes(dashboard)) throw new Error('Nao foi possivel restaurar renderProjects: dashboard ausente.');
    app = app.replace(dashboard, `${dashboard}\n\n${PROJECTS_RENDERER}`);
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
