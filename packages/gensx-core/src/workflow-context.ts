import { CheckpointManager } from "./checkpoint.js";
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
      sequenceNumber: number;
    }
  | {
      type: "external-tool";
      nodeId: string;
      sequenceNumber: number;
      params: unknown;
      // TODO: Types
      paramsSchema: unknown;
      resultSchema: unknown;
    };

export interface WorkflowExecutionContext {
  checkpointManager: CheckpointManager;
  sendWorkflowMessage: WorkflowMessageListener;
  onRequestInput: (request: InputRequest) => Promise<void>;
  onRestoreCheckpoint: (nodeId: string, feedback: unknown) => Promise<void>;
  checkpointLabelMap: Map<string, string>;
  objectStateMap: Map<string, JsonValue>;
}

export function createWorkflowContext({
  onMessage,
  onRequestInput,
  onRestoreCheckpoint,
}: {
  onMessage?: WorkflowMessageListener;
  onRequestInput?: (request: InputRequest) => Promise<void>;
  onRestoreCheckpoint?: (nodeId: string, feedback: unknown) => Promise<void>;
} = {}): WorkflowExecutionContext {
  return {
    checkpointManager: new CheckpointManager(),
    sendWorkflowMessage: (message: WorkflowMessage) => {
      onMessage?.(message);
    },
    onRequestInput:
      onRequestInput ??
      // eslint-disable-next-line @typescript-eslint/require-await
      (async () => {
        console.warn(
          "[GenSX] Requesting input not supported in this environment",
        );
      }),
    onRestoreCheckpoint:
      onRestoreCheckpoint ??
      // eslint-disable-next-line @typescript-eslint/require-await
      (async () => {
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
