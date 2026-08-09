import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_FILE = 'packages/frontend/core/src/brainlink/app.tsx';
const ROUTER_FILE = 'packages/frontend/core/src/desktop/workbench-router.ts';
const SIDEBAR_FILE = 'packages/frontend/core/src/components/root-app-sidebar/index.tsx';
const PAGE_FILE = 'packages/frontend/core/src/desktop/pages/workspace/brainlink/index.tsx';
const SHELL_START =
  "  const navigationScreens = BRAINLINK_SCREENS.filter(item => mobileSurface ? item.area === 'MOBILE' : item.area !== 'MOBILE');";
const UI_MARKER = 'data-ui="brainlink-workspace-native"';
const STYLE_MARKER = '/* BRAINLINK_NATIVE_WORKSPACE_SHELL */';

const NATIVE_STYLES = String.raw`
  /* BRAINLINK_NATIVE_WORKSPACE_SHELL */
  .bl-native-shell, .bl-native-shell * { box-sizing: border-box; }
  .bl-native-shell {
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: auto;
    color: var(--bl-text);
    background: var(--bl-bg);
    font-family: var(--affine-font-family, "IBM Plex Sans", "Segoe UI", sans-serif);
    scrollbar-width: thin;
  }
  .bl-native-toolbar {
    min-height: 54px;
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 8px 18px;
    background: color-mix(in srgb, var(--bl-bg) 94%, transparent);
    border-bottom: 1px solid var(--bl-line);
    backdrop-filter: blur(16px);
  }
  .bl-native-identity { min-width: 180px; display: flex; align-items: center; gap: 9px; }
  .bl-native-identity .bl-product-mark { width: 24px; height: 24px; }
  .bl-native-identity-copy { min-width: 0; }
  .bl-native-identity-copy strong { display: block; color: var(--bl-text); font-size: 12px; font-weight: 650; line-height: 1.2; }
  .bl-native-identity-copy small { display: block; overflow: hidden; margin-top: 2px; color: var(--bl-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
  .bl-native-tabs { min-width: 0; display: flex; align-items: center; gap: 2px; overflow-x: auto; scrollbar-width: none; }
  .bl-native-tabs::-webkit-scrollbar { display: none; }
  .bl-native-tab, .bl-native-more > summary {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    padding: 6px 9px;
    color: var(--bl-muted);
    background: transparent;
    border: 0;
    border-radius: 6px;
    font: inherit;
    font-size: 11px;
    white-space: nowrap;
    cursor: pointer;
  }
  .bl-native-tab:hover, .bl-native-more > summary:hover { color: var(--bl-text-secondary); background: var(--bl-hover); }
  .bl-native-tab[data-active="true"] { color: var(--bl-text); background: var(--bl-active); }
  .bl-native-more { position: relative; }
  .bl-native-more > summary { list-style: none; }
  .bl-native-more > summary::-webkit-details-marker { display: none; }
  .bl-native-more[open] > summary { color: var(--bl-text); background: var(--bl-active); }
  .bl-native-module-panel {
    width: min(680px, calc(100vw - 300px));
    max-height: min(560px, calc(100vh - 100px));
    position: absolute;
    top: 38px;
    left: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    overflow: auto;
    padding: 14px;
    background: var(--bl-surface-raised);
    border: 1px solid var(--bl-line);
    border-radius: 10px;
    box-shadow: 0 18px 54px rgba(0,0,0,.45);
  }
  .bl-native-module-group h3 { margin: 0 0 6px; padding: 0 6px; color: var(--bl-muted); font-size: 9px; font-weight: 650; letter-spacing: .08em; text-transform: uppercase; }
  .bl-native-module-list { display: grid; gap: 2px; }
  .bl-native-module-button {
    width: 100%;
    min-height: 36px;
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 6px;
    color: var(--bl-text-secondary);
    background: transparent;
    border: 0;
    border-radius: 7px;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .bl-native-module-button:hover, .bl-native-module-button[data-active="true"] { color: var(--bl-text); background: var(--bl-active); }
  .bl-native-module-button .bl-nav-glyph { width: 22px; height: 22px; }
  .bl-native-module-copy { min-width: 0; }
  .bl-native-module-copy strong { display: block; overflow: hidden; font-size: 10px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .bl-native-module-copy small { display: block; overflow: hidden; margin-top: 2px; color: var(--bl-muted); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
  .bl-native-actions { min-width: 250px; margin-left: auto; display: flex; align-items: center; justify-content: flex-end; gap: 7px; }
  .bl-native-search { width: min(260px, 26vw); }
  .bl-native-search input { height: 32px; }
  .bl-native-search .bl-search-results { top: 37px; }
  .bl-native-shell .bl-content { min-height: calc(100% - 54px); padding-top: 28px; }
  .bl-native-shell .bl-heading { margin-bottom: 20px; }
  @media (max-width: 1020px) {
    .bl-native-identity { min-width: auto; }
    .bl-native-identity-copy small { display: none; }
    .bl-native-actions { min-width: 0; }
    .bl-native-search { display: none; }
  }
  @media (max-width: 720px) {
    .bl-native-toolbar { align-items: flex-start; flex-wrap: wrap; gap: 6px; padding: 8px 10px; }
    .bl-native-identity { flex: 1; }
    .bl-native-tabs { order: 3; width: 100%; }
    .bl-native-actions { margin-left: 0; }
    .bl-native-module-panel { width: calc(100vw - 28px); grid-template-columns: 1fr; }
    .bl-native-shell .bl-content { padding: 22px 12px 36px; }
  }
`;

