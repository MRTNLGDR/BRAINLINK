# Brainlink Windows one-click installer — 2026-08-09

## Decision

The supported Windows user entrypoint is now exactly:

```bat
BRAINLINK.bat
```

It is an idempotent bootstrap, updater, repair path, installer, verifier, production builder, local launcher and browser smoke test. The compatibility BATs delegate to this same pipeline; they no longer implement separate partial setup logic.

## Failures found in the previous path

### 1. Immutable dependency install could never succeed reliably

The pinned AFFiNE source and `yarn.lock` were from `toeverything/AFFiNE` `v0.27.0`, but `.brainlink-runtime-overrides/package.json` contained a different dependency snapshot. Examples included:

- `@capacitor/cli` `^8.4.2` instead of upstream `^7.6.5`;
- Vitest packages `^4.1.10` instead of upstream `^4.1.8`;
- `oxlint` `1.76.0` instead of upstream `1.68.0`;
- OpenTelemetry and `js-yaml` resolution drift;
- `tar` `^7.5.21` instead of upstream `^7.5.16`.

Immediately after copying that package file, setup ran `yarn install --immutable`. Yarn correctly rejected the changed dependency graph.

**Correction:** the root package override was removed. After applying the historical overlay, the materializer restores `package.json`, `yarn.lock`, `.yarnrc.yml` and `.yarn/releases/yarn-4.13.0.cjs` from the exact upstream Git commit. A deterministic package patch verifies the official `package.json` Git blob and adds only Brainlink metadata/scripts. Runtime validation verifies the lock-sensitive versions.

### 2. BATs assumed an already-configured developer machine

The old BATs required compatible Node, Git, Corepack, Yarn and Windows symbolic-link support but did not install or repair them.

**Correction:** `brainlink-bootstrap.ps1` installs private toolchains under the canonical Brainlink home:

- Node.js `22.23.0`, matching AFFiNE `.nvmrc`, with architecture-specific pinned SHA-256;
- current official MinGit selected from `git-for-windows/git` release metadata;
- MinGit release digest verification when published, with Authenticode verification as a fail-closed fallback;
- private Git config for long paths, symlinks and LF checkout.

No global Node/Yarn/Corepack installation is required.

### 3. Moving the downloaded folder broke relative workspace assumptions

The previous scripts created `.brainlink-workspace` beside whatever BAT happened to be clicked. Moving or replacing the downloaded folder orphaned that workspace.

**Correction:** the downloaded folder is only a bootstrap. Persistent state is rooted at:

```text
D:\AIIA\01-apps-canonicos\26-Brainlink
```

when `D:` exists, otherwise:

```text
%LOCALAPPDATA%\Brainlink
```

The managed source, workspace, tools, cache, logs, state, evidence and quarantine directories are independent from the bootstrap location.

### 4. No complete update/recovery path

The old setup failed on a revision mismatch and asked the user to delete directories manually.

**Correction:** invalid managed sources/workspaces are moved to timestamped quarantine, never silently deleted. The installer then reclones or resets to pinned refs. Brainlink source updates use `fetch`, hard reset to `origin/main` and clean only the managed source clone. User data and evidence are outside that clone.

### 5. “Server started” was not a user-level test

The old DEV BAT merely started a command. It did not prove that the route rendered in a browser.

**Correction:** the default path now:

1. creates a real production AFFiNE web build;
2. serves it from a local Node SPA server;
3. probes `/healthz` and `/brainlink`;
4. launches installed Microsoft Edge through Playwright in headless mode;
5. waits for rendered content;
6. requires Brainlink UI markers;
7. rejects unhandled page errors and failed same-origin assets;
8. writes a full-page screenshot and JSON evidence;
9. only then opens the browser for the user.

## Execution flow

```text
BRAINLINK.bat
  → brainlink-bootstrap.ps1
      → canonical home
      → portable Node checksum
      → official MinGit digest/signature
      → symlink/long-path test and automatic UAC only when required
      → brainlink-one-click.mjs
          → managed Brainlink clone/update
          → installer/non-breakage validators
          → brainlink-materialize.mjs
              → pinned AFFiNE clone/repair
              → base overlay checksum
              → readable overrides
              → restore lock-sensitive upstream files
              → Brainlink app/audit patches
              → lock-compatible package metadata patch
              → stable final-file manifest
              → Yarn 4.13.0 immutable install
              → 45 stable invariants
              → Vitest Brainlink suites
          → real AFFiNE web production build
          → local server
          → HTTP health
          → Playwright/Edge user smoke
          → evidence
          → open browser
```

## Automatic recovery behavior

- interrupted tool download: `.partial` is removed and download restarts;
- bad Node archive: checksum failure deletes cache and downloads once more;
- incomplete Node/MinGit install: moved to quarantine and replaced atomically;
- wrong Brainlink source remote: quarantined and recloned;
- wrong/corrupt AFFiNE workspace: quarantined and recreated;
- stale generated Yarn state: removed before one automatic immutable-install retry;
- stale web output: removed before one automatic production-build retry;
- previous Brainlink server: its recorded process tree is stopped before update;
- duplicate installer launch: PID lock rejects the second process;
- update unavailable with an existing managed source: last local source may continue, but no success is claimed if dependencies/build/browser verification fail.

## Data preservation

The repair path never deletes arbitrary user paths. Destructive cleanup is limited to generated state inside the managed workspace. Invalid managed directories are moved to `quarantine`. Browser-local Brainlink state keeps a stable origin at `127.0.0.1:8080`.

## Stable/candidate boundary

The one-click path materializes stable `v2.1`. It does not read `.brainlink-v22-overrides` or the ZIP-authoritative v2.3 candidate transport. Candidate promotion remains governed and separate.

## Verification gates

A successful user run requires all of the following in the same execution:

- portable toolchain verification;
- Brainlink source update or valid cached source;
- exact AFFiNE commit;
- overlay and manifest checksums;
- dependency-lock compatibility;
- immutable dependency install;
- stable validator;
- Brainlink tests;
- production web build;
- local HTTP health;
- real browser route render;
- screenshot/JSON evidence.

Any failed gate exits non-zero and leaves a visible log path. There is no fallback mock, fake route, fake server response or simulated browser success.
