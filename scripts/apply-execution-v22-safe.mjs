// Transport-safety shim for the v2.2 source migrator.
// The published migrator contains an outer template literal that emits a target
// template literal using `${field}`. Supplying this exact global binding makes
// the emitted source contain the intended literal `${field}` instead of
// attempting to resolve it while constructing the parser block.
globalThis.field = '${field}';
await import('./apply-execution-v22.mjs');
