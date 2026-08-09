import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const valueOf = name => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const target = path.resolve(valueOf('--target') ?? process.cwd());
const url = valueOf('--url') ?? 'http://127.0.0.1:8080/brainlink';
const evidenceRoot = path.resolve(valueOf('--evidence') ?? path.join(target, '.brainlink-evidence'));
fs.mkdirSync(evidenceRoot, { recursive: true });

const requireFromTarget = createRequire(path.join(target, 'package.json'));
let chromium;
try {
  ({ chromium } = requireFromTarget('@playwright/test'));
} catch (error) {
  throw new Error(`Playwright instalado no workspace nao foi localizado: ${error.message}`);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const screenshot = path.join(evidenceRoot, `browser-smoke-${timestamp}.png`);
const report = path.join(evidenceRoot, `browser-smoke-${timestamp}.json`);
let browser;
const pageErrors = [];
const failedResources = [];
const targetOrigin = new URL(url).origin;

try {
  const launchOptions = { headless: true };
  if (process.platform === 'win32') launchOptions.channel = 'msedge';
  browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => {
    const failure = request.failure()?.errorText ?? 'unknown';
    if (request.url().startsWith(targetOrigin) && !request.url().includes('/api/') && !request.url().includes('/graphql')) {
      failedResources.push({ url: request.url(), failure });
    }
  });

  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180_000 });
  if (!response || response.status() >= 400) {
    throw new Error(`Navegacao retornou HTTP ${response?.status() ?? 'sem resposta'} para ${url}.`);
  }
  await page.waitForFunction(() => document.body && document.body.innerText.trim().length > 20, null, { timeout: 180_000 });
  await page.waitForTimeout(3_000);
  const bodyText = await page.locator('body').innerText();
  const markers = ['Brainlink', 'Project World', 'Universalis', 'Governance'];
  if (!markers.some(marker => bodyText.toLowerCase().includes(marker.toLowerCase()))) {
    throw new Error(`A UI abriu, mas nenhum marcador Brainlink foi renderizado. Texto inicial: ${bodyText.slice(0, 300)}`);
  }
  if (/application error|uncaught error|failed to render/i.test(bodyText)) {
    throw new Error(`A UI exibiu um estado de erro: ${bodyText.slice(0, 500)}`);
  }
  if (pageErrors.length) {
    throw new Error(`Erro JavaScript nao tratado no navegador: ${pageErrors.join(' | ')}`);
  }
  if (failedResources.length) {
    throw new Error(`Assets locais falharam no navegador: ${JSON.stringify(failedResources.slice(0, 10))}`);
  }

  await page.screenshot({ path: screenshot, fullPage: true });
  const result = {
    status: 'PASS',
    url: page.url(),
    title: await page.title(),
    markersFound: markers.filter(marker => bodyText.toLowerCase().includes(marker.toLowerCase())),
    bodyCharacters: bodyText.length,
    screenshot,
    verifiedAt: new Date().toISOString(),
  };
  fs.writeFileSync(report, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`[BRAINLINK] Browser user smoke PASS: ${result.url}`);
  console.log(`[BRAINLINK] Evidence: ${report}`);
} finally {
  await browser?.close();
}