const NATIVE_SHELL = String.raw`  const navigationScreens = BRAINLINK_SCREENS.filter(item => mobileSurface ? item.area === 'MOBILE' : item.area !== 'MOBILE');
  const operationSlugs = new Set(['organization', 'projects', 'company', 'budget', 'people', 'roadmap', 'tasks']);
  const knowledgeSlugs = new Set(['life', 'ideas', 'world', 'documents', 'canvas', 'calendar']);
  const governanceSlugs = new Set(['brains', 'universalis', 'workers', 'governance', 'bug-book', 'archetypes']);
  const moduleGroups = [
    { label: 'Operation', items: navigationScreens.filter(item => operationSlugs.has(item.slug)) },
    { label: 'Knowledge', items: navigationScreens.filter(item => knowledgeSlugs.has(item.slug)) },
    { label: 'Governance', items: navigationScreens.filter(item => governanceSlugs.has(item.slug)) },
    { label: 'System', items: navigationScreens.filter(item => !operationSlugs.has(item.slug) && !knowledgeSlugs.has(item.slug) && !governanceSlugs.has(item.slug)) },
  ].filter(group => group.items.length > 0);
  const quickNavigation = mobileSurface
    ? [
        { label: 'Projects', slug: 'projects' },
        { label: 'Tasks', slug: 'tasks' },
        { label: 'Workers', slug: 'workers' },
        { label: 'Evidence', slug: 'evidence' },
      ]
    : [
        { label: 'Home', slug: 'organization' },
        { label: 'Life', slug: 'life' },
        { label: 'Ideas', slug: 'ideas' },
        { label: 'Projects', slug: 'projects' },
        { label: 'Company', slug: 'company' },
        { label: 'Budget', slug: 'budget' },
        { label: 'Brains', slug: 'brains' },
      ];

  const renderModuleItems = (items: typeof navigationScreens) => items.map(item => (
    <button className="bl-native-module-button" key={item.id} data-active={rawSlug === item.slug} onClick={() => navigateTo(item.slug)} title={item.description}>
      <span className="bl-nav-glyph" aria-hidden="true">{item.label.charAt(0)}</span>
      <span className="bl-native-module-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
    </button>
  ));

  return <>
    <style>{styles}</style>
    <div className="bl-native-shell" data-ui="brainlink-workspace-native">
      <header className="bl-native-toolbar">
        <div className="bl-native-identity">
          <span className="bl-product-mark">BL</span>
          <span className="bl-native-identity-copy"><strong>Brainlink</strong><small>{title}</small></span>
        </div>
        <nav className="bl-native-tabs" aria-label="Brainlink workspace navigation">
          {quickNavigation.map(item => <button className="bl-native-tab" key={item.slug} data-active={rawSlug === item.slug} onClick={() => navigateTo(item.slug)}>{item.label}</button>)}
          <details className="bl-native-more">
            <summary>All modules</summary>
            <div className="bl-native-module-panel">
              {moduleGroups.map(group => <section className="bl-native-module-group" key={group.label}><h3>{group.label}</h3><div className="bl-native-module-list">{renderModuleItems(group.items)}</div></section>)}
            </div>
          </details>
        </nav>
        <div className="bl-native-actions">
          <div className="bl-search bl-native-search">
            <input data-brainlink-search value={search} onChange={event => setSearch(event.target.value)} placeholder="Search Brainlink" aria-label="Search Brainlink" />
            <span className="bl-kbd">Ctrl K</span>
            {search.trim() ? <div className="bl-search-results">{searchResults.length ? searchResults.map(result => <button key={result.path + '-' + result.label} onClick={() => { navigatePath(result.path); setSearch(''); }}>{result.label}<small>{result.detail}</small></button>) : <div className="bl-empty">No results.</div>}</div> : null}
          </div>
          <button className="bl-icon-btn" onClick={exportState}>Export</button>
        </div>
      </header>

      <div className="bl-content">
        <div className="bl-heading">
          <div>
            <div className="bl-eyebrow"><span className="bl-eyebrow-dot" />{mobileSurface ? 'Mobile workspace' : screen?.area === 'SUPERADMIN' ? 'System administration' : 'Brainlink workspace'}</div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="bl-actions"><Badge tone="good">Local-first</Badge><Badge>{state.projects.length} projects</Badge><Badge>{state.tasks.length} tasks</Badge></div>
        </div>
        {renderContent()}
      </div>
    </div>
    {toast ? <div className="bl-toast">{toast}</div> : null}
  </>;`;

const writeIfChanged = (file, content) => {
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (current !== content) fs.writeFileSync(file, content, 'utf8');
};

