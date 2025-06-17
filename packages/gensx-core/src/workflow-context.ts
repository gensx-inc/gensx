import { CheckpointManager } from "./checkpoint.js";
import { getCurrentContext } from "./context.js";
import { WorkflowMessage, WorkflowMessageListener } from "./workflow-state.js";

// Static symbol for workflow context
export const WORKFLOW_CONTEXT_SYMBOL = Symbol.for("gensx.workflow");

export interface WorkflowExecutionContext {
  checkpointManager: CheckpointManager;
  sendWorkflowMessage: WorkflowMessageListener;
  onWaitForInput: (nodeId: string) => Promise<void>;
  // Future: Add more workflow-level utilities here
}

export function createWorkflowContext({
  onMessage,
  onWaitForInput,
}: {
  onMessage?: WorkflowMessageListener;
  onWaitForInput?: (nodeId: string) => Promise<void>;
} = {}): WorkflowExecutionContext {
  return {
    checkpointManager: new CheckpointManager(),
    sendWorkflowMessage: (message: WorkflowMessage) => {
      onMessage?.(message);
    },
    onWaitForInput:
      onWaitForInput ??
      // eslint-disable-next-line @typescript-eslint/require-await
      (async () => {
        console.warn("[GenSX] Pause/resume not supported in this environment");
      }),
  };
}

export function getWorkflowContext(): WorkflowExecutionContext | undefined {
  const context = getCurrentContext();
  return context.getWorkflowContext();
}
