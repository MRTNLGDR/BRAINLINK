import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultSourceRoot = path.resolve(scriptDir, '..');
const relativeTarget = path.join(
  'packages',
  'frontend',
  'core',
  'src',
  'desktop',
  'pages',
  'workspace',
  'chat'
);
const templateNames = [
  'index.tsx',
  'brainlink-local-ai.tsx',
  'brainlink-local-worker.ts',
];

export const applyAffineLocalAi = ({
  sourceRoot = defaultSourceRoot,
  targetRoot,
}) => {
  const sourceDir = path.join(path.resolve(sourceRoot), 'brainlink-runtime', 'ai');
  const targetDir = path.join(path.resolve(targetRoot), relativeTarget);
  const indexFile = path.join(targetDir, 'index.tsx');
  const cloudFile = path.join(targetDir, 'affine-cloud.tsx');
  const currentIndex = fs.readFileSync(indexFile, 'utf8');

  if (!currentIndex.includes('BRAINLINK_LOCAL_AI_PROVIDER_ROUTER')) {
    if (!currentIndex.includes('AIChatRuntime') || !currentIndex.includes('WorkspaceAIChatSessionStrategy')) {
      throw new Error('AFFiNE cloud AI page does not match the expected provider boundary.');
    }
    fs.writeFileSync(cloudFile, currentIndex, 'utf8');
  } else if (!fs.existsSync(cloudFile)) {
    throw new Error('Brainlink local AI router exists without preserved AFFiNE cloud provider.');
  }

  for (const name of templateNames) {
    const source = path.join(sourceDir, name);
    if (!fs.existsSync(source)) {
      throw new Error(`Brainlink local AI template missing: ${name}`);
    }
    fs.copyFileSync(source, path.join(targetDir, name));
  }

  console.log('[BRAINLINK] Applied local-first AFFiNE AI provider router.');
  return indexFile;
};

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  applyAffineLocalAi({
    sourceRoot: process.argv[3] ?? defaultSourceRoot,
    targetRoot: process.argv[2] ?? process.cwd(),
  });
}
