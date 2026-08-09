import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_FILE = path.join(
  'packages',
  'frontend',
  'core',
  'src',
  'brainlink',
  'app.tsx'
);

const STYLE_START = 'const styles = `';
const STYLE_END = '`;\n\nconst cloneState';
const SHELL_START =
  "  const navigationScreens = BRAINLINK_SCREENS.filter(item => mobileSurface ? item.area === 'MOBILE' : item.area !== 'MOBILE');";

const AFFINE_STYLES = String.raw`
  :root {
    color-scheme: dark;
    --bl-bg: #121212;
    --bl-sidebar: #151515;
    --bl-surface: #191919;
    --bl-surface-raised: #202020;
    --bl-active: #2a2a2a;
    --bl-hover: #242424;
    --bl-line: #303030;
    --bl-line-soft: #242424;
    --bl-text: #f2f2f2;
    --bl-text-secondary: #b6b6b6;
    --bl-muted: #818181;
    --bl-accent: #71cbb4;
    --bl-accent-soft: rgba(113, 203, 180, .12);
    --bl-good: #77cfaa;
    --bl-warn: #e3b86b;
    --bl-bad: #ee8585;
  }
  .bl-shell, .bl-shell * { box-sizing: border-box; }
  .bl-shell {
    min-height: 100vh;
    background: var(--bl-bg);
    color: var(--bl-text);
    font-family: var(--affine-font-family, "IBM Plex Sans", "Segoe UI", sans-serif);
    display: grid;
    grid-template-columns: 248px minmax(0, 1fr);
    letter-spacing: -.01em;
  }
  .bl-sidebar {
    min-height: 100vh;
    height: 100vh;
    position: sticky;
    top: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bl-sidebar);
    border-right: 1px solid var(--bl-line);
  }
  .bl-sidebar-header { padding: 12px 8px 8px; }
  .bl-workspace-button {
    width: 100%;
    min-height: 46px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 8px;
    color: var(--bl-text);
    background: transparent;
    border: 0;
    border-radius: 8px;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .bl-workspace-button:hover { background: var(--bl-hover); }
  .bl-workspace-icon {
    width: 20px;
    height: 20px;
    flex: 0 0 auto;
    border-radius: 3px;
    background: linear-gradient(135deg, #79d4c7 0%, #5ea8d8 48%, #d3b978 100%);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.18);
  }
  .bl-workspace-copy { min-width: 0; flex: 1; }
  .bl-workspace-copy strong { display: block; font-size: 14px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bl-workspace-copy small { display: block; margin-top: 1px; color: var(--bl-muted); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bl-chevron { color: var(--bl-muted); font-size: 14px; }
  .bl-product-row {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 4px;
    padding: 8px;
    border-radius: 8px;
    background: var(--bl-active);
  }
  .bl-product-mark {
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border: 1px solid #4b4b4b;
    border-radius: 6px;
    color: #ededed;
    font-size: 9px;
    font-weight: 700;
  }
  .bl-product-row strong { display: block; font-size: 13px; }
  .bl-product-row small { display: block; margin-top: 1px; color: var(--bl-muted); font-size: 10px; }
  .bl-sidebar-scroll { min-height: 0; flex: 1; overflow: auto; padding: 4px 8px 16px; scrollbar-width: thin; }
  .bl-nav-section { margin-top: 12px; }
  .bl-nav-title {
    padding: 0 8px 5px;
    color: #6f6f6f;
    font-size: 10px;
    font-weight: 550;
    line-height: 18px;
  }
  .bl-nav { display: flex; flex-direction: column; gap: 2px; }
  .bl-nav button {
    width: 100%;
    min-height: 32px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 5px 8px;
    color: var(--bl-text-secondary);
    background: transparent;
    border: 0;
    border-radius: 6px;
    font: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }
  .bl-nav button:hover { color: var(--bl-text); background: var(--bl-hover); }
  .bl-nav button[data-active="true"] { color: var(--bl-text); background: var(--bl-active); }
  .bl-nav-glyph {
    width: 18px;
    height: 18px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border: 1px solid #4a4a4a;
    border-radius: 5px;
    color: #a8a8a8;
    font-size: 8px;
    font-weight: 650;
  }
  .bl-nav button[data-active="true"] .bl-nav-glyph { color: var(--accent, var(--bl-accent)); border-color: #626262; }
  .bl-nav-label { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bl-nav-id { display: none; }
  .bl-admin-group { margin-top: 12px; }
  .bl-admin-group summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 8px;
    color: #777;
    border-radius: 6px;
    font-size: 10px;
    cursor: pointer;
    list-style: none;
  }
  .bl-admin-group summary::-webkit-details-marker { display: none; }
  .bl-admin-group summary:hover { color: var(--bl-text-secondary); background: var(--bl-hover); }
  .bl-admin-count { padding: 1px 5px; border: 1px solid var(--bl-line); border-radius: 999px; font-size: 9px; }
  .bl-admin-group[open] summary { margin-bottom: 5px; }
  .bl-sidebar-footer { padding: 10px 14px 13px; border-top: 1px solid var(--bl-line-soft); }
  .bl-runtime-state { display: flex; align-items: center; gap: 9px; }
  .bl-runtime-dot { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: var(--bl-good); box-shadow: 0 0 0 3px rgba(119,207,170,.09); }
  .bl-runtime-state strong { display: block; color: var(--bl-text-secondary); font-size: 11px; font-weight: 550; }
  .bl-runtime-state small { display: block; margin-top: 2px; color: var(--bl-muted); font-size: 9px; }
  .bl-main { min-width: 0; min-height: 100vh; }
  .bl-topbar {
    min-height: 57px;
    position: sticky;
    top: 0;
    z-index: 10;
    display: grid;
    grid-template-columns: minmax(150px, .7fr) auto minmax(300px, 1fr);
    align-items: center;
    gap: 16px;
    padding: 8px 16px 8px 24px;
    background: rgba(18,18,18,.94);
    border-bottom: 1px solid var(--bl-line);
    backdrop-filter: blur(14px);
  }
  .bl-context { min-width: 0; display: flex; align-items: center; gap: 7px; color: var(--bl-muted); font-size: 12px; }
  .bl-context strong { color: var(--bl-text); font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bl-context-separator { color: #505050; }
  .bl-topnav { display: flex; align-items: center; gap: 2px; padding: 3px; background: #181818; border: 1px solid var(--bl-line-soft); border-radius: 8px; }
  .bl-topnav button { padding: 6px 9px; color: var(--bl-muted); background: transparent; border: 0; border-radius: 5px; font: inherit; font-size: 11px; cursor: pointer; }
  .bl-topnav button:hover { color: var(--bl-text-secondary); }
  .bl-topnav button[data-active="true"] { color: var(--bl-text); background: var(--bl-active); box-shadow: 0 1px 2px rgba(0,0,0,.28); }
  .bl-topbar-actions { min-width: 0; display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
  .bl-search { min-width: 160px; max-width: 360px; flex: 1; position: relative; }
  .bl-search input { width: 100%; height: 34px; padding: 7px 50px 7px 31px; color: var(--bl-text); background: #191919; border: 1px solid var(--bl-line); border-radius: 7px; outline: none; font: inherit; font-size: 12px; }
  .bl-search input:focus { border-color: #555; box-shadow: 0 0 0 2px rgba(255,255,255,.035); }
  .bl-search::before { content: ''; width: 11px; height: 11px; position: absolute; top: 10px; left: 11px; border: 1.5px solid #777; border-radius: 50%; pointer-events: none; }
  .bl-search::after { content: ''; width: 5px; height: 1.5px; position: absolute; top: 21px; left: 21px; background: #777; transform: rotate(45deg); pointer-events: none; }
  .bl-kbd { position: absolute; top: 8px; right: 7px; padding: 2px 5px; color: #777; border: 1px solid #3c3c3c; border-radius: 4px; font-size: 8px; }
  .bl-search-results { position: absolute; top: 39px; right: 0; left: 0; max-height: 380px; overflow: auto; padding: 5px; background: #202020; border: 1px solid #3a3a3a; border-radius: 9px; box-shadow: 0 18px 54px rgba(0,0,0,.46); z-index: 30; }
  .bl-search-results button { width: 100%; padding: 8px; color: var(--bl-text-secondary); background: transparent; border: 0; border-radius: 6px; font: inherit; font-size: 11px; text-align: left; cursor: pointer; }
  .bl-search-results button:hover { color: var(--bl-text); background: var(--bl-active); }
  .bl-search-results small { display: block; margin-top: 2px; color: var(--bl-muted); }
  .bl-icon-btn { min-height: 34px; padding: 7px 10px; color: var(--bl-text-secondary); background: #202020; border: 1px solid var(--bl-line); border-radius: 7px; font: inherit; font-size: 11px; cursor: pointer; white-space: nowrap; }
  .bl-icon-btn:hover { color: var(--bl-text); background: #272727; }
  .bl-content { width: 100%; max-width: 1480px; margin: 0 auto; padding: 34px 32px 56px; animation: bl-page-in .28s ease-out both; }
  .bl-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
  .bl-eyebrow { display: flex; align-items: center; gap: 7px; margin-bottom: 9px; color: var(--bl-muted); font-size: 9px; font-weight: 650; letter-spacing: .09em; text-transform: uppercase; }
  .bl-eyebrow-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--bl-accent); }
  .bl-heading h1 { margin: 0; color: var(--bl-text); font-size: clamp(25px, 2.2vw, 34px); font-weight: 620; line-height: 1.12; letter-spacing: -.035em; }
  .bl-heading p { max-width: 720px; margin: 8px 0 0; color: var(--bl-muted); font-size: 12px; line-height: 1.6; }
  .bl-actions { display: flex; flex-wrap: wrap; gap: 7px; }
  .bl-btn { min-height: 32px; padding: 7px 10px; color: var(--bl-text-secondary); background: #202020; border: 1px solid var(--bl-line); border-radius: 7px; font: inherit; font-size: 11px; cursor: pointer; }
  .bl-btn:hover { color: var(--bl-text); background: #272727; border-color: #414141; }
  .bl-btn:disabled { opacity: .45; cursor: not-allowed; }
  .bl-btn[data-primary="true"] { color: #101715; background: #a7dccd; border-color: #a7dccd; font-weight: 650; }
  .bl-btn[data-primary="true"]:hover { background: #bae6da; }
  .bl-btn[data-danger="true"] { color: #eea0a0; }
  .bl-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 12px; }
  .bl-card { grid-column: span 3; min-width: 0; padding: 17px; background: var(--bl-surface); border: 1px solid var(--bl-line); border-radius: 10px; }
  .bl-card[data-span="4"] { grid-column: span 4; }
  .bl-card[data-span="6"] { grid-column: span 6; }
  .bl-card[data-span="8"] { grid-column: span 8; }
  .bl-card[data-span="12"] { grid-column: span 12; }
  .bl-card h3 { margin: 0 0 10px; color: var(--bl-text-secondary); font-size: 12px; font-weight: 580; }
  .bl-card p { margin: 0; color: var(--bl-muted); font-size: 11px; line-height: 1.6; }
  .bl-kpi { margin-top: 8px; color: var(--bl-text); font-size: 30px; font-weight: 620; line-height: 1; letter-spacing: -.045em; }
  .bl-kpi small { margin-left: 4px; color: var(--bl-muted); font-size: 9px; font-weight: 500; letter-spacing: 0; }
  .bl-list { display: flex; flex-direction: column; gap: 6px; }
  .bl-row { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 11px; background: #171717; border: 1px solid var(--bl-line-soft); border-radius: 7px; }
  .bl-row:hover { background: #1d1d1d; }
  .bl-row-main { min-width: 0; }
  .bl-row strong { display: block; overflow: hidden; color: var(--bl-text-secondary); font-size: 11px; font-weight: 570; text-overflow: ellipsis; white-space: nowrap; }
  .bl-row small { display: block; overflow: hidden; margin-top: 3px; color: var(--bl-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
  .bl-badge { display: inline-flex; align-items: center; min-height: 20px; padding: 3px 6px; color: #9b9b9b; background: #1d1d1d; border: 1px solid #363636; border-radius: 999px; font-size: 8px; font-weight: 600; letter-spacing: .03em; white-space: nowrap; }
  .bl-badge[data-tone="good"] { color: var(--bl-good); background: rgba(119,207,170,.07); border-color: rgba(119,207,170,.25); }
  .bl-badge[data-tone="warn"] { color: var(--bl-warn); background: rgba(227,184,107,.07); border-color: rgba(227,184,107,.24); }
  .bl-badge[data-tone="bad"] { color: var(--bl-bad); background: rgba(238,133,133,.07); border-color: rgba(238,133,133,.24); }
  .bl-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .bl-form { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 9px; }
  .bl-field { grid-column: span 4; }
  .bl-field[data-span="6"] { grid-column: span 6; }
  .bl-field[data-span="8"] { grid-column: span 8; }
  .bl-field[data-span="12"] { grid-column: span 12; }
  .bl-field label { display: block; margin: 0 0 5px; color: var(--bl-muted); font-size: 9px; font-weight: 550; letter-spacing: .045em; text-transform: uppercase; }
  .bl-field input, .bl-field textarea, .bl-field select { width: 100%; padding: 9px 10px; color: var(--bl-text); background: #141414; border: 1px solid var(--bl-line); border-radius: 7px; outline: none; font: inherit; font-size: 11px; }
  .bl-field textarea { min-height: 88px; resize: vertical; }
  .bl-field input:focus, .bl-field textarea:focus, .bl-field select:focus { border-color: #555; }
  .bl-progress { height: 5px; margin-top: 10px; overflow: hidden; background: #0f0f0f; border-radius: 999px; }
  .bl-progress > span { display: block; height: 100%; background: var(--bl-accent); border-radius: inherit; }
  .bl-world { min-height: 460px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 22px; padding: 40px; background-color: #151515; background-image: radial-gradient(#343434 .7px, transparent .7px); background-size: 18px 18px; border: 1px solid var(--bl-line); border-radius: 10px; overflow: hidden; }
  .bl-bubble { display: flex; align-items: center; justify-content: center; padding: 12px; color: var(--bl-text); text-align: center; background: #202020; border: 1px solid #454545; border-radius: 50%; box-shadow: 0 12px 34px rgba(0,0,0,.25); cursor: pointer; }
  .bl-bubble:hover { background: #262626; border-color: var(--bl-accent); }
  .bl-bubble strong { font-size: 11px; }
  .bl-bubble small { display: block; margin-top: 3px; color: var(--bl-muted); font-size: 8px; }
  .bl-table { width: 100%; border-collapse: collapse; font-size: 10px; }
  .bl-table th { padding: 8px; color: var(--bl-muted); border-bottom: 1px solid var(--bl-line); font-weight: 550; text-align: left; }
  .bl-table td { padding: 9px 8px; border-bottom: 1px solid var(--bl-line-soft); vertical-align: top; }
  .bl-table tr:hover td { background: rgba(255,255,255,.015); }
  .bl-empty { padding: 24px; color: var(--bl-muted); border: 1px dashed #3b3b3b; border-radius: 8px; font-size: 11px; text-align: center; }
  .bl-toast { max-width: 380px; position: fixed; right: 20px; bottom: 20px; z-index: 40; padding: 11px 13px; color: var(--bl-text-secondary); background: #252525; border: 1px solid #484848; border-radius: 8px; box-shadow: 0 16px 48px rgba(0,0,0,.4); font-size: 10px; }
  .bl-split { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr); gap: 12px; }
  .bl-code { padding: 11px; color: #aaa; background: #121212; border: 1px solid var(--bl-line); border-radius: 7px; font: 10px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; word-break: break-word; }
  @keyframes bl-page-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  @media (max-width: 1180px) {
    .bl-topbar { grid-template-columns: auto 1fr; }
    .bl-context { display: none; }
    .bl-topnav { justify-self: start; }
    .bl-card, .bl-card[data-span="4"] { grid-column: span 6; }
    .bl-card[data-span="8"] { grid-column: span 12; }
    .bl-split { grid-template-columns: 1fr; }
  }
  @media (max-width: 820px) {
    .bl-shell { grid-template-columns: 216px minmax(0, 1fr); }
    .bl-topbar { padding-left: 14px; gap: 8px; }
    .bl-topnav button { padding-inline: 7px; }
    .bl-content { padding: 28px 18px 44px; }
  }
  @media (max-width: 680px) {
    .bl-shell { display: block; }
    .bl-sidebar { min-height: 0; height: auto; position: relative; border-right: 0; border-bottom: 1px solid var(--bl-line); }
    .bl-sidebar-header { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .bl-product-row { margin-top: 0; }
    .bl-sidebar-scroll { display: flex; gap: 10px; padding: 0 8px 10px; overflow-x: auto; }
    .bl-nav-section { min-width: 210px; margin-top: 6px; }
    .bl-admin-group { display: none; }
    .bl-sidebar-footer { display: none; }
    .bl-topbar { top: 0; grid-template-columns: 1fr; padding: 8px 10px; }
    .bl-topnav { width: 100%; overflow-x: auto; }
    .bl-topbar-actions { width: 100%; justify-content: stretch; }
    .bl-search { max-width: none; }
    .bl-content { padding: 22px 12px 36px; }
    .bl-heading { align-items: flex-start; flex-direction: column; }
    .bl-card, .bl-card[data-span="4"], .bl-card[data-span="6"], .bl-card[data-span="8"] { grid-column: span 12; }
    .bl-field, .bl-field[data-span="6"], .bl-field[data-span="8"] { grid-column: span 12; }
  }
`;

