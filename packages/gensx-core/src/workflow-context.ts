import { CheckpointManager, ExecutionNode } from "./checkpoint.js";
import { getCurrentContext } from "./context.js";
import {
  JsonValue,
  WorkflowMessage,
  WorkflowMessageListener,
} from "./workflow-state.js";

// Static symbol for workflow context
export const WORKFLOW_CONTEXT_SYMBOL = Symbol.for("gensx.workflow");

export type InputRequest =
  | {
      type: "input-request";
      nodeId: string;
    }
  | {
      type: "external-tool";
      toolName: string;
      nodeId: string;
      params: unknown;
      // TODO: Types
      paramsSchema: unknown;
      resultSchema: unknown;
    };

export interface WorkflowExecutionContext {
  checkpointManager: CheckpointManager;
  sendWorkflowMessage: WorkflowMessageListener;
  onRequestInput: (request: InputRequest) => Promise<unknown>;
  objectStateMap: Map<string, JsonValue>;
  onRestoreCheckpoint: (
    node: ExecutionNode,
    feedback: unknown,
  ) => Promise<void>;
  checkpointLabelMap: Map<string, ExecutionNode>;
  // Future: Add more workflow-level utilities here
}

export function createWorkflowContext({
  onMessage,
  onRequestInput,
  onRestoreCheckpoint,
  checkpoint,
}: {
  onMessage?: WorkflowMessageListener;
  onRequestInput?: (request: InputRequest) => Promise<unknown>;
  onRestoreCheckpoint?: (
    node: ExecutionNode,
    feedback: unknown,
  ) => Promise<void>;
  checkpoint?: ExecutionNode;
} = {}): WorkflowExecutionContext {
  return {
    checkpointManager: new CheckpointManager({ checkpoint }),
    sendWorkflowMessage: (message: WorkflowMessage) => {
      onMessage?.(message);
    },
    onRequestInput:
      onRequestInput ??
      // eslint-disable-next-line @typescript-eslint/require-await
      (async () => {
        // TODO: Should we throw here? This will cause weird behavior if the external tool helper is used
        // without the request input helper not properly wired up.
        console.warn(
          "[GenSX] Requesting input not supported in this environment",
        );
      }),
    onRestoreCheckpoint:
      onRestoreCheckpoint ??
      // eslint-disable-next-line @typescript-eslint/require-await
      (async () => {
        // TODO: Should we throw here? This will cause weird behavior if the restore checkpoint functionality is used
        // without the restore checkpoint stuff properly wired up.
        // We can probably build an in-memory implementation of this.
        console.warn(
          "[GenSX] Restore checkpoint not supported in this environment",
        );
      }),
    checkpointLabelMap: new Map(),
    objectStateMap: new Map(),
  };
}

export function getWorkflowContext(): WorkflowExecutionContext | undefined {
  const context = getCurrentContext();
  return context.getWorkflowContext();
}
