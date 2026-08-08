# Local materialization verification — 2026-08-08

The Brainlink runtime bundle was applied over a clean AFFiNE source tree and the final validator policy was executed with Node directly (dependency install/build excluded because the execution host is Node 24.x while AFFiNE 0.27.0 requires Node >=22.12 <23).

## Result

```text
PASS  Brainlink app exists
PASS  Desktop route registered
PASS  Desktop mobile-companion route registered
PASS  Mobile route registered
PASS  Mobile companion route registered
PASS  39 cataloged primary surfaces — found 39
PASS  5 contextual surfaces — found 5
PASS  44 total route intents — found 44
PASS  Universalis runtime implemented
PASS  Evidence gate implemented
PASS  Policy module exists
PASS  Policy unit tests exist
PASS  Cross-tab local sync implemented
PASS  Worker read gate implemented
PASS  Audit ledger implemented
PASS  Backup export implemented
PASS  Backup import validates schema
PASS  No secret value field in state model
PASS  AFFiNE technical workspace identity preserved
PASS  Brainlink scripts registered

20/20 checks passed.
```

Package identity/scripts observed after materialization:

```text
@affine/monorepo
brainlink:validate = node scripts/brainlink-validate.mjs
brainlink:dev = yarn dev
brainlink:build = yarn build
```

Registered routes observed after materialization:

```text
packages/frontend/core/src/desktop/router.tsx: /brainlink/*
packages/frontend/core/src/desktop/router.tsx: /m/brainlink/*
packages/frontend/core/src/mobile/router.tsx: /brainlink/*
packages/frontend/core/src/mobile/router.tsx: /m/brainlink/*
```

Runtime overlay SHA-256: `1b4e3aa98dd378eb7299e071aa83329643114e40b3e66a378c319613a2a94b8d`.
