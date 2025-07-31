import { getWorkflowContext } from "./workflow-context.js";

/**
 * Get the execution scope passed to the workflow execution.
 * This includes any scoped token metadata or other execution context.
 *
 * @returns The execution scope object, or empty object if no execution scope is available
 */
export function getExecutionScope(): Record<string, unknown> {
  const context = getWorkflowContext();
  return context?.executionScope ?? {};
}
