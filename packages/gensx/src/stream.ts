import type { Streamable, StreamingComponent } from "./types";

import { getCurrentContext } from "./context";

// Helper to check if a component is a stream component
export function isStreamComponent(
  component: unknown,
): component is StreamingComponent<unknown, boolean> {
  return (
    typeof component === "function" &&
    "isStreamComponent" in component &&
    component.isStreamComponent === true
  );
}

// Helper to check if something is a streamable value
export function isStreamable(value: unknown): value is Streamable {
  return (
    typeof value === "object" &&
    value !== null &&
    // Verify that it's an async iterator
    "next" in value &&
    typeof (value as AsyncIterator<string>).next === "function" &&
    // Verify that it has the async iterator symbol
    Symbol.asyncIterator in value &&
    typeof value[Symbol.asyncIterator] === "function"
  );
}

// Helper to check if we're in a streaming context
export function isInStreamingContext(): boolean {
  const context = getCurrentContext();
  const result = context.hasStreamingInChain();
  return result;
}