const AFFINE_SHELL = String.raw`  const navigationScreens = BRAINLINK_SCREENS.filter(item => mobileSurface ? item.area === 'MOBILE' : item.area !== 'MOBILE');
  const workspaceSlugs = new Set(['world', 'documents', 'canvas', 'projects', 'roadmap', 'tasks', 'calendar']);
  const workspaceScreens = mobileSurface
    ? navigationScreens
    : navigationScreens.filter(item => item.area === 'CORE' && workspaceSlugs.has(item.slug));
  const governanceScreens = navigationScreens.filter(item => item.area === 'CORE' && !workspaceSlugs.has(item.slug));
  const adminScreens = navigationScreens.filter(item => item.area === 'SUPERADMIN');
  const quickNavigation = mobileSurface
    ? [
        { label: 'Projects', slug: 'projects' },
        { label: 'Tasks', slug: 'tasks' },
        { label: 'Workers', slug: 'workers' },
        { label: 'Evidence', slug: 'evidence' },
      ]
    : [
        { label: 'Overview', slug: 'governance' },
        { label: 'Projects', slug: 'projects' },
        { label: 'Tasks', slug: 'tasks' },
        { label: 'Rules', slug: 'universalis' },
        { label: 'Audit', slug: 'audit' },
      ];

  const renderNavigationItems = (items: typeof navigationScreens) => items.map(item => (
    <button key={item.id} data-active={rawSlug === item.slug} onClick={() => navigateTo(item.slug)} title={item.description}>
      <span className="bl-nav-glyph" aria-hidden="true">{item.label.charAt(0)}</span>
      <span className="bl-nav-label">{item.label}</span>
      <span className="bl-nav-id">{item.id}</span>
    </button>
  ));

  return <>
    <style>{styles}</style>
    <div className="bl-shell" data-ui="affine-integrated">
      <aside className="bl-sidebar">
        <div className="bl-sidebar-header">
          <button className="bl-workspace-button" onClick={() => navigate('/')} title="Return to AFFiNE workspace">
            <span className="bl-workspace-icon" aria-hidden="true" />
            <span className="bl-workspace-copy"><strong>Demo Workspace</strong><small>AFFiNE local workspace</small></span>
            <span className="bl-chevron" aria-hidden="true">&#8249;</span>
          </button>
          <div className="bl-product-row">
            <span className="bl-product-mark">BL</span>
            <span><strong>Brainlink</strong><small>Governance layer</small></span>
          </div>
        </div>

        <div className="bl-sidebar-scroll">
          <section className="bl-nav-section">
            <div className="bl-nav-title">{mobileSurface ? 'Mobile workspace' : 'Workspace'}</div>
            <nav className="bl-nav">{renderNavigationItems(workspaceScreens)}</nav>
          </section>

          {!mobileSurface ? <section className="bl-nav-section">
            <div className="bl-nav-title">Governance</div>
            <nav className="bl-nav">{renderNavigationItems(governanceScreens)}</nav>
          </section> : null}

          {!mobileSurface ? <details className="bl-admin-group" open={rawSlug.startsWith('superadmin/')}>
            <summary><span>Administration</span><span className="bl-admin-count">{adminScreens.length}</span></summary>
            <nav className="bl-nav">{renderNavigationItems(adminScreens)}</nav>
          </details> : null}
        </div>

        <div className="bl-sidebar-footer">
          <div className="bl-runtime-state"><span className="bl-runtime-dot" /><span><strong>Local-first runtime</strong><small>{state.projects.length} projects / {state.tasks.length} tasks</small></span></div>
        </div>
      </aside>

      <main className="bl-main">
        <header className="bl-topbar">
          <div className="bl-context"><span>Brainlink</span><span className="bl-context-separator">/</span><strong>{title}</strong></div>
          <nav className="bl-topnav" aria-label="Brainlink quick navigation">
            {quickNavigation.map(item => <button key={item.slug} data-active={rawSlug === item.slug} onClick={() => navigateTo(item.slug)}>{item.label}</button>)}
          </nav>
          <div className="bl-topbar-actions">
            <div className="bl-search">
              <input data-brainlink-search value={search} onChange={event => setSearch(event.target.value)} placeholder="Search Brainlink" aria-label="Search Brainlink" />
              <span className="bl-kbd">Ctrl K</span>
              {search.trim() ? <div className="bl-search-results">{searchResults.length ? searchResults.map(result => <button key={result.path + '-' + result.label} onClick={() => { navigate(result.path); setSearch(''); }}>{result.label}<small>{result.detail}</small></button>) : <div className="bl-empty">No results.</div>}</div> : null}
            </div>
            <button className="bl-icon-btn" onClick={() => navigate('/')} title="Open AFFiNE documents">AFFiNE</button>
          </div>
        </header>

        <div className="bl-content">
          <div className="bl-heading">
            <div>
              <div className="bl-eyebrow"><span className="bl-eyebrow-dot" />{mobileSurface ? 'Mobile companion' : screen?.area === 'SUPERADMIN' ? 'Administration' : 'Workspace app'}</div>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
            <div className="bl-actions">
              {mobileSurface ? <button className="bl-btn" onClick={() => navigate('/brainlink/governance')}>Desktop governance</button> : <button className="bl-btn" onClick={() => navigate('/m/brainlink/projects')}>Mobile surface</button>}
              <button className="bl-btn" onClick={exportState}>Export state</button>
            </div>
          </div>
          {renderContent()}
        </div>
      </main>
    </div>
    {toast ? <div className="bl-toast">{toast}</div> : null}
  </>;`;

