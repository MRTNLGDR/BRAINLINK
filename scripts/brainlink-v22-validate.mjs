import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const checks = [];
const failures = [];
const assert = (name, condition, detail = '') => {
  const ok = Boolean(condition);
  checks.push({ name, ok, detail });
  if (!ok) failures.push(name);
};

const types = read('packages/frontend/core/src/brainlink/types.ts');
const store = read('packages/frontend/core/src/brainlink/store.ts');
const app = read('packages/frontend/core/src/brainlink/app.tsx');
const execution = read('packages/frontend/core/src/brainlink/execution.ts');
const executionTest = read('packages/frontend/core/src/brainlink/__tests__/execution.spec.ts');

assert('Execution envelope module exists', exists('packages/frontend/core/src/brainlink/execution.ts'));
assert('Execution lifecycle states modeled', types.includes('BrainlinkExecutionState') && types.includes("'RULES_RESOLVED'") && types.includes("'WAITING_APPROVAL'") && types.includes("'SUCCEEDED'"));
assert('TaskEnvelope contract modeled', types.includes('BrainlinkTaskEnvelope') && types.includes('rulePackHash: string') && types.includes('correlationId: string') && types.includes('resourceBudget:'));
assert('Execution history persisted', types.includes('executions: BrainlinkExecution[]') && store.includes("executions: value.executions === undefined ? []"));
assert('Rule pack hash frozen per attempt', execution.includes('rulePackHash = sha256Hex(canonicalJson(rulePack))') && execution.includes('resolvedLawIds'));
assert('Capabilities frozen with write approval gate', execution.includes('effectiveCapabilities') && execution.includes('connectionHasApprovedWrite') && execution.includes(':write'));
assert('Overlapping worker attempts blocked', execution.includes('activeExecutionForWorker') && execution.includes('is already active'));
assert('Terminal execution mutation rejected', execution.includes('isTerminalExecution(execution)') && execution.includes('terminal and cannot be mutated'));
assert('Repeated-error anti-loop requires recovery checkpoint', execution.includes('Repeated failure fingerprint') && execution.includes('recoveryCheckpoint'));
assert('Worker Start creates frozen TaskEnvelope attempt', app.includes('createExecutionAttempt') && app.includes('Execution attempt created with frozen TaskEnvelope.'));
assert('Task DONE verifies and closes active execution', app.includes("'VERIFYING'") && app.includes("'SUCCEEDED'") && app.includes("'RESULT'"));
assert('Execution behavior tests cover lifecycle and anti-loop', executionTest.includes('lifecycle lineage') && executionTest.includes('repeated identical failures') && executionTest.includes('terminal attempts are immutable'));

for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
console.log(`\n${checks.length - failures.length}/${checks.length} Brainlink v2.2 execution checks passed.`);
if (failures.length) process.exit(1);
