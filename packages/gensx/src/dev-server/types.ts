import { Definition } from "typescript-json-schema";

/**
 * Configuration options for the GenSX dev server
 */
export interface ServerOptions {
  port?: number;
  hostname?: string;
  logger: {
    info: (message: string, ...args: unknown[]) => void;
    error: (message: string, error?: unknown) => void;
    warn: (message: string) => void;
  };
}

/**
 * Interface representing a workflow that can be executed
 */
export interface WorkflowInfo {
  id: string;
  name: string;
  inputSchema?: Definition;
  outputSchema?: Definition;
  createdAt: string;
  updatedAt: string;
  url: string;
}

/**
 * Execution status type
 */
export type ExecutionStatus =
  | "queued"
  | "starting"
  | "running"
  | "completed"
  | "failed";

/**
 * Interface representing a workflow execution
 */
export interface WorkflowExecution {
  id: string;
  workflowName: string;
  executionStatus: ExecutionStatus;
  createdAt: string;
  finishedAt?: string;
  input: unknown;
  output?: unknown;
  error?: string;
  workflowMessages: WorkflowMessageList;
}

export class CustomEvent<T> extends Event {
  detail: T;
  constructor(
    message: string,
    data: {
      bubbles?: boolean;
      cancelable?: boolean;
      composed?: boolean;
      detail: T;
    },
  ) {
    super(message, data);
    this.detail = data.detail;
  }
}

export class WorkflowMessageList extends EventTarget {
  private messages: WorkflowMessage[] = [];

  constructor(messages?: WorkflowMessage[]) {
    super();
    this.messages = messages ?? [];
  }

  push(message: WorkflowMessage) {
    this.messages.push(message);
    this.dispatchEvent(new CustomEvent("message", { detail: message }));
  }

  getMessages() {
    return this.messages;
  }
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type WorkflowMessage = { id: string; timestamp: string } & (
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
  | { type: "object" | "event"; data: JsonValue; label: string }
  | { type: "error"; error: string }
  | { type: "end" }
  | {
      type: "external-tool";
      nodeId: string;
      toolName: string;
      params: JsonValue;
      paramsSchema: Definition;
      resultSchema: Definition;
      fulfilled: boolean;
    }
);

/**
 * Input request structure for handling external tool requests
 */
export interface InputRequest {
  nodeId: string;
  fulfilled: boolean;
  onInput?: (input: unknown) => void;
  data?: JsonValue;
}
