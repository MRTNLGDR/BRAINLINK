import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const failures = [];
const check = (name, condition) => {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}`);
  if (!condition) failures.push(name);
};

const lock = read('AFFINE_UPSTREAM.lock');
const stableSetup = read('BRAINLINK_SETUP.bat');
const candidateSetup = exists('BRAINLINK_SETUP_V22.bat') ? read('BRAINLINK_SETUP_V22.bat') : '';
const v22ps = exists('scripts/materialize-brainlink-v22.ps1') ? read('scripts/materialize-brainlink-v22.ps1') : '';
const v22sh = exists('scripts/materialize-brainlink-v22.sh') ? read('scripts/materialize-brainlink-v22.sh') : '';
const context = read('BRAINLINK_CONTEXT_V5.lock');
const stableExecution = '.brainlink-runtime-overrides/packages/frontend/core/src/brainlink/execution.ts';
const stableExecutionTest = '.brainlink-runtime-overrides/packages/frontend/core/src/brainlink/__tests__/execution.spec.ts';
const candidateExecution = '.brainlink-v22-overrides/packages/frontend/core/src/brainlink/execution.ts';
const candidateExecutionTest = '.brainlink-v22-overrides/packages/frontend/core/src/brainlink/__tests__/execution.spec.ts';

check('Stable runtime remains v2.1', lock.includes('brainlink_runtime_release=v2.1'));
check('Stable setup still uses v2.1 materializer', stableSetup.includes('scripts\\materialize-brainlink.ps1') && !stableSetup.includes('v22'));
check('v2.2 remains a separate candidate entrypoint', candidateSetup.includes('materialize-brainlink-v22.ps1'));
check('Windows v2.2 uses transport-safe migrator', v22ps.includes('apply-execution-v22-safe.mjs'));
check('Unix v2.2 uses transport-safe migrator', v22sh.includes('apply-execution-v22-safe.mjs'));
check('Stable overlay excludes v2.2 execution source/tests', !exists(stableExecution) && !exists(stableExecutionTest));
check('Candidate overlay owns v2.2 execution source/tests', exists(candidateExecution) && exists(candidateExecutionTest));
check('V5 is explicitly context-only', context.includes('authority=CONTEXT_COMPLEMENT_ONLY'));
check('V5 cannot auto-promote runtime', context.includes('auto_promote_runtime=false'));
check('V5 cannot replace product boundaries', context.includes('preserve_product_boundaries=true'));
check('V5 source provenance is pinned', /source_sha256=[0-9a-f]{64}/.test(context));

console.log(`\n${11 - failures.length}/11 non-breakage checks passed.`);
if (failures.length) process.exit(1);
