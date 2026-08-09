# BRAINLINK

Brainlink is a governed, local-first knowledge and agent workspace built as a compatibility-preserving layer on top of **AFFiNE v0.27.0**.

## Use only one file on Windows

Double-click:

```bat
BRAINLINK.bat
```

The same BAT is the installer, updater, repair tool, verifier, builder and launcher. It is safe to run again after downloading a newer copy, moving the downloaded folder, interrupting an install or changing machines.

On every normal run it:

1. selects the canonical Brainlink home (`D:\AIIA\01-apps-canonicos\26-Brainlink` when `D:` exists, otherwise `%LOCALAPPDATA%\Brainlink`);
2. installs a private **Node.js 22.23.0** runtime from the official Node archive and verifies its pinned SHA-256;
3. downloads the current official **MinGit** release, verifies the GitHub-published SHA-256 digest or Authenticode signature, and keeps it private to Brainlink;
4. enables/checks Windows long-path and symbolic-link capability required by AFFiNE;
5. clones or updates `MRTNLGDR/BRAINLINK` into the canonical managed source directory;
6. repairs/recreates the pinned AFFiNE `v0.27.0` workspace at commit `c61cc6a86f5f8364732296f0bb8393b37e0f70b3`;
7. verifies the base overlay, patches and every stable runtime file;
8. restores the exact upstream `package.json`, `yarn.lock`, `.yarnrc.yml` and bundled Yarn before adding Brainlink scripts, preventing dependency-lock drift;
9. runs `yarn install --immutable` through the bundled Yarn 4.13.0, without depending on Corepack;
10. runs stable structural validation and Brainlink Vitest suites;
11. builds the real AFFiNE web application;
12. starts a local SPA server, verifies `/healthz` and `/brainlink`;
13. opens the app in a real headless Edge session through Playwright, checks that Brainlink rendered, rejects unhandled page errors and stores browser screenshot/evidence;
14. opens `http://127.0.0.1:8080/brainlink` for the user.

Logs, state, downloads, evidence and the workspace live outside the downloaded bootstrap folder. Moving that folder therefore does not orphan the installed app.

### Compatibility wrappers

The older names now delegate to the same one-click pipeline:

```bat
BRAINLINK_SETUP.bat   rem install + validate + tests
BRAINLINK_BUILD.bat   rem install + validate + tests + production build
BRAINLINK_DEV.bat     rem install + validate + tests + AFFiNE dev server
```

Useful optional flags:

```bat
BRAINLINK.bat --force
BRAINLINK.bat --setup-only
BRAINLINK.bat --build-only
BRAINLINK.bat --dev
BRAINLINK.bat --skip-update
BRAINLINK.bat --offline
```

The default path remains the production web build. `--dev` is for development only.

## Root cause fixed

The previous stable materializer copied a historical root `package.json` whose dependency/resolution versions did not match the pinned AFFiNE `yarn.lock`. Because setup then invoked `yarn install --immutable`, installation was guaranteed to stop before the app could open. The old BATs also assumed Git, compatible Node, Corepack, Yarn and Windows symlink support already existed.

The root package is no longer shipped as a stable overlay. The materializer restores the exact upstream lock-sensitive files and applies only Brainlink metadata/scripts after verifying the official package Git blob. The stable manifest deliberately excludes mutable `package.json` while validating the final dependency contract at runtime.

## Stable runtime — v2.1

Stable v2.1 remains the normal recovery and user path. It includes:

- 39 primary + 5 contextual Brainlink route intents;
- scoped Universalis/read receipts;
- worker read gates and error retry gate;
- fresh-evidence gate for task completion;
- connector write approval gate;
- strict v1→v2 local-state migration/import validation;
- explicit bug-solution verification;
- Project World, projects, roadmap/tasks, workers, evidence, audit, approvals, connections, archetypes, calendar, settings, superadmin and mobile companion surfaces;
- secret values excluded from persisted `BrainlinkState`;
- tamper-evident SHA-256 audit chain with monotonic sequence, `prevHash` and `eventHash`;
- rejection of altered sealed audit history and no silent audit truncation.

The stable validator contains **45 structural/runtime invariants**. The repository one-click validator contains **26 installer/non-breakage invariants**. Windows CI executes the same public `BRAINLINK.bat --ci` path used by a clean user, including immutable install, tests, production build, local server and real-browser smoke.

## Source of truth and product boundaries

The primary Brainlink documentation authority remains the user-supplied `Brainlink_Documentacao_Completa_v1.0.0.zip` (SHA-256 `4bce9d511680c70d7cfd51dbc4ef203172a46fa4d10388acd16209fa6b556c09`). The Oráculo/COSMETA/Brainlink V5 document is secondary cross-product context only.

Brainlink remains the knowledge/governance plane. COSMETA remains the visual execution/canvas plane. Oráculo remains the execution/admin plane. Ultrabase remains an external data-plane boundary until its real runtime/manual/migrations are available. No external service is shown as connected or healthy without a real transport and evidence.

## Candidate runtime — not the default

`v2.3-zip-authority` remains `NOT_PROMOTED`. Candidate files and materializers stay physically separate from stable v2.1. Running `BRAINLINK.bat` never silently promotes or injects candidate code.

Candidate promotion still requires its own complete compatibility, security, rollback and installed-runtime evidence. The new one-click work improves the stable user path; it does not bypass that governance gate.

## Files and evidence

- `AFFINE_UPSTREAM.lock` — upstream, stable/candidate status and verification counters;
- `BRAINLINK_RUNTIME_V2.sha256` — immutable stable runtime file manifest;
- `scripts/brainlink-bootstrap.ps1` — portable Windows toolchain/bootstrap;
- `scripts/brainlink-one-click.mjs` — update/install/build/launch orchestrator;
- `scripts/brainlink-materialize.mjs` — deterministic stable materializer;
- `scripts/brainlink-browser-smoke.mjs` — real-user browser smoke;
- `scripts/brainlink-installer-validate.mjs` — installer invariants;
- `docs/48_WINDOWS_ONE_CLICK_INSTALLER_2026-08-09.md` — implementation and recovery contract;
- `docs/evidence/WINDOWS_ONE_CLICK_VERIFICATION_2026-08-09.md` — verification record and honest limits.
