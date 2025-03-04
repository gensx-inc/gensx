import type { Streamable } from "./types.js";

// Helper to check if something is a streamable value
export function isStreamable(value: unknown): value is Streamable {
  return (
    typeof value === "object" &&
    value !== null &&
    // Verify that it's an async iterator
    "next" in value &&
    typeof (value as AsyncIterator<string>).next === "function" &&
    // Verify that it has the async iterator symbol
    ((Symbol.asyncIterator in value &&
      typeof value[Symbol.asyncIterator] === "function") ||
      (Symbol.iterator in value &&
        typeof value[Symbol.iterator] === "function"))
  );
}
