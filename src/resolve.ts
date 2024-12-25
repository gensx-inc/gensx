import { JSX } from "./jsx-runtime";
import { ComponentProps, ExecutableValue, WorkflowComponent } from "./types";

// Helper to check if something is a JSX element
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
function isJSXElement<P, O>(
  element: unknown,
): element is JSX.Element & {
  type: WorkflowComponent<P, O>;
  props: ComponentProps<P, O>;
} {
  return (
    typeof element === "object" &&
    element !== null &&
    "type" in element &&
    "props" in element &&
    typeof (element as any).type === "function" &&
    (element as any).type.isWorkflowComponent
  );
}
/* eslint-enable @typescript-eslint/no-unsafe-return */
/* eslint-enable @typescript-eslint/no-explicit-any */
/* eslint-enable @typescript-eslint/no-unsafe-member-access */

/**
 * Deeply resolves any value, handling promises, arrays, objects, and JSX elements.
 * This is the core resolution logic used by both execute() and the JSX runtime.
 */
export async function resolveDeep<T>(value: unknown): Promise<T> {
  // Handle promises first
  if (value instanceof Promise) {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const resolved = await value;
    return resolveDeep(resolved);
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const resolvedArray = await Promise.all(
      value.map(item => resolveDeep(item)),
    );
    return resolvedArray as T;
  }

  // Handle JSX elements
  if (isJSXElement(value)) {
    const componentResult = await value.type(value.props);
    return resolveDeep(componentResult);
  }

  // Handle objects (but not null)
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value);
    const resolvedEntries = await Promise.all(
      entries.map(async ([key, val]) => [key, await resolveDeep(val)]),
    );
    return Object.fromEntries(resolvedEntries) as T;
  }

  // Base case: primitive value
  return value as T;
}

/**
 * Executes a JSX element or any other value, ensuring all promises and nested values are resolved.
 * This is the main entry point for executing workflow components.
 */
export async function execute<T>(element: ExecutableValue): Promise<T> {
  /* eslint-disable @typescript-eslint/no-unnecessary-condition */
  if (element === null || element === undefined) {
    throw new Error("Cannot execute null or undefined element");
  }
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */

  // Handle JSX elements specially to support children functions
  if (isJSXElement(element)) {
    const componentResult = await element.type(element.props);
    const resolvedResult = await resolveDeep(componentResult);

    // Handle children after fully resolving the component's result
    if (element.props.children) {
      const childrenResult = await element.props.children(resolvedResult);
      return execute(childrenResult as ExecutableValue);
    }

    return resolvedResult as T;
  }

  // For all other cases, use the shared resolver
  return resolveDeep(element);
}