const patchApp = targetRoot => {
  const file = path.join(targetRoot, ...APP_FILE.split('/'));
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(
    'export const BrainlinkApp = () => {',
    'export const BrainlinkApp = ({ navigateInWorkspace }: { navigateInWorkspace?: (path: string) => void } = {}) => {'
  );
  source = source.replace(
    "  const navigateTo = (slug: string) => navigate(`${base}/${slug}`);",
    "  const navigatePath = (target: string) => navigateInWorkspace ? navigateInWorkspace(target) : navigate(target);\n  const navigateTo = (slug: string) => navigatePath(`${base}/${slug}`);"
  );
  source = source.replaceAll(
    "onClick={() => { navigate(result.path); setSearch(''); }}",
    "onClick={() => { navigatePath(result.path); setSearch(''); }}"
  );
  if (!source.includes(STYLE_MARKER)) {
    const animationAnchor = '  @keyframes bl-page-in';
    if (!source.includes(animationAnchor)) throw new Error('Brainlink native shell style anchor is missing.');
    source = source.replace(animationAnchor, `${NATIVE_STYLES}\n${animationAnchor}`);
  }
  source = source.replace('  :root {', '  .bl-shell, .bl-native-shell {');
  const shellStart = source.indexOf(SHELL_START);
  const componentEnd = source.lastIndexOf('\n};');
  if (shellStart < 0 || componentEnd <= shellStart) throw new Error('Brainlink native shell component anchors are invalid.');
  source = source.slice(0, shellStart) + NATIVE_SHELL + source.slice(componentEnd);
  writeIfChanged(file, source);
  return file;
};

const patchWorkbenchRouter = targetRoot => {
  const file = path.join(targetRoot, ...ROUTER_FILE.split('/'));
  let source = fs.readFileSync(file, 'utf8');
  if (!source.includes("path: '/brainlink/*'")) {
    const anchor = 'export const workbenchRoutes = [';
    if (!source.includes(anchor)) throw new Error('Workbench route list anchor is missing.');
    source = source.replace(anchor, `${anchor}\n  {\n    path: '/brainlink/*',\n    lazy: () => import('./pages/workspace/brainlink/index'),\n  },`);
    writeIfChanged(file, source);
  }
  const page = path.join(targetRoot, ...PAGE_FILE.split('/'));
  fs.mkdirSync(path.dirname(page), { recursive: true });
  writeIfChanged(page, "import { BrainlinkApp } from '../../../../brainlink/app';\nimport { WorkbenchService } from '../../../../modules/workbench';\nimport { useService } from '@toeverything/infra';\n\nexport const Component = () => {\n  const workbench = useService(WorkbenchService).workbench;\n  return <BrainlinkApp navigateInWorkspace={target => workbench.open(target)} />;\n};\n");
  return { file, page };
};

const patchRootSidebar = targetRoot => {
  const file = path.join(targetRoot, ...SIDEBAR_FILE.split('/'));
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace("import { useNavigate } from 'react-router-dom';\n", '');
  source = source.replace(/\n  const navigate = useNavigate\(\);/, '');
  source = source.replace(/\n        <MenuItem\s+data-testid="brainlink-governance-button"[\s\S]*?<\/MenuItem>/, '');
  if (!source.includes('const BrainlinkButton = () =>')) {
    const anchor = '/**\n * This is for the whole affine app sidebar.';
    if (!source.includes(anchor)) throw new Error('Root sidebar component anchor is missing.');
    const component = `const BrainlinkButton = () => {\n  const { workbenchService } = useServices({ WorkbenchService });\n  const active = useLiveData(\n    workbenchService.workbench.location$.selector(location =>\n      location.pathname.startsWith('/brainlink')\n    )\n  );\n\n  return (\n    <MenuLinkItem\n      icon={<AiOutlineIcon />}\n      active={active}\n      to={'/brainlink/governance'}\n    >\n      <span data-testid="brainlink-workspace-button">Brainlink</span>\n    </MenuLinkItem>\n  );\n};\n\n`;
    source = source.replace(anchor, component + anchor);
  }
  if (!source.includes('<BrainlinkButton />')) {
    const anchor = '        <AIChatButton />';
    if (!source.includes(anchor)) throw new Error('Root sidebar AI navigation anchor is missing.');
    source = source.replace(anchor, `${anchor}\n        <BrainlinkButton />`);
  }
  source = source.replace("to={'/brainlink/governance'}", "to={'/brainlink/organization'}");
  source = source.replace(/<span data-testid="ai-chat">[\s\S]*?<\/span>/, '<span data-testid="ai-chat">Brain</span>');
  writeIfChanged(file, source);
  return file;
};

export function applyBrainlinkWorkspaceShell({ targetRoot } = {}) {
  if (!targetRoot) throw new Error('targetRoot is required.');
  const target = path.resolve(targetRoot);
  const app = patchApp(target);
  const routes = patchWorkbenchRouter(target);
  const sidebar = patchRootSidebar(target);
  console.log('[BRAINLINK] Applied native workspace shell and navigation.');
  return { app, routes, sidebar };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) applyBrainlinkWorkspaceShell({ targetRoot: process.argv[2] ?? process.cwd() });
