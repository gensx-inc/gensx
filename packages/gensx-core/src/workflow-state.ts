/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
import { getCurrentContext } from "./context.js";
import { compare, applyPatch, Operation } from "fast-json-patch";

// JSON-serializable value type for progress data
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

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
    const patches = compare({}, newData);
    workflowContext.sendWorkflowMessage({
      type: "object",
      label,
      patches,
      isInitial: true,
    });
  } else {
    // Generate patches from previous state to new state
    const patches = compare(previousData, newData);
    
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
  const result = applyPatch(currentState, patches);
  return result.newDocument;
}
