/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
import { applyPatch, compare } from "fast-json-patch";

import { getCurrentContext } from "./context.js";

// Define JSON Patch operation types based on RFC 6902
interface BaseOperation {
  path: string;
}

interface AddOperation<T> extends BaseOperation {
  op: "add";
  value: T;
}

interface RemoveOperation extends BaseOperation {
  op: "remove";
}

interface ReplaceOperation<T> extends BaseOperation {
  op: "replace";
  value: T;
}

interface MoveOperation extends BaseOperation {
  op: "move";
  from: string;
}

interface CopyOperation extends BaseOperation {
  op: "copy";
  from: string;
}

interface TestOperation<T> extends BaseOperation {
  op: "test";
  value: T;
}

interface GetOperation<T> extends BaseOperation {
  op: "_get";
  value: T;
}

type JsonPatchOperation =
  | AddOperation<JsonValue>
  | RemoveOperation
  | ReplaceOperation<JsonValue>
  | MoveOperation
  | CopyOperation
  | TestOperation<JsonValue>
  | GetOperation<JsonValue>;

// JSON-serializable value type for progress data
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// Extended operation types for optimized string handling
export interface StringAppendOperation {
  op: "string-append";
  path: string;
  value: string;
}

// Combined operation type including standard JSON Patch and our extensions
export type Operation = JsonPatchOperation | StringAppendOperation;

// Individual message types
export interface WorkflowStartMessage {
  type: "start";
  workflowExecutionId?: string;
  workflowName: string;
}

export interface WorkflowComponentStartMessage {
  type: "component-start";
  componentName: string;
  label?: string;
  componentId: string;
}

export interface WorkflowComponentEndMessage {
  type: "component-end";
  componentName: string;
  label?: string;
  componentId: string;
}

export interface WorkflowDataMessage {
  type: "data";
  data: JsonValue;
}

export interface WorkflowEventMessage {
  type: "event";
  data: JsonValue;
  label: string;
}

// Updated to support JSON patches
export interface WorkflowObjectMessage {
  type: "object";
  label: string;
  patches: Operation[];
  isInitial?: boolean;
}

export interface WorkflowErrorMessage {
  type: "error";
  error: string;
}

export interface WorkflowEndMessage {
  type: "end";
}

// Union of all message types
export type WorkflowMessage =
  | WorkflowStartMessage
  | WorkflowComponentStartMessage
  | WorkflowComponentEndMessage
  | WorkflowDataMessage
  | WorkflowEventMessage
  | WorkflowObjectMessage
  | WorkflowErrorMessage
  | WorkflowEndMessage;

export type WorkflowMessageListener = (message: WorkflowMessage) => void;

/**
 * Publish data to the workflow message stream. This is a low-level utility for putting arbitrary data on the stream.
 *
 * @param data - The data to publish.
 */
export function publishData(data: JsonValue) {
  const context = getCurrentContext();
  context.getWorkflowContext().sendWorkflowMessage({
    type: "data",
    data,
  });
}

/**
 * Publish an event to the workflow message stream. Labels group events together, and generally all events within the same label should be related with the same type.
 *
 * @param label - The label of the event.
 * @param data - The data to publish.
 */
export function publishEvent<T = JsonValue>(label: string, data: T) {
  const context = getCurrentContext();
  context.getWorkflowContext().sendWorkflowMessage({
    type: "event",
    label,
    data: data as JsonValue,
  });
}

/**
 * Publish a state to the workflow message stream. A State represents a snapshot of an object that is updated over time.
 * This now uses JSON patches to efficiently send only the differences between states.
 *
 * @param label - The label of the state.
 * @param data - The data to publish.
 */
export function publishObject<T = JsonValue>(label: string, data: T) {
  const context = getCurrentContext();
  const workflowContext = context.getWorkflowContext();

  const newData = data as JsonValue;
  const previousData = workflowContext.objectStateMap.get(label);

  if (previousData === undefined) {
    // First time publishing this object - send complete data as patches
    const patches = compare({}, newData as object);
    workflowContext.sendWorkflowMessage({
      type: "object",
      label,
      patches,
      isInitial: true,
    });
  } else {
    // Generate optimized patches from previous state to new state
    const patches = generateOptimizedPatches(previousData, newData);

    // Only send message if there are changes
    if (patches.length > 0) {
      workflowContext.sendWorkflowMessage({
        type: "object",
        label,
        patches,
        isInitial: false,
      });
    }
  }

  // Store the new state
  workflowContext.objectStateMap.set(label, newData);
}

