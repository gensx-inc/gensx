/* eslint-disable @typescript-eslint/no-explicit-any */
import { GsxArray } from "./array.js";
import { ExecutionContext } from "./context.js";
import { isStreamable } from "./stream.js";

/**
 * Checks if a value is a Pulumi Output by looking for the characteristic properties
 */
function isPulumiOutput(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  // Check for the __pulumiOutput property which is a more reliable indicator
  const obj = value as Record<string, unknown>;
  return (
    obj.__pulumiOutput === true ||
    // Fallback to checking for the apply method which is characteristic of Pulumi Output
    ("apply" in obj && typeof (obj.apply as any) === "function")
  );
}

/**
 * Checks if an object contains any Pulumi outputs as properties (recursively)
 */
function containsPulumiOutput(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;

  // Check if the object itself is a Pulumi output
  if (isPulumiOutput(obj)) return true;

  // Check if it's an array
  if (Array.isArray(obj)) {
    return obj.some((item) => containsPulumiOutput(item));
  }

  // Check all properties of the object
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as Record<string, unknown>)[key];
      if (isPulumiOutput(value) || containsPulumiOutput(value)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Deeply resolves any value, handling promises, arrays, objects, and JSX elements.
 * This is the core resolution logic used by both execute() and the JSX runtime.
 */
export async function resolveDeep<T>(value: unknown): Promise<T> {
  // Skip resolving Pulumi outputs
  if (isPulumiOutput(value)) {
    return value as T;
  }

  // Skip resolving objects that contain Pulumi outputs
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    containsPulumiOutput(value)
  ) {
    return value as T;
  }

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

  // Pass through streamable values - they are handled by execute (StreamComponent)
  if (isStreamable(value)) {
    return value as unknown as T;
  }

  // handle GsxArray
  if (value instanceof GsxArray) {
    return await resolveDeep(await value.toArray());
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

  // Handle functions first
  if (typeof value === "function" && value.name !== "Object") {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if ((value as any).__gsxFramework) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return await resolveDeep(value());
    }

    return value as T;
  }

  // Then handle objects (but not null)
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
