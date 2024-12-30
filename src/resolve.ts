/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/return-await */

import type { ExecutableValue, Streamable } from "./types";

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
  if (element === null || element === undefined) {
    throw new Error("Cannot execute null or undefined element");
  }

  try {
    // use the shared resolver
    return resolveDeep(element);
  } finally {
    // Context cleanup handled by withContext
  }
}
