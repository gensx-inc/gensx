import type { Element, ExecutableValue, StreamComponent } from "./types";

import { execute } from "./resolve";

// Global state to track streaming context
let isStreaming = false;

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
export async function Stream(props: {
  children: Element;
}): Promise<ExecutableValue> {
  const prevIsStreaming = isStreaming;
  isStreaming = true;

  try {
    return await execute(props.children);
  } finally {
    isStreaming = prevIsStreaming;
  }
}

// Helper to check if we're in a streaming context
export function isInStreamingContext(): boolean {
  return isStreaming;
}
