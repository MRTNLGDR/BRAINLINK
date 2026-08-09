import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? path.join(process.cwd(), '.brainlink-workspace', 'AFFiNE'));
const read = relative => fs.readFileSync(path.join(root, ...relative.split('/')), 'utf8');
const checks = [];
const check = (name, condition) => checks.push({ name, ok: Boolean(condition) });

const app = read('packages/frontend/core/src/brainlink/app.tsx');
const router = read('packages/frontend/core/src/desktop/workbench-router.ts');
const page = read('packages/frontend/core/src/desktop/pages/workspace/brainlink/index.tsx');
const sidebar = read('packages/frontend/core/src/components/root-app-sidebar/index.tsx');

check('Brainlink renders as a native workspace surface', app.includes('data-ui="brainlink-workspace-native"'));
check('Duplicate Brainlink sidebar is not rendered', !app.includes('<aside className="bl-sidebar">'));
check('Workbench exposes the Brainlink module route', router.includes("path: '/brainlink/*'") && router.includes("workspace/brainlink/index"));
check('Workspace route renders the real Brainlink application', page.includes("from '../../../../brainlink/app'") && page.includes('navigateInWorkspace={target => workbench.open(target)}'));
check('Module navigation synchronizes the active workbench URL', app.includes('const navigatePath = (target: string) => navigateInWorkspace ? navigateInWorkspace(target) : navigate(target);') && app.includes('navigatePath(result.path)'));
check('Root sidebar uses native workbench navigation', sidebar.includes('const BrainlinkButton = () =>') && sidebar.includes("to={'/brainlink/governance'}") && !sidebar.includes("navigate('/brainlink/governance')"));

for (const result of checks) console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}`);
const passed = checks.filter(result => result.ok).length;
console.log(`\n${passed}/${checks.length} native workspace shell checks passed.`);
if (passed !== checks.length) process.exit(1);
