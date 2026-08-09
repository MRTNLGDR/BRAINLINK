# Brainlink v2.3 promotion audit

This branch exists only to execute the complete GitHub Actions matrix against the pinned 17/17 compact runtime transport from main commit `6b7cea7199eec5ec92e1e93e4f9ad93b36f6cb4e`.

Current truth state:

```yaml
stable: v2.1
candidate: v2.3-zip-authority
candidate_status: NOT_PROMOTED
ci_evidence: PENDING
promotion_allowed: false
```

Promotion requires transport audit, immutable install, Brainlink tests, typecheck, production builds and a generated release evidence artifact with `releaseGate: PASS` for the exact candidate commit.
