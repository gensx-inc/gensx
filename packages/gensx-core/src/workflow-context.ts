import { CheckpointManager } from "./checkpoint.js";
import { getCurrentContext } from "./context.js";
import { WorkflowMessage, WorkflowMessageListener } from "./workflow-state.js";

// Static symbol for workflow context
export const WORKFLOW_CONTEXT_SYMBOL = Symbol.for("gensx.workflow");

export interface WorkflowExecutionContext {
  checkpointManager: CheckpointManager;
  sendWorkflowMessage: WorkflowMessageListener;
  // Future: Add more workflow-level utilities here
}

export function createWorkflowContext(
  onMessage?: WorkflowMessageListener,
): WorkflowExecutionContext {
  return {
    checkpointManager: new CheckpointManager(),
    sendWorkflowMessage: (message: WorkflowMessage) => {
      onMessage?.(message);
    },
  };
}

export function getWorkflowContext(): WorkflowExecutionContext | undefined {
  const context = getCurrentContext();
  return context.getWorkflowContext();
}
