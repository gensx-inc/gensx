/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
import { getCurrentContext } from "./context.js";

// JSON-serializable value type for progress data
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type WorkflowMessage =
  | { type: "start"; workflowExecutionId?: string; workflowName: string }
  | {
      type: "component-start";
      componentName: string;
      label?: string;
      componentId: string;
    }
  | {
      type: "component-end";
      componentName: string;
      label?: string;
      componentId: string;
    }
  | { type: "data"; data: JsonValue }
  | { type: "object" | "event"; data: Record<string, JsonValue>; label: string }
  | { type: "error"; error: string }
  // | { type: "wait-for-input"; nodeId: string }
  | { type: "end" };

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
export function publishEvent<
  T extends Record<string, JsonValue> = Record<string, JsonValue>,
>(label: string, data: T) {
  const context = getCurrentContext();
  context.getWorkflowContext().sendWorkflowMessage({
    type: "event",
    label,
    data,
  });
}

/**
 * Publish a state to the workflow message stream. A State represents a snapshot of an object that is updated over time.
 *
 * @param label - The label of the state.
 * @param data - The data to publish.
 */
export function publishObject<
  T extends Record<string, JsonValue> = Record<string, JsonValue>,
>(label: string, data: T) {
  const context = getCurrentContext();
  context.getWorkflowContext().sendWorkflowMessage({
    type: "object",
    label,
    data,
  });
}

/**
 * Create a function that publishes an event to the workflow message stream with the given label.
 *
 * @param label - The label of the event.
 * @returns A function that publishes an event to the workflow message stream.
 */
export function createEventStream<
  T extends Record<string, JsonValue> = Record<string, JsonValue>,
>(label: string) {
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
export function createObjectStream<
  T extends Record<string, JsonValue> = Record<string, JsonValue>,
>(label: string) {
  return (data: T) => {
    publishObject(label, data);
  };
}
