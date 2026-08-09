import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function replaceRequired(content, marker, replacement, label) {
  if (content.includes(replacement)) return content;
  if (!content.includes(marker)) throw new Error(`Nao foi possivel aplicar ${label}: ancora ausente.`);
  return content.replace(marker, replacement);
}

function replaceVisibleBrand(file) {
  if (!fs.existsSync(file)) return;
  const source = fs.readFileSync(file, 'utf8');
  const branded = source.replaceAll('AFFiNE', 'Brainlink');
  if (source !== branded) fs.writeFileSync(file, branded);
}

export function applyBrainlinkBrandUnification({ sourceRoot = scriptRoot, targetRoot } = {}) {
  if (!targetRoot) throw new Error('targetRoot e obrigatorio.');

  const runtimeSource = path.join(sourceRoot, 'brainlink-runtime', 'branding', 'brainlink-brand.ts');
  const runtimeTarget = path.join(targetRoot, 'packages', 'frontend', 'core', 'src', 'brainlink', 'brainlink-brand.ts');
  fs.mkdirSync(path.dirname(runtimeTarget), { recursive: true });
  fs.copyFileSync(runtimeSource, runtimeTarget);

  const setupFile = path.join(targetRoot, 'packages', 'frontend', 'apps', 'web', 'src', 'setup.ts');
  let setup = fs.readFileSync(setupFile, 'utf8');
  setup = replaceRequired(
    setup,
    "import '@affine/core/bootstrap/browser';",
    "import '@affine/core/brainlink/brainlink-brand';\nimport '@affine/core/bootstrap/browser';",
    'bootstrap global da marca Brainlink'
  );
  fs.writeFileSync(setupFile, setup);

  const brainlinkRoot = path.join(targetRoot, 'packages', 'frontend', 'core', 'src', 'brainlink');
  for (const entry of fs.readdirSync(brainlinkRoot, { withFileTypes: true })) {
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && entry.name !== 'brainlink-brand.ts') {
      replaceVisibleBrand(path.join(brainlinkRoot, entry.name));
    }
  }

  for (const file of [
    path.join(targetRoot, 'packages', 'frontend', 'core', 'src', 'desktop', 'components', 'document-title', 'index.tsx'),
    path.join(targetRoot, 'packages', 'frontend', 'core', 'src', 'utils', 'channel.ts'),
    path.join(targetRoot, 'packages', 'frontend', 'core', 'src', 'desktop', 'pages', 'workspace', 'chat', 'brainlink-local-ai.tsx'),
  ]) replaceVisibleBrand(file);

  return { runtimeTarget, setupFile };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = applyBrainlinkBrandUnification({ targetRoot: path.resolve(process.argv[2]) });
  console.log(JSON.stringify(result));
}
