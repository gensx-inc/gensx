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
  | { type: "message"; data: JsonValue }
  | { type: "state"; data: Record<string, JsonValue>; label: string }
  | { type: "event"; data: Record<string, JsonValue>; label: string }
  | { type: "error"; error: string }
  | { type: "end" };

export type WorkflowMessageListener = (message: WorkflowMessage) => void;

export function sendMessage(data: JsonValue) {
  const context = getCurrentContext();
  context.getWorkflowContext().sendWorkflowMessage({
    type: "message",
    data,
  });
}

export function sendEvent<
  T extends Record<string, JsonValue> = Record<string, JsonValue>,
>(label: string, data: T) {
  const context = getCurrentContext();
  context.getWorkflowContext().sendWorkflowMessage({
    type: "event",
    label,
    data,
  });
}

export function sendState<
  T extends Record<string, JsonValue> = Record<string, JsonValue>,
>(label: string, data: T) {
  const context = getCurrentContext();
  context.getWorkflowContext().sendWorkflowMessage({
    type: "state",
    label,
    data,
  });
}

export function useEventStream<
  T extends Record<string, JsonValue> = Record<string, JsonValue>,
>(label: string) {
  return (data: T) => {
    sendEvent(label, data);
  };
}

export function useWorkflowState<
  T extends Record<string, JsonValue> = Record<string, JsonValue>,
>(label: string) {
  return (data: T) => {
    sendState(label, data);
  };
}
