import { CheckpointManager } from "./checkpoint.js";
import { getCurrentContext } from "./context.js";

// Static symbol for workflow context
export const WORKFLOW_CONTEXT_SYMBOL = Symbol.for("gensx.workflow");

export interface WorkflowExecutionContext {
  checkpointManager: CheckpointManager;
  // Future: Add more workflow-level utilities here
}

export function createWorkflowContext(): WorkflowExecutionContext {
  return {
    checkpointManager: new CheckpointManager({
      apiKey: "test-api-key", 
      org: "test-org",
      disabled: true // Disable checkpoints in tests
    }),
  };
}

export function getWorkflowContext(): WorkflowExecutionContext | undefined {
  const context = getCurrentContext();
  return context.getWorkflowContext();
}
