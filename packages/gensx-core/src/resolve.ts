/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ExecutionContext } from "./context.js";
import { isStreamable } from "./stream.js";

/**
 * Deeply resolves any value, handling promises, arrays, objects, and function values.
 * This is the core resolution logic used by the fluent API.
 */
export async function resolveDeep<T>(value: unknown): Promise<T> {
  // Handle promises first
  if (value instanceof Promise) {
    const resolved = (await value) as Promise<T>;
    return resolveDeep(resolved);
  }

  if (value instanceof ExecutionContext) {
    return value as T;
  }

  // Pass through any async iterable without consuming it
  if (value && typeof value === "object" && Symbol.asyncIterator in value) {
    return value as T;
  }

  // Pass through streamable values - they are handled by StreamComponent
  if (isStreamable(value)) {
    return value as unknown as T;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const resolvedArray = await Promise.all(
      value.map((item) => resolveDeep(item)),
    );
    return resolvedArray as T;
  }

  // Handle primitive wrapper objects (Number, String, Boolean)
  if (value instanceof Number) return value.valueOf() as T;
  if (value instanceof String) return value.valueOf() as T;
  if (value instanceof Boolean) return value.valueOf() as T;

  // Handle functions
  if (typeof value === "function" && value.name !== "Object") {
    // If it's a fluent component or function with the __gsxFramework property
    if ((value as any).__gsxFramework) {
      // Execute it and resolve the result
      return await resolveDeep((value as any)());
    }
    return value as T;
  }

  // Handle plain objects (but not null), but not class instances
  if (
    typeof value === "object" &&
    value !== null &&
    value.constructor.name === "Object"
  ) {
    const entries = Object.entries(value);
    const resolvedEntries = await Promise.all(
      entries.map(async ([key, val]) => [key, await resolveDeep(val)]),
    );
    return Object.fromEntries(resolvedEntries) as T;
  }

  // Base case: primitive value
  return value as T;
}
