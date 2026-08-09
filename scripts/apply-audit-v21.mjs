import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_APP_SHA256 = '5434d86452f0b1cabc6b3ee612c4ca3ac34223d5763db03649075829151fb6ad';

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const countOccurrences = (content, search) => content.split(search).length - 1;

const replaceOnce = (content, search, replacement, label) => {
  const count = countOccurrences(content, search);
  if (count !== 1) {
    throw new Error(`Brainlink audit v2.1 anchor ${label} expected exactly once, found ${count}.`);
  }
  return content.replace(search, replacement);
};

export const applyAuditV21 = targetRoot => {
  const target = path.resolve(targetRoot);
  const appPath = path.join(target, 'packages', 'frontend', 'core', 'src', 'brainlink', 'app.tsx');
  if (!fs.existsSync(appPath)) throw new Error(`Brainlink app is missing: ${appPath}`);

  let app = fs.readFileSync(appPath, 'utf8');
  const alreadyApplied =
    app.includes("import { appendAuditEvent, verifyAuditChain } from './integrity';") &&
    app.includes('appendAuditEvent(draft.audit, {') &&
    app.includes('const integrity = verifyAuditChain(state.audit);') &&
    app.includes('SHA-256 chained audit ledger') &&
    app.includes('appendAuditEvent(fresh.audit, {');

  if (!alreadyApplied) {
    app = replaceOnce(
      app,
      "import { BRAINLINK_SCREENS } from './catalog';\nimport {",
      "import { BRAINLINK_SCREENS } from './catalog';\nimport { appendAuditEvent, verifyAuditChain } from './integrity';\nimport {",
      'integrity import'
    );

    app = replaceOnce(
      app,
      "import type {\n  BrainlinkAuditEvent,\n  BrainlinkState,",
      "import type {\n  BrainlinkState,",
      'obsolete audit event type import'
    );

    app = replaceOnce(
      app,
      `      const event: BrainlinkAuditEvent = {\n        id: createBrainlinkId('AUD'),\n        action,\n        detail,\n        actor: draft.settings.actorName || 'Local Operator',\n        createdAt: new Date().toISOString(),\n      };\n      draft.audit.unshift(event);\n      draft.audit = draft.audit.slice(0, 1000);`,
      `      appendAuditEvent(draft.audit, {\n        id: createBrainlinkId('AUD'),\n        action,\n        detail,\n        actor: draft.settings.actorName || 'Local Operator',\n        createdAt: new Date().toISOString(),\n      });`,
      'append-only commit audit event'
    );

    app = replaceOnce(
      app,
      "      parsed.audit.unshift({ id: createBrainlinkId('AUD'), action: 'STATE_IMPORTED', detail: `Imported and validated backup ${file.name}`, actor: parsed.settings.actorName || 'Local Operator', createdAt: new Date().toISOString() });",
      "      appendAuditEvent(parsed.audit, { id: createBrainlinkId('AUD'), action: 'STATE_IMPORTED', detail: `Imported and validated backup ${file.name}`, actor: parsed.settings.actorName || 'Local Operator', createdAt: new Date().toISOString() });",
      'import audit event'
    );

    app = replaceOnce(
      app,
      `  const renderAudit = () => <Card title="Append-only application audit ledger" span="12"><table className="bl-table"><thead><tr><th>Time</th><th>Action</th><th>Detail</th><th>Actor</th></tr></thead><tbody>{state.audit.map(item => <tr key={item.id}><td>{formatDate(item.createdAt)}</td><td>{item.action}</td><td>{item.detail}</td><td>{item.actor}</td></tr>)}</tbody></table></Card>;`,
      `  const renderAudit = () => {\n    const integrity = verifyAuditChain(state.audit);\n    return <Card title="SHA-256 chained audit ledger" span="12"><div className="bl-meta" style={{ marginBottom: 12 }}><Badge tone={integrity.valid ? 'good' : 'bad'}>{integrity.valid ? 'CHAIN VALID' : \`CHAIN INVALID · ${'${integrity.eventId}'}\`}</Badge><Badge>{state.audit.length} EVENTS</Badge></div><table className="bl-table"><thead><tr><th>Seq</th><th>Time</th><th>Action</th><th>Detail</th><th>Actor</th><th>Hash</th></tr></thead><tbody>{state.audit.map(item => <tr key={item.id}><td>{item.sequence ?? '—'}</td><td>{formatDate(item.createdAt)}</td><td>{item.action}</td><td>{item.detail}</td><td>{item.actor}</td><td><code title={item.eventHash}>{item.eventHash ? \`${'${item.eventHash.slice(0, 10)}'}…\` : 'UNSEALED'}</code></td></tr>)}</tbody></table></Card>;\n  };`,
      'audit integrity UI'
    );

    app = replaceOnce(
      app,
      "const fresh = createDefaultBrainlinkState(); fresh.audit.unshift({ id:createBrainlinkId('AUD'), action:'STATE_RESET', detail:'Local Brainlink state was explicitly reset by the operator.', actor:state.settings.actorName, createdAt:new Date().toISOString() }); saveBrainlinkState(fresh);",
      "const fresh = createDefaultBrainlinkState(); appendAuditEvent(fresh.audit, { id:createBrainlinkId('AUD'), action:'STATE_RESET', detail:'Local Brainlink state was explicitly reset by the operator.', actor:state.settings.actorName, createdAt:new Date().toISOString() }); saveBrainlinkState(fresh);",
      'reset audit event'
    );
  }

  const forbidden = [
    'const event: BrainlinkAuditEvent = {',
    'draft.audit = draft.audit.slice(0, 1000);',
    'parsed.audit.unshift({',
    "fresh.audit.unshift({ id:createBrainlinkId('AUD')",
    'Append-only application audit ledger',
  ];
  for (const marker of forbidden) {
    if (app.includes(marker)) throw new Error(`Brainlink audit v2.1 legacy marker remains: ${marker}`);
  }

  const required = [
    "import { appendAuditEvent, verifyAuditChain } from './integrity';",
    'appendAuditEvent(draft.audit, {',
    'appendAuditEvent(parsed.audit, {',
    'const integrity = verifyAuditChain(state.audit);',
    'SHA-256 chained audit ledger',
    'appendAuditEvent(fresh.audit, {',
  ];
  for (const marker of required) {
    if (!app.includes(marker)) throw new Error(`Brainlink audit v2.1 required marker is missing: ${marker}`);
  }

  const actual = sha256(Buffer.from(app, 'utf8'));
  if (actual !== EXPECTED_APP_SHA256) {
    throw new Error(`Brainlink audit v2.1 final app checksum mismatch. Expected ${EXPECTED_APP_SHA256}, got ${actual}.`);
  }

  fs.writeFileSync(appPath, app, 'utf8');
  console.log(`[BRAINLINK] Deterministic audit v2.1 transform verified: ${actual}`);
  return { appPath, sha256: actual, alreadyApplied };
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const targetRoot = process.argv[2] ?? process.cwd();
  try {
    applyAuditV21(targetRoot);
  } catch (error) {
    console.error(`[BRAINLINK] AUDIT V2.1 TRANSFORM FAILED: ${error.stack ?? error.message}`);
    process.exit(1);
  }
}