const occurrences = (source, value) => source.split(value).length - 1;

export const applyAffineUiIntegration = targetRoot => {
  const file = path.join(path.resolve(targetRoot), APP_FILE);
  const source = fs.readFileSync(file, 'utf8');

  if (source.includes('data-ui="affine-integrated"')) {
    return file;
  }

  if (occurrences(source, STYLE_START) !== 1 || occurrences(source, STYLE_END) !== 1) {
    throw new Error('Brainlink AFFiNE UI style anchors must occur exactly once.');
  }
  if (occurrences(source, SHELL_START) !== 1) {
    throw new Error('Brainlink AFFiNE UI shell anchor must occur exactly once.');
  }

  const styleStart = source.indexOf(STYLE_START);
  const styleEnd = source.indexOf(STYLE_END, styleStart);
  let transformed =
    source.slice(0, styleStart) +
    'const styles = `'+ AFFINE_STYLES + '`;\n\nconst cloneState' +
    source.slice(styleEnd + STYLE_END.length);

  const shellStart = transformed.indexOf(SHELL_START);
  const componentEnd = transformed.lastIndexOf('\n};');
  if (componentEnd <= shellStart) {
    throw new Error('Brainlink AFFiNE UI component end was not found after the shell anchor.');
  }

  transformed =
    transformed.slice(0, shellStart) + AFFINE_SHELL + transformed.slice(componentEnd);

  fs.writeFileSync(file, transformed, 'utf8');
  console.log('[BRAINLINK] Applied AFFiNE-integrated Brainlink UI.');
  return file;
};

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  applyAffineUiIntegration(process.argv[2] ?? process.cwd());
}
