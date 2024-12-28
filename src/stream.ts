import type { Element, StreamComponent, Streamable } from "./types";

import { execute } from "./resolve";

// Global state to track streaming context
let isStreaming = false;

// Helper to set streaming context
export function setStreamingContext(value: boolean): void {
  isStreaming = value;
}

// Helper to check if a component is a stream component
export function isStreamComponent(
  component: unknown,
): component is StreamComponent<unknown, unknown> {
  return (
    typeof component === "function" &&
    "isStreamComponent" in component &&
    component.isStreamComponent === true
  );
}

// Component to enable streaming for its children
export async function Stream<T>(props: {
  children: Element;
}): Promise<T | Streamable<T>> {
  const prevIsStreaming = isInStreamingContext();
  setStreamingContext(true);

  try {
    const result = await execute<T | Streamable<T>>(props.children);
    // If we got a streamable result, return it directly
    if (isStreamable(result)) {
      return result;
    }
    return result as T;
  } finally {
    // Don't restore streaming context here - it needs to persist through the outer JSX runtime
  }
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

// Helper to check if we're in a streaming context
export function isInStreamingContext(): boolean {
  return isStreaming;
}
