import {
  InferToolParams,
  InferToolResult,
  ToolBox,
  ToolImplementations,
} from "@gensx/core";

// Helper to create tool implementations with type safety
export function createToolImplementations<T extends ToolBox>(implementations: {
  [K in keyof T]: (
    params: InferToolParams<T, K>,
  ) => InferToolResult<T, K> | Promise<InferToolResult<T, K>>;
}): ToolImplementations<T> {
  return Object.fromEntries(
    Object.entries(implementations).map(([name, impl]) => [
      name,
      { execute: impl as unknown },
    ]),
  ) as ToolImplementations<T>;
}
