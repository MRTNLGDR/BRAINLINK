// Transport-safety shim for the historical v2.2 source migrator.
// The migrator intentionally emits template literals into target TypeScript,
// but three placeholders were evaluated by the migrator's outer template.
// These bindings preserve the exact target source text instead of resolving
// values during migration. The v2.2 validators still verify the generated tree.
globalThis.field = '${field}';
globalThis.worker = Object.freeze({ name: '${worker.name}' });
globalThis.task = Object.freeze({ title: '${task.title}' });
await import('./apply-execution-v22.mjs');
