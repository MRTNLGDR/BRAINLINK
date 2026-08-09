import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const option = name => {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find(value => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
};
const root = path.resolve(option('--root') ?? process.cwd());
const output = path.resolve(option('--output') ?? path.join(root, 'brainlink-ci-evidence.json'));
const enforce = args.has('--enforce');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const hashFile = relative => sha256(fs.readFileSync(path.join(root, relative)));
const parseLock = content => Object.fromEntries(
  content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const separator = line.indexOf('=');
      return separator < 0 ? [line, ''] : [line.slice(0, separator), line.slice(separator + 1)];
    })
);
const isSha256 = value => /^[0-9a-f]{64}$/.test(value ?? '');

const jobs = JSON.parse(process.env.BRAINLINK_JOB_RESULTS ?? '{}');
const requiredJobs = [
  'repository-guards',
  'transport-audit-v23',
  'stable-runtime',
  'candidate-v22',
  'candidate-v23',
  'stable-build',
  'candidate-v23-build',
];
const stableLock = parseLock(read('AFFINE_UPSTREAM.lock'));
const zipAuthority = parseLock(read('BRAINLINK_ZIP_AUTHORITY.lock'));
const failures = requiredJobs.filter(name => jobs[name] !== 'success');
const releaseInvariants = {
  stableRuntime: stableLock.brainlink_runtime_release === 'v2.1',
  v22NotPromoted: stableLock.brainlink_candidate_status === 'NOT_PROMOTED',
  zipCandidateNotPromoted: zipAuthority.candidate_status === 'NOT_PROMOTED',
  zipRuntimeTransportPinned:
    isSha256(zipAuthority.candidate_runtime_overlay_sha256) &&
    isSha256(zipAuthority.candidate_runtime_manifest_sha256),
  allRequiredJobsSucceeded: failures.length === 0,
};

const evidence = {
  schemaVersion: 1,
  kind: 'BRAINLINK_GITHUB_ACTIONS_RELEASE_EVIDENCE',
  generatedAt: new Date().toISOString(),
  source: {
    repository: process.env.GITHUB_REPOSITORY ?? null,
    workflow: process.env.GITHUB_WORKFLOW ?? null,
    workflowRef: process.env.GITHUB_WORKFLOW_REF ?? null,
    runId: process.env.GITHUB_RUN_ID ?? null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    runNumber: process.env.GITHUB_RUN_NUMBER ?? null,
    runUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
    eventName: process.env.GITHUB_EVENT_NAME ?? null,
    ref: process.env.GITHUB_REF ?? null,
    sha: process.env.GITHUB_SHA ?? null,
    actor: process.env.GITHUB_ACTOR ?? null,
    runnerOs: process.env.RUNNER_OS ?? null,
    node: process.version,
  },
  jobResults: jobs,
  requiredJobs,
  failedOrSkippedJobs: failures,
  releaseInvariants,
  releaseGate: Object.values(releaseInvariants).every(Boolean) ? 'PASS' : 'FAIL',
  locks: {
    affineUpstream: stableLock,
    zipAuthority,
  },
  repositoryFileHashes: {
    workflow: hashFile('.github/workflows/brainlink-ci.yml'),
    stableLock: hashFile('AFFINE_UPSTREAM.lock'),
    zipAuthorityLock: hashFile('BRAINLINK_ZIP_AUTHORITY.lock'),
    stableManifest: hashFile('BRAINLINK_RUNTIME_V2.sha256'),
    zipCandidateFullManifest: hashFile('BRAINLINK_ZIP_CANDIDATE_V23.sha256'),
    zipCandidateRuntimeManifest: hashFile('BRAINLINK_ZIP_CANDIDATE_V23_RUNTIME.sha256'),
    nonbreakageGuard: hashFile('scripts/brainlink-nonbreakage-guard.mjs'),
    transportAuditor: hashFile('scripts/brainlink-audit-v23-transport.mjs'),
    evidenceGenerator: hashFile('scripts/brainlink-ci-evidence.mjs'),
  },
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ output, releaseGate: evidence.releaseGate, failures, releaseInvariants }, null, 2));

if (enforce && evidence.releaseGate !== 'PASS') {
  console.error(`Brainlink release evidence gate failed: ${failures.join(', ') || 'release invariant failure'}`);
  process.exit(1);
}
