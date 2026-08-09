import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = 'packages/frontend/core/src/brainlink/app.tsx';
const CATALOG = 'packages/frontend/core/src/brainlink/catalog.ts';
const RUNTIME_TARGET = 'packages/frontend/core/src/brainlink/brainlink-organizer.tsx';
const screens = `
  { id: 'BL-UI-040', area: 'CORE', label: 'Organization', slug: 'organization', description: 'Sistema operacional para organizar vida, ideias, projetos, empresa, pessoas, orçamento, tarefas e Brains.' },
  { id: 'BL-UI-041', area: 'CORE', label: 'Life', slug: 'life', description: 'Objetivos, áreas pessoais, rotinas e responsabilidades conectadas a documentos.' },
  { id: 'BL-UI-042', area: 'CORE', label: 'Ideas', slug: 'ideas', description: 'Captura, maturação, ownership e documentação de ideias.' },
  { id: 'BL-UI-043', area: 'CORE', label: 'Company', slug: 'company', description: 'Operação da empresa, processos, pessoas, Brains e recursos.' },
  { id: 'BL-UI-044', area: 'CORE', label: 'Budget', slug: 'budget', description: 'Planejamento e realizado financeiro ligados ao trabalho real.' },
  { id: 'BL-UI-045', area: 'CORE', label: 'People', slug: 'people', description: 'Pessoas, papéis, relações e responsabilidades.' },
  { id: 'BL-UI-046', area: 'CORE', label: 'Brains', slug: 'brains', description: 'Workers de IA, atividade real, documentação, heartbeat, evidência e conformidade.' },`;
const writeIfChanged = (file, value) => { const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; if (current !== value) fs.writeFileSync(file, value, 'utf8'); };

export function applyBrainlinkOrganizer({ sourceRoot = scriptRoot, targetRoot } = {}) {
  if (!targetRoot) throw new Error('targetRoot is required.');
  const target = path.resolve(targetRoot);
  const runtimeSource = path.join(sourceRoot, 'brainlink-runtime', 'organizer', 'brainlink-organizer.tsx');
  const runtimeTarget = path.join(target, ...RUNTIME_TARGET.split('/'));
  fs.mkdirSync(path.dirname(runtimeTarget), { recursive: true });
  fs.copyFileSync(runtimeSource, runtimeTarget);
  const catalogFile = path.join(target, ...CATALOG.split('/'));
  let catalog = fs.readFileSync(catalogFile, 'utf8');
  if (!catalog.includes("id: 'BL-UI-040'")) {
    const anchor = 'export const BRAINLINK_SCREENS: BrainlinkScreenDefinition[] = [';
    if (!catalog.includes(anchor)) throw new Error('Brainlink organizer catalog anchor is missing.');
    catalog = catalog.replace(anchor, anchor + screens);
    writeIfChanged(catalogFile, catalog);
  }
  const appFile = path.join(target, ...APP.split('/'));
  let app = fs.readFileSync(appFile, 'utf8');
  if (!app.includes("from './brainlink-organizer'")) {
    const anchor = "import { BRAINLINK_SCREENS } from './catalog';";
    if (!app.includes(anchor)) throw new Error('Brainlink organizer import anchor is missing.');
    app = app.replace(anchor, `${anchor}\nimport { BrainlinkOrganizer, type BrainlinkOrganizerView } from './brainlink-organizer';`);
  }
  if (!app.includes("case 'organization':")) {
    const anchor = "      case 'world': return renderWorld();";
    const cases = `      case 'organization':\n      case 'life':\n      case 'ideas':\n      case 'company':\n      case 'budget':\n      case 'people':\n      case 'brains': return <BrainlinkOrganizer view={rawSlug as BrainlinkOrganizerView} state={state} commit={commit} onNavigate={navigateTo} />;\n`;
    if (!app.includes(anchor)) throw new Error('Brainlink organizer route anchor is missing.');
    app = app.replace(anchor, cases + anchor);
  }
  writeIfChanged(appFile, app);
  console.log('[BRAINLINK] Applied total organization system and Brain observability.');
  return { runtimeTarget, catalogFile, appFile };
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) applyBrainlinkOrganizer({ targetRoot: process.argv[2] ?? process.cwd() });
