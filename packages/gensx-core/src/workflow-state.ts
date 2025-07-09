/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
import { getCurrentContext } from "./context.js";
import { compare, applyPatch } from "fast-json-patch";
import { diffChars } from "diff";

// Define the Change type based on diff library output
interface Change {
  count?: number;
  added?: boolean;
  removed?: boolean;
  value: string;
}

// Define JSON Patch operation types based on RFC 6902
interface BaseOperation {
  path: string;
}

interface AddOperation<T> extends BaseOperation {
  op: 'add';
  value: T;
}

interface RemoveOperation extends BaseOperation {
  op: 'remove';
}

interface ReplaceOperation<T> extends BaseOperation {
  op: 'replace';
  value: T;
}

interface MoveOperation extends BaseOperation {
  op: 'move';
  from: string;
}

interface CopyOperation extends BaseOperation {
  op: 'copy';
  from: string;
}

interface TestOperation<T> extends BaseOperation {
  op: 'test';
  value: T;
}

interface GetOperation<T> extends BaseOperation {
  op: '_get';
  value: T;
}

type JsonPatchOperation = AddOperation<any> | RemoveOperation | ReplaceOperation<any> | MoveOperation | CopyOperation | TestOperation<any> | GetOperation<any>;

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

export interface StringDiffOperation {
  op: "string-diff";
  path: string;
  diff: Array<{
    type: "retain" | "insert" | "delete";
    count?: number;
    value?: string;
  }>;
}

// Combined operation type including standard JSON Patch and our extensions
export type Operation = JsonPatchOperation | StringAppendOperation | StringDiffOperation;

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

// Store the current state of published objects
const objectStateMap = new Map<string, JsonValue>();

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
  const previousData = objectStateMap.get(label);
  
  if (previousData === undefined) {
    // First time publishing this object - send complete data as patches
    const patches = compare({}, newData ?? {});
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
  objectStateMap.set(label, newData);
}

/**
 * Generate optimized patches that use string-specific operations when beneficial
 */
function generateOptimizedPatches(oldData: JsonValue, newData: JsonValue): Operation[] {
  // First, get standard JSON patches
  const standardPatches = compare(oldData ?? {}, newData ?? {});
  const optimizedPatches: Operation[] = [];
  
  for (const patch of standardPatches) {
    if (patch.op === 'replace' && typeof patch.value === 'string') {
      // Check if this is a string replacement that could be optimized
      const oldValue = getValueByJsonPath(oldData, patch.path);
      
      if (typeof oldValue === 'string') {
        const newValue = patch.value;
        
        // Check if it's a simple append (common in streaming scenarios)
        if (newValue.startsWith(oldValue)) {
          const appendedText = newValue.slice(oldValue.length);
          if (appendedText.length > 0) {
            optimizedPatches.push({
              op: 'string-append',
              path: patch.path,
              value: appendedText,
            });
            continue;
          }
        }
        
        // For more complex changes, use string diff if it's beneficial
        const changes = diffChars(oldValue, newValue);
        const diffOperations = convertChangesToDiffOperations(changes);
        
        // Only use string-diff if it's smaller than the replace operation
        const diffSize = JSON.stringify(diffOperations).length;
        const replaceSize = JSON.stringify(newValue).length;
        
        if (diffSize < replaceSize && oldValue.length > 50) {
          optimizedPatches.push({
            op: 'string-diff',
            path: patch.path,
            diff: diffOperations,
          });
          continue;
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
function getValueByJsonPath(obj: JsonValue, path: string): any {
  const pathParts = path.split('/').slice(1); // Remove empty first element
  let current: any = obj;
  
  for (const part of pathParts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  
  return current;
}

/**
 * Convert diff changes to our diff operation format
 */
function convertChangesToDiffOperations(changes: Change[]): Array<{
  type: "retain" | "insert" | "delete";
  count?: number;
  value?: string;
}> {
  const operations: Array<{
    type: "retain" | "insert" | "delete";
    count?: number;
    value?: string;
  }> = [];
  
  for (const change of changes) {
    if (change.added) {
      operations.push({
        type: 'insert',
        value: change.value,
      });
    } else if (change.removed) {
      operations.push({
        type: 'delete',
        count: change.value.length,
      });
    } else {
      operations.push({
        type: 'retain',
        count: change.value.length,
      });
    }
  }
  
  return operations;
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
  objectStateMap.delete(label);
}

/**
 * Clear all stored object states. This is useful when starting a new workflow execution.
 */
export function clearAllObjectStates() {
  objectStateMap.clear();
}

/**
 * Apply a JSON patch to reconstruct object state. This is useful for consumers who want to reconstruct the full object state from patches.
 *
 * @param patches - The JSON patch operations to apply.
 * @param currentState - The current state of the object (defaults to empty object).
 * @returns The new state after applying the patches.
 */
export function applyObjectPatches(patches: Operation[], currentState: JsonValue = {}): JsonValue {
  let document = currentState;
  
  for (const operation of patches) {
    if (operation.op === 'string-append') {
      // Handle string append operation
      const pathParts = operation.path.split('/').slice(1); // Remove empty first element
      const target = getValueByPath(document, pathParts.slice(0, -1));
      const property = pathParts[pathParts.length - 1];
      
      if (target && typeof target === 'object' && target !== null) {
        const currentValue = (target as any)[property];
        if (typeof currentValue === 'string') {
          (target as any)[property] = currentValue + operation.value;
        } else {
          (target as any)[property] = operation.value;
        }
      }
    } else if (operation.op === 'string-diff') {
      // Handle string diff operation
      const pathParts = operation.path.split('/').slice(1);
      const target = getValueByPath(document, pathParts.slice(0, -1));
      const property = pathParts[pathParts.length - 1];
      
      if (target && typeof target === 'object' && target !== null) {
        const currentValue = (target as any)[property] || '';
        (target as any)[property] = applyStringDiff(currentValue, operation.diff);
      }
    } else {
      // Handle standard JSON Patch operations
      const standardPatches = [operation as JsonPatchOperation];
      const result = applyPatch(document, standardPatches);
      document = result.newDocument;
    }
  }
  
  return document;
}

/**
 * Helper function to get a value by path in an object
 */
function getValueByPath(obj: any, path: string[]): any {
  let current = obj;
  for (const segment of path) {
    if (current && typeof current === 'object' && segment in current) {
      current = current[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Apply string diff operations to reconstruct a string
 */
function applyStringDiff(originalString: string, diff: Array<{
  type: "retain" | "insert" | "delete";
  count?: number;
  value?: string;
}>): string {
  let result = '';
  let position = 0;
  
  for (const operation of diff) {
    switch (operation.type) {
      case 'retain':
        if (operation.count !== undefined) {
          result += originalString.slice(position, position + operation.count);
          position += operation.count;
        }
        break;
      case 'insert':
        if (operation.value !== undefined) {
          result += operation.value;
        }
        break;
      case 'delete':
        if (operation.count !== undefined) {
          position += operation.count; // Skip the deleted characters
        }
        break;
    }
  }
  
  return result;
}
