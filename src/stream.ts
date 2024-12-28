import type { Element, Streamable, StreamComponent } from "./types";

import { getCurrentContext, withContext } from "./context";
import { execute } from "./resolve";

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
  return withContext({ streaming: true }, async () => {
    const result = await execute<T | Streamable<T>>(props.children);
    // Always preserve streamable results in streaming context
    if (isStreamable(result)) {
      return result;
    }
    // Non-streamable results pass through
    return result as T;
  });
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
  const context = getCurrentContext();
  const result = context.hasStreamingInChain();
  return result;
}
