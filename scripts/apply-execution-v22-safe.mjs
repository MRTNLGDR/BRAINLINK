// Transport-safety shim for the v2.2 source migrator.
// The published migrator emits target template literals from inside outer
// template literals. These bindings deliberately evaluate to their own literal
// source forms so the generated TypeScript keeps runtime interpolation intact.
globalThis.field = '${field}';
globalThis.worker = { name: '${worker.name}' };
globalThis.task = { title: '${task.title}' };
await import('./apply-execution-v22.mjs');