/**
 * Generate optimized patches that use string-specific operations when beneficial
 */
function generateOptimizedPatches(
  oldData: JsonValue,
  newData: JsonValue,
): Operation[] {
  // First, get standard JSON patches
  const standardPatches = compare(oldData ?? {}, newData ?? {});
  const optimizedPatches: Operation[] = [];

  for (const patch of standardPatches) {
    if (patch.op === "replace" && typeof patch.value === "string") {
      // Check if this is a string replacement that could be optimized
      const oldValue = getValueByJsonPath(oldData as object, patch.path);

      if (typeof oldValue === "string") {
        const newValue = patch.value;

        // Check if it's a simple append (common in streaming scenarios)
        if (newValue.startsWith(oldValue)) {
          const appendedText = newValue.slice(oldValue.length);
          if (appendedText.length > 0) {
            optimizedPatches.push({
              op: "string-append",
              path: patch.path,
              value: appendedText,
            });
            continue;
          }
        }
      }
    }

    // Use standard patch if no optimization applies
    optimizedPatches.push(patch);
  }

  return optimizedPatches;
}

/**
 * Get a value from an object using a JSON pointer path
 */
function getValueByJsonPath(obj: object, path: string): JsonValue | undefined {
  const pathParts = path.split("/").slice(1); // Remove empty first element
  let current: Record<string, JsonValue> = obj as Record<string, JsonValue>;

  for (const part of pathParts) {
    if (typeof current === "object" && part in current) {
      current = current[part] as Record<string, JsonValue>;
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Create a function that publishes an event to the workflow message stream with the given label.
 *
 * @param label - The label of the event.
 * @returns A function that publishes an event to the workflow message stream.
 */
export function createEventStream<T extends JsonValue = JsonValue>(
  label: string,
) {
  return (data: T) => {
    publishEvent(label, data);
  };
}

/**
 * Create a function that publishes a state to the workflow message stream with the given label.
 *
 * @param label - The label of the state.
 * @returns A function that publishes a state to the workflow message stream.
 */
export function createObjectStream<T extends JsonValue = JsonValue>(
  label: string,
) {
  return (data: T) => {
    publishObject(label, data);
  };
}

/**
 * Clear stored state for a given label. This is useful when starting a new workflow execution.
 *
 * @param label - The label of the state to clear.
 */
export function clearObjectState(label: string) {
  const context = getCurrentContext();
  context.getWorkflowContext().objectStateMap.delete(label);
}

/**
 * Clear all stored object states. This is useful when starting a new workflow execution.
 */
export function clearAllObjectStates() {
  const context = getCurrentContext();
  context.getWorkflowContext().objectStateMap.clear();
}

/**
 * Apply a JSON patch to reconstruct object state. This is useful for consumers who want to reconstruct the full object state from patches.
 *
 * @param patches - The JSON patch operations to apply.
 * @param currentState - The current state of the object (defaults to empty object).
 * @returns The new state after applying the patches.
 */
export function applyObjectPatches(
  patches: Operation[],
  currentState: JsonValue = {},
): JsonValue {
  let document = currentState;

  for (const operation of patches) {
    if (operation.op === "string-append") {
      // Handle string append operation
      const pathParts = operation.path.split("/").slice(1); // Remove empty first element
      const target = getValueByPath(document, pathParts.slice(0, -1));
      const property = pathParts[pathParts.length - 1];

      if (typeof target === "object" && target !== null) {
        const currentValue = (target as Record<string, JsonValue>)[property];
        if (typeof currentValue === "string") {
          (target as Record<string, JsonValue>)[property] =
            currentValue + operation.value;
        } else {
          (target as Record<string, JsonValue>)[property] = operation.value;
        }
      }
    } else {
      // Handle standard JSON Patch operations
      const standardPatches = [operation];
      const result = applyPatch(document, standardPatches);
      document = result.newDocument;
    }
  }

  return document;
}

/**
 * Helper function to get a value by path in an object
 */
function getValueByPath(obj: JsonValue, path: string[]): JsonValue | undefined {
  let current: Record<string, JsonValue> = obj as Record<string, JsonValue>;
  for (const segment of path) {
    if (typeof current === "object" && segment in current) {
      current = current[segment] as Record<string, JsonValue>;
    } else {
      return undefined;
    }
  }
  return current;
}
