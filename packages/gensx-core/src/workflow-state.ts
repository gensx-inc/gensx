/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
import { JSONSchema } from "zod/v4/core";
import { zodToJsonSchema } from "zod-to-json-schema";

import { getCurrentContext } from "./context.js";

// JSON-serializable value type for progress data
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// Individual message types
export interface StartMessage {
  type: "start";
  workflowExecutionId?: string;
  workflowName: string;
}

export interface ComponentStartMessage {
  type: "component-start";
  componentName: string;
  label?: string;
  componentId: string;
}

export interface ComponentEndMessage {
  type: "component-end";
  componentName: string;
  label?: string;
  componentId: string;
}

export interface DataMessage {
  type: "data";
  data: JsonValue;
}

export interface EventMessage {
  type: "event";
  data: JsonValue;
  label: string;
}

export interface ObjectMessage {
  type: "object";
  data: JsonValue;
  label: string;
}

export interface ErrorMessage {
  type: "error";
  error: string;
}

export interface EndMessage {
  type: "end";
}

export interface ExternalToolMessage {
  type: "external-tool";
  toolName: string;
  params: JsonValue;
  paramsSchema: JSONSchema.BaseSchema | ReturnType<typeof zodToJsonSchema>;
  resultSchema: JSONSchema.BaseSchema | ReturnType<typeof zodToJsonSchema>;
  nodeId: string;
  sequenceNumber: number;
}

// Union of all message types
export type WorkflowMessage =
  | StartMessage
  | ComponentStartMessage
  | ComponentEndMessage
  | DataMessage
  | EventMessage
  | ObjectMessage
  | ErrorMessage
  | EndMessage
  | ExternalToolMessage;

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
 *
 * @param label - The label of the state.
 * @param data - The data to publish.
 */
export function publishObject<T = JsonValue>(label: string, data: T) {
  const context = getCurrentContext();
  context.getWorkflowContext().sendWorkflowMessage({
    type: "object",
    label,
    data: data as JsonValue,
  });
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
