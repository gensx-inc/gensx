import type {
  JsonValue,
  Operation,
  WorkflowMessage,
  WorkflowObjectMessage,
} from "@gensx/core";

import * as fastJsonPatch from "fast-json-patch";
import { useEffect, useRef } from "react";
import { useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PublishableData = any;

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function useObject<T = JsonValue>(
  events: WorkflowMessage[],
  label: string,
): T | undefined {
  const [result, setResult] = useState<T | undefined>(undefined);

  // Store the reconstructed object and last processed event index
  const reconstructedRef = useRef<JsonValue>({});
  const lastIndexRef = useRef<number>(-1);
  const lastEventsRef = useRef<WorkflowMessage[]>([]);

  useEffect(() => {
    // Find all relevant object events
    const objectEvents = events.filter(
      (event): event is WorkflowObjectMessage =>
        event.type === "object" && event.label === label,
    );

    // Detect reset: events array replaced or truncated
    const isReset =
      events !== lastEventsRef.current ||
      objectEvents.length < lastIndexRef.current + 1;

    if (isReset) {
      reconstructedRef.current = {};
      lastIndexRef.current = -1;
    }

    // Apply only new patches
    for (let i = lastIndexRef.current + 1; i < objectEvents.length; i++) {
      const event = objectEvents[i];
      if (event.isInitial) {
        reconstructedRef.current = {};
      }
      try {
        reconstructedRef.current = applyObjectPatches(
          event.patches,
          reconstructedRef.current,
        );
      } catch (error) {
        console.warn(`Failed to apply patches for object "${label}":`, error);
      }
    }

    lastIndexRef.current = objectEvents.length - 1;
    lastEventsRef.current = events;

    setResult(
      objectEvents.length > 0 ? (reconstructedRef.current as T) : undefined,
    );
  }, [events, label]);

  return result;
}

/**
 * Apply a JSON patch to reconstruct object state. This is useful for consumers who want to reconstruct the full object state from patches.
 *
 * @param patches - The JSON patch operations to apply.
 * @param currentState - The current state of the object (defaults to empty object).
 * @returns The new state after applying the patches.
 */
function applyObjectPatches(
  patches: Operation[],
  currentState: PublishableData = {},
): PublishableData {
  let document = fastJsonPatch.deepClone(currentState);

  let standardPatches: fastJsonPatch.Operation[] = [];
  for (const operation of patches) {
    if (operation.op === "string-append") {
      // Handle string append operation
      if (operation.path === "") {
        // Root-level string append
        if (typeof document === "string") {
          document = document + operation.value;
        } else {
          // Warn and skip instead of throwing or replacing
          console.warn(
            `Cannot apply string-append: root value is not a string. Skipping operation.`,
          );
          // Do nothing
        }
        continue;
      }
      const pathParts = operation.path.split("/").slice(1); // Remove empty first element
      const target = getValueByPath(document, pathParts.slice(0, -1));
      const property = pathParts[pathParts.length - 1];

      if (typeof target === "object" && target !== null) {
        const currentValue = (target as Record<string, JsonValue>)[property];
        if (typeof currentValue === "string") {
          (target as Record<string, JsonValue>)[property] =
            currentValue + operation.value;
        } else {
          // Warn and skip instead of replacing
          console.warn(
            `Cannot apply string-append: target path '${operation.path}' is not a string. Skipping operation.`,
          );
          // Do nothing
        }
      } else {
        // Warn and skip instead of throwing
        console.warn(
          `Cannot apply string-append: target path '${operation.path}' does not exist or is not an object. Skipping operation.`,
        );
        // Do nothing
      }
    } else {
      // Handle standard JSON Patch operations
      standardPatches.push(operation);
    }
  }

  if (standardPatches.length > 0) {
    const result = fastJsonPatch.applyPatch(
      document,
      fastJsonPatch.deepClone(standardPatches) as fastJsonPatch.Operation[],
    );
    return result.newDocument;
  }

  return document;
}

/**
 * Helper function to get a value by path in an object or array (RFC 6901 compliant)
 */
function getValueByPath(obj: PublishableData, path: string[]): PublishableData {
  let current: PublishableData = obj;
  for (const segment of path) {
    if (Array.isArray(current)) {
      const idx = Number(segment);
      if (!Number.isNaN(idx) && idx >= 0 && idx < current.length) {
        current = current[idx];
      } else {
        return undefined;
      }
    } else if (isPlainObject(current)) {
      if (segment in current) {
        current = current[segment];
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Utility to check if a value is a non-null, non-array object
 */
function isPlainObject(val: unknown): val is Record<string, JsonValue> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}
