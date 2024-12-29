import type {
  ComponentProps,
  ExecutableValue,
  Streamable,
  StreamComponent,
  StreamComponentProps,
  WorkflowComponent,
} from "./types";

import { ExecutionContext } from "./context";
import { JSX } from "./jsx-runtime";

type ComponentType<P, O> = WorkflowComponent<P, O> | StreamComponent<P, O>;

// Helper to check if something is a JSX element
function isJSXElement<P, O>(
  element: unknown,
): element is JSX.Element & {
  type: ComponentType<P, O>;
  props: ComponentProps<P, O> | StreamComponentProps<P, O>;
} {
  const el = element as { type: ComponentType<P, O> };
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
function isStreamable(value: unknown): value is Streamable<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "stream" in value &&
    "value" in value &&
    typeof (value as { stream: unknown }).stream === "function" &&
    (value as { value: unknown }).value instanceof Promise
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
export async function execute<T>(
  element: ExecutableValue,
  context?: ExecutionContext,
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (element === null || element === undefined) {
    throw new Error("Cannot execute null or undefined element");
  }

  try {
    // Handle JSX elements specially to support children functions
    if (isJSXElement(element)) {
      const componentResult = await element.type(element.props);

      // If this is a Stream component, check stream prop
      const isStreamComponent =
        "isStreamComponent" in element.type &&
        element.type.isStreamComponent === true;

      if (isStreamComponent) {
        const streamProps = element.props as StreamComponentProps<
          unknown,
          unknown
        >;
        const shouldStream = streamProps.stream ?? false;

        // Only preserve streaming if this component explicitly declares stream=true
        if (shouldStream && isStreamable(componentResult)) {
          return componentResult as unknown as T;
        }
      }

      // Handle children function
      if (element.props.children) {
        const resolvedResult = await resolveDeep(componentResult);
        const childrenResult = await element.props.children(
          resolvedResult as any,
        );
        return execute(childrenResult as ExecutableValue, context);
      }

      // No children, resolve the result
      return resolveDeep(componentResult);
    }

    // For all other cases, use the shared resolver
    return resolveDeep(element);
  } finally {
    // Context cleanup handled by withContext
  }
}
