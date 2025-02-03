import { ExecutionContext, getCurrentContext, withContext } from "./context";
import { isStreamable } from "./stream";
import { ExecutableValue } from "./types";
import {
  createWorkflowContext,
  WORKFLOW_CONTEXT_SYMBOL,
} from "./workflow-context";

/**
 * Deeply resolves any value, handling promises, arrays, objects, and JSX elements.
 * This is the core resolution logic used by both execute() and the JSX runtime.
 */
export async function resolveDeep<T>(value: unknown): Promise<T> {
  // Handle promises first
  if (value instanceof Promise) {
    const resolved = (await value) as Promise<T>;
    return resolveDeep(resolved);
  }

  if (value instanceof ExecutionContext) {
    return value as T;
  }

  // Pass through any async iterable without consuming it
  if (value && typeof value === "object" && Symbol.asyncIterator in value) {
    return value as T;
  }

  // Pass through streamable values - they are handled by execute
  if (isStreamable(value)) {
    return value as unknown as T;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const resolvedArray = await Promise.all(
      value.map(item => resolveDeep(item)),
    );
    return resolvedArray as T;
  }

  // Handle objects (but not null)
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value);
    const resolvedEntries = await Promise.all(
      entries.map(async ([key, val]) => [key, await resolveDeep(val)]),
    );
    return Object.fromEntries(resolvedEntries) as T;
  }

  if (typeof value === "function") {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return await resolveDeep(await value());
  }

  // Base case: primitive value
  return value as T;
}

/**
 * Executes a JSX element or any other value in the current workflow context.
 * This should be used within components to execute child components.
 */
export async function execute<T>(element: ExecutableValue): Promise<T> {
  // TODO: add checks to make sure we have an existing workflow context.
  // https://github.com/gensx-inc/gensx/issues/222
  const context = getCurrentContext().getWorkflowContext();
  const result = (await resolveDeep(element)) as T;
  context.checkpointManager.write();
  return result;
}

/**
 * Creates and executes a new workflow with its own isolated context.
 * This should be used for top-level workflow execution.
 */
export async function workflow<T>(element: ExecutableValue): Promise<T> {
  // Create a fresh context with new workflow
  const workflowContext = createWorkflowContext();
  const newContext = new ExecutionContext({
    [WORKFLOW_CONTEXT_SYMBOL]: workflowContext,
  });

  // Run in new context
  return await withContext(newContext, async () => {
    const result = await resolveDeep(element);
    workflowContext.checkpointManager.write();
    return result as T;
  });
}

/**
 * Executes a child component in an isolated context while maintaining the parent's resolution chain.
 * This should be used within component children functions to execute nested components.
 */
export async function executeChild<T>(element: ExecutableValue): Promise<T> {
  // Create new context with isolated scope
  const currentContext = getCurrentContext();
  const childContext = new ExecutionContext(
    currentContext.workflowContext,
    true, // Mark as executeChild scope
  );

  return await withContext(childContext, async () => {
    // If it's a function, execute it directly
    if (typeof element === "function") {
      const result = await (element as () => Promise<T>)();
      return result;
    }
    // Otherwise resolve it through the normal resolution chain
    return resolveDeep<T>(element);
  });
}
