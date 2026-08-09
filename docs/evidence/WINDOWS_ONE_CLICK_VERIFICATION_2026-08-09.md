# Windows one-click verification record — 2026-08-09

## Scope

This record covers the replacement of the fragmented Windows BAT flow with one self-contained public entrypoint, while preserving Brainlink stable/candidate boundaries and the AFFiNE pin.

## Static and deterministic verification completed before Windows CI

```text
PASS  JavaScript syntax — brainlink-package-patch.mjs
PASS  JavaScript syntax — brainlink-materialize.mjs
PASS  JavaScript syntax — brainlink-one-click.mjs
PASS  JavaScript syntax — brainlink-serve.mjs
PASS  JavaScript syntax — brainlink-browser-smoke.mjs
PASS  JavaScript syntax — brainlink-installer-validate.mjs
PASS  Local static server /healthz
PASS  Local SPA fallback /brainlink/world
PASS  Installer contract harness — 26/26
PASS  Stable manifest excludes package.json and candidate files
PASS  Stable package patch pins exact AFFiNE package Git blob
PASS  Stable materializer restores upstream package/lock/Yarn files
```

The local execution host is Linux and has no Windows PowerShell, Windows symlink policy, Edge installation or package-registry connectivity. It therefore cannot honestly replace the Windows user-path test.

## Real Windows gate

`.github/workflows/windows-one-click.yml` runs on a clean `windows-latest` host and invokes the same command exposed to the user:

```bat
BRAINLINK.bat --ci --no-launch --force
```

That workflow is required to complete:

- portable Node download/checksum;
- official MinGit download/verification;
- clean managed Brainlink clone/update;
- pinned AFFiNE materialization;
- immutable Yarn install;
- stable runtime validator;
- Brainlink Vitest suites;
- production web build;
- local HTTP health;
- Playwright/Edge browser smoke;
- screenshot and JSON evidence upload.

## Truth state

At document creation time:

```yaml
installer_source_review: VERIFIED
installer_invariants: 26/26_PASS
local_static_server_smoke: PASS
windows_clean_install: PENDING_GITHUB_ACTIONS
immutable_registry_install: PENDING_GITHUB_ACTIONS
production_web_build: PENDING_GITHUB_ACTIONS
real_edge_browser_smoke: PENDING_GITHUB_ACTIONS
```

This file must be updated from the actual workflow result. A configured workflow is not itself proof of a successful Windows install.
