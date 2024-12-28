import type {
  ComponentProps,
  ExecutableValue,
  Streamable,
  StreamComponent,
  WorkflowComponent,
} from "./types";

import { JSX } from "./jsx-runtime";
import { isInStreamingContext } from "./stream";
import { setStreamingContext } from "./stream";

type ComponentType<P, O> = WorkflowComponent<P, O> | StreamComponent<P, O>;

// Helper to check if something is a JSX element
function isJSXElement<P, O>(
  element: unknown,
): element is JSX.Element & {
  type: ComponentType<P, O>;
  props: ComponentProps<P, O>;
} {
  const el = element as { type: ComponentType<P, O> };
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return (
    typeof element === "object" &&
    element !== null &&
    "type" in element &&
    "props" in element &&
    typeof el.type === "function" &&
    (("isWorkflowComponent" in el.type &&
      el.type.isWorkflowComponent === true) ||
      ("isStreamComponent" in el.type && el.type.isStreamComponent === true))
  );
}

// Helper to check if something is a streamable value
function isStreamable<T>(value: unknown): value is Streamable<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "stream" in value &&
    "value" in value &&
    typeof (value as Streamable<T>).stream === "function" &&
    value.value instanceof Promise
  );
}

/**
 * Deeply resolves any value, handling promises, arrays, objects, and JSX elements.
 * This is the core resolution logic used by both execute() and the JSX runtime.
 */
export async function resolveDeep<T>(value: unknown): Promise<T> {
  // Handle promises first
  if (value instanceof Promise) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const resolved = await value;
    return resolveDeep(resolved);
  }

  // Handle streamable values
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (isStreamable(value)) {
    if (isInStreamingContext()) {
      return value as T;
    }
    // Outside streaming context, resolve the value
    const finalValue = await value.value;
    // Recursively resolve in case the value itself is a Streamable
    return resolveDeep(finalValue);
  }

  // Handle arrays
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (element === null || element === undefined) {
    throw new Error("Cannot execute null or undefined element");
  }

  // Get initial streaming context state
  const initialStreamingContext = isInStreamingContext();

  try {
    // Handle JSX elements specially to support children functions
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (isJSXElement(element)) {
      const componentResult = await element.type(element.props);

      // Check if result is streamable in streaming context first
      if (isStreamable(componentResult) && isInStreamingContext()) {
        if (element.props.children) {
          // With children, let them handle the streamable
          const childrenResult = await element.props.children(componentResult);
          return execute(childrenResult as ExecutableValue);
        }
        // No children, preserve the streamable
        return componentResult as T;
      }

      // Handle non-streaming cases
      if (element.props.children) {
        const resolvedResult = await resolveDeep(componentResult);
        const childrenResult = await element.props.children(resolvedResult);
        return execute(childrenResult as ExecutableValue);
      }

      // No children, resolve the result
      return resolveDeep(componentResult);
    }

    // For all other cases, use the shared resolver
    return resolveDeep(element);
  } finally {
    // Only restore streaming context if it changed during execution
    if (isInStreamingContext() !== initialStreamingContext) {
      setStreamingContext(initialStreamingContext);
    }
  }
}
