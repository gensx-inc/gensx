import { CheckpointManager } from "./checkpoint.js";
import { getCurrentContext } from "./context.js";

// Static symbol for workflow context
export const WORKFLOW_CONTEXT_SYMBOL = Symbol.for("gensx.workflow");

export type ProgressEvent =
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
  | { type: "progress"; [key: string]: string }
  | { type: "error"; error: string }
  | { type: "end" };

export type ProgressListener = (progressEvent: ProgressEvent) => void;

export interface WorkflowExecutionContext {
  checkpointManager: CheckpointManager;
  progressListener: ProgressListener;
  // Future: Add more workflow-level utilities here
}

export function createWorkflowContext(
  progressListener?: ProgressListener,
): WorkflowExecutionContext {
  return {
    checkpointManager: new CheckpointManager(),
    progressListener: (progressEvent: ProgressEvent) => {
      progressListener?.(progressEvent);
    },
  };
}

export function getWorkflowContext(): WorkflowExecutionContext | undefined {
  const context = getCurrentContext();
  return context.getWorkflowContext();
}
