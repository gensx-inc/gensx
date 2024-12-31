import type { Streamable, StreamComponent } from "./types";

import { getCurrentContext } from "./context";

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

// Helper to check if something is a streamable value
export function isStreamable<T>(value: unknown): value is Streamable<T> {
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
  const context = getCurrentContext();
  const result = context.hasStreamingInChain();
  return result;
}
