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
const prefix = path.join(evidenceRoot, `browser-smoke-${timestamp}`);
const screenshot = `${prefix}.png`;
const report = `${prefix}.json`;
const htmlEvidence = `${prefix}.html`;
const textEvidence = `${prefix}.txt`;
const targetOrigin = new URL(url).origin;
const markers = ['Brainlink', 'Project World', 'Universalis', 'Governance'];
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const trimArray = values => values.slice(-300);

let browser;
let context;
let page;
let navigationResponse;
let bodyText = '';
let html = '';
let title = '';
let readyState = 'unknown';
let failure;
let screenshotWritten = false;
const startedAt = Date.now();
const pageErrors = [];
const consoleMessages = [];
const failedRequests = [];
const badResponses = [];
const navigationEvents = [];

const safePageSnapshot = async () => {
  if (!page) return;
  try { bodyText = await page.locator('body').innerText({ timeout: 5_000 }); } catch { }
  try { html = await page.content(); } catch { }
  try { title = await page.title(); } catch { }
  try { readyState = await page.evaluate(() => document.readyState); } catch { }
  try {
    await page.screenshot({ path: screenshot, fullPage: true, timeout: 30_000 });
    screenshotWritten = true;
  } catch (error) {
    consoleMessages.push({ type: 'diagnostic', text: `Screenshot failed: ${error.message}` });
  }
};

try {
  const launchOptions = { headless: true };
  if (process.platform === 'win32') launchOptions.channel = 'msedge';
  browser = await chromium.launch(launchOptions);
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await context.newPage();

  page.on('console', message => {
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
      location: message.location(),
      at: new Date().toISOString(),
    });
  });
  page.on('pageerror', error => pageErrors.push({ message: error.message, stack: error.stack, at: new Date().toISOString() }));
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) navigationEvents.push({ url: frame.url(), at: new Date().toISOString() });
  });
  page.on('requestfailed', request => {
    const requestUrl = request.url();
    if (requestUrl.startsWith(targetOrigin)) {
      failedRequests.push({
        url: requestUrl,
        method: request.method(),
        resourceType: request.resourceType(),
        failure: request.failure()?.errorText ?? 'unknown',
        at: new Date().toISOString(),
      });
    }
  });
  page.on('response', response => {
    const responseUrl = response.url();
    if (responseUrl.startsWith(targetOrigin) && response.status() >= 400) {
      badResponses.push({
        url: responseUrl,
        status: response.status(),
        statusText: response.statusText(),
        resourceType: response.request().resourceType(),
        at: new Date().toISOString(),
      });
    }
  });

  // `commit` proves that Edge received response headers without allowing a
  // malformed/hanging page lifecycle to hide all diagnostics for three minutes.
  navigationResponse = await page.goto(url, { waitUntil: 'commit', timeout: 60_000 });
  if (!navigationResponse || navigationResponse.status() >= 400) {
    throw new Error(`Navegacao retornou HTTP ${navigationResponse?.status() ?? 'sem resposta'} para ${url}.`);
  }

  await page.locator('body').waitFor({ state: 'attached', timeout: 60_000 });

  // Poll visibly rendered content so a JS crash fails quickly while a slower
  // first AFFiNE boot still receives a bounded two-minute rendering window.
  let rendered = false;
  for (let second = 0; second < 120; second += 1) {
    try { bodyText = await page.locator('body').innerText({ timeout: 5_000 }); } catch { bodyText = ''; }
    rendered = markers.some(marker => bodyText.toLowerCase().includes(marker.toLowerCase()));
    if (rendered || pageErrors.length || /application error|uncaught error|failed to render/i.test(bodyText)) break;
    await sleep(1_000);
  }

  await sleep(2_000);
  await safePageSnapshot();

  const markersFound = markers.filter(marker => bodyText.toLowerCase().includes(marker.toLowerCase()));
  if (!markersFound.length) {
    throw new Error(`A UI abriu, mas nenhum marcador Brainlink foi renderizado. readyState=${readyState}; texto inicial: ${bodyText.slice(0, 500)}`);
  }
  if (/application error|uncaught error|failed to render/i.test(bodyText)) {
    throw new Error(`A UI exibiu um estado de erro: ${bodyText.slice(0, 700)}`);
  }
  if (pageErrors.length) {
    throw new Error(`Erro JavaScript nao tratado no navegador: ${pageErrors.map(item => item.message).join(' | ')}`);
  }

  const criticalFailedRequests = failedRequests.filter(item =>
    ['document', 'script', 'stylesheet', 'font', 'image', 'manifest'].includes(item.resourceType)
  );
  const criticalBadResponses = badResponses.filter(item =>
    ['document', 'script', 'stylesheet', 'font', 'image', 'manifest'].includes(item.resourceType)
  );
  if (criticalFailedRequests.length) {
    throw new Error(`Assets locais falharam no navegador: ${JSON.stringify(criticalFailedRequests.slice(0, 10))}`);
  }
  if (criticalBadResponses.length) {
    throw new Error(`Assets locais retornaram HTTP de erro: ${JSON.stringify(criticalBadResponses.slice(0, 10))}`);
  }

  const result = {
    status: 'PASS',
    requestedUrl: url,
    finalUrl: page.url(),
    navigationStatus: navigationResponse.status(),
    title,
    readyState,
    browserVersion: browser.version(),
    markersFound,
    bodyCharacters: bodyText.length,
    pageErrors: trimArray(pageErrors),
    consoleMessages: trimArray(consoleMessages),
    failedRequests: trimArray(failedRequests),
    badResponses: trimArray(badResponses),
    navigationEvents: trimArray(navigationEvents),
    screenshot: screenshotWritten ? screenshot : null,
    htmlEvidence,
    textEvidence,
    durationMs: Date.now() - startedAt,
    verifiedAt: new Date().toISOString(),
  };
  fs.writeFileSync(htmlEvidence, html, 'utf8');
  fs.writeFileSync(textEvidence, bodyText, 'utf8');
  fs.writeFileSync(report, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`[BRAINLINK] Browser user smoke PASS: ${result.finalUrl}`);
  console.log(`[BRAINLINK] Evidence: ${report}`);
} catch (error) {
  failure = error;
  await safePageSnapshot();
  const diagnostic = {
    status: 'FAIL',
    requestedUrl: url,
    finalUrl: page?.url() ?? null,
    navigationStatus: navigationResponse?.status() ?? null,
    title,
    readyState,
    browserVersion: browser?.version() ?? null,
    bodyCharacters: bodyText.length,
    bodyPreview: bodyText.slice(0, 2_000),
    error: { message: error.message, stack: error.stack },
    pageErrors: trimArray(pageErrors),
    consoleMessages: trimArray(consoleMessages),
    failedRequests: trimArray(failedRequests),
    badResponses: trimArray(badResponses),
    navigationEvents: trimArray(navigationEvents),
    screenshot: screenshotWritten ? screenshot : null,
    htmlEvidence,
    textEvidence,
    durationMs: Date.now() - startedAt,
    failedAt: new Date().toISOString(),
  };
  fs.writeFileSync(htmlEvidence, html, 'utf8');
  fs.writeFileSync(textEvidence, bodyText, 'utf8');
  fs.writeFileSync(report, `${JSON.stringify(diagnostic, null, 2)}\n`, 'utf8');
  console.error(`[BRAINLINK] Browser user smoke FAIL. Evidence: ${report}`);
} finally {
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
}

if (failure) {
  const wrapped = new Error(`${failure.message} Evidence: ${report}`);
  wrapped.cause = failure;
  throw wrapped;
}
