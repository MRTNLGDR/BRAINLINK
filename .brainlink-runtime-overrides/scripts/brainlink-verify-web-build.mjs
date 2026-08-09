import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const findWebDist = () => {
  const candidates = [
    path.join(root, 'packages', 'frontend', 'apps', 'web', 'dist'),
    path.join(root, 'packages', 'frontend', 'apps', 'web', '.webpack'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) return candidate;
  }
  throw new Error('AFFiNE web build did not produce a discoverable index.html.');
};

const dist = findWebDist();
const indexPath = path.join(dist, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
if (/https?:\/\/[^"']*affineassets\.com/i.test(html)) {
  throw new Error('Web build still references an AFFiNE CDN instead of local assets. Set PUBLIC_PATH=/ before building.');
}

const scriptSources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);
const stylesheetSources = [...html.matchAll(/<link\b[^>]*\brel=["'][^"']*stylesheet[^"']*["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);
const assetSources = [...new Set([...scriptSources, ...stylesheetSources])];
if (!scriptSources.length) throw new Error('Web build index.html contains no executable script assets.');
if (!stylesheetSources.length) throw new Error('Web build index.html contains no stylesheet assets.');

const files = [];
for (const source of assetSources) {
  if (/^https?:\/\//i.test(source) || source.startsWith('//')) {
    throw new Error(`Web build contains a remote executable/style asset: ${source}`);
  }
  const pathname = decodeURIComponent(source.split(/[?#]/, 1)[0]).replace(/^\/+/, '');
  const file = path.resolve(dist, pathname);
  if (!(file === dist || file.startsWith(`${dist}${path.sep}`))) {
    throw new Error(`Web build asset escapes the output root: ${source}`);
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`Web build references a missing local asset: ${source}`);
  }
  files.push({ source, relativePath: path.relative(dist, file).replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: sha256(file) });
}

const evidence = {
  status: 'PASS',
  distribution: 'LOCAL_SELF_CONTAINED_WEB',
  publicPath: '/',
  dist,
  index: { relativePath: 'index.html', bytes: fs.statSync(indexPath).size, sha256: sha256(indexPath) },
  scripts: scriptSources.length,
  stylesheets: stylesheetSources.length,
  verifiedAssets: files,
  verifiedAt: new Date().toISOString(),
};
const evidencePath = path.join(root, 'brainlink-web-build-evidence.json');
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(`[BRAINLINK] Local web build asset verification PASS: ${files.length} assets.`);
console.log(`[BRAINLINK] Evidence: ${evidencePath}`);
