import { CheckpointManager } from "./checkpoint.js";
import { getCurrentContext } from "./context.js";

// Static symbol for workflow context
export const WORKFLOW_CONTEXT_SYMBOL = Symbol.for("gensx.workflow");

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type FullProgressEvent = {
  id: string;
  timestamp: number;
} & ProgressEvents;
export type ProgressEvents =
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
  | { type: "progress"; message: JsonValue }
  | { type: "error"; payload: Error }
  | { type: "end" };

export type ProgressListener = (progressEvent: FullProgressEvent) => void;
export type ProgressListenerSansId = (progressEvent: ProgressEvents) => void;

export interface WorkflowExecutionContext {
  checkpointManager: CheckpointManager;
  progressListener: ProgressListenerSansId;
  // Future: Add more workflow-level utilities here
}

export function createWorkflowContext(
  progressListener?: ProgressListener,
): WorkflowExecutionContext {
  const progressManager = new ProgressManager(progressListener);
  return {
    checkpointManager: new CheckpointManager(),
    progressListener: progressManager._emitProgressRaw.bind(progressManager),
  };
}

// We use a class here to track state for the ids, to ensure they are unique.
class ProgressManager {
  private id = 0;
  constructor(private progressListener?: ProgressListener) {}

  _emitProgressRaw(progressEvent: ProgressEvents) {
    this.id++;
    this.progressListener?.({
      id: this.id.toString(),
      timestamp: Date.now(),
      ...progressEvent,
    });
  }

  emitProgress(message: JsonValue) {
    this._emitProgressRaw({
      type: "progress",
      message,
    });
  }
}

export function getWorkflowContext(): WorkflowExecutionContext | undefined {
  const context = getCurrentContext();
  return context.getWorkflowContext();
}
