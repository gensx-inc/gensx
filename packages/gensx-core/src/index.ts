export * from "./context.js";
export * from "./component.js";
export * from "./types.js";
export * from "./stream.js";
export * from "./workflow-context.js";

// Explicitly export new (now renamed) decorators to ensure they are available
// and to be clear about the main exports for this new model.
export { Component, StreamComponent, Workflow } from "./component.js";

// Let's check if the `export * from "./component.js";` already includes them.
// If `component.ts` has `export function AutoComponent...`, then it should be fine.
// Yes, the decorators are exported functions in component.ts so they are covered.
