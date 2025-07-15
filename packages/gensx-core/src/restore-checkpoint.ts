/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
import { ExecutionNode } from "./checkpoint-types.js";
import { Component } from "./component.js";
import { getCurrentContext } from "./context.js";

// This is a magical component used to store a marker in the checkpoint. When restoring from a checkpoint, the execution layer will update this marker in the checkpoint with the given feedback,
// remove all subsequent nodes, and resume execution from this point.
const CheckpointMarkerComponent = Component(
  `CheckpointMarker`,
  ({ maxRestores }: { maxRestores: number }) => {
    const context = getCurrentContext();
    const currentNode = context.getCurrentNode();
    if (!currentNode) {
      throw new Error(`[GenSX] No current node id found.`);
    }

    return {
      feedback: null,
      restoreCount: 0,
      maxRestores,
      node: currentNode,
    };
  },
);

export function createCheckpoint<T = unknown>(
  {
    label,
    // schema,
  }: {
    label?: string;
    // schema: z.ZodSchema<T> // TODO: Validate the given feedback against the schema
  } = {},
  { maxRestores = 3 }: { maxRestores?: number } = {},
): {
  feedback: T | null;
  restore: (feedback: T) => Promise<void>;
  label: string;
} {
  const context = getCurrentContext();
  const workflowContext = context.getWorkflowContext();

  label ??= `checkpoint-marker-${Date.now()}`;

  if (workflowContext.checkpointLabelMap.has(label)) {
    throw new Error(`[GenSX] Checkpoint ${label} has already been created.`);
  }
  // Do not pass the label as a prop, as that would affect that ability to deterministically calculate the nodeId.
  const result = CheckpointMarkerComponent(
    { maxRestores },
    {
      metadata: { label, maxRestores },
    },
  );
  workflowContext.checkpointLabelMap.set(label, result.node);

  if (result.restoreCount >= result.maxRestores) {
    throw new Error(
      `[GenSX] Checkpoint ${label} has been restored more than ${result.maxRestores} times.`,
    );
  }

  return {
    feedback: result.feedback as T | null,
    restore: (feedback: T) => restoreCheckpointByNode(result.node, feedback),
    label,
  };
}

async function restoreCheckpointByNode(node: ExecutionNode, feedback: unknown) {
  const context = getCurrentContext();
  const workflowContext = context.getWorkflowContext();

  await workflowContext.checkpointManager.waitForPendingUpdates();

  // This is where the magic happens. The execution layer will halt execution and update the checkpoint with the given feedback.
  await workflowContext.onRestoreCheckpoint(node, feedback);

  console.error(
    `[GenSX] Restoring checkpoints is not supported in this environment.`,
  );
}

export async function restoreCheckpoint<T = unknown>(
  label: string,
  feedback: T,
) {
  // TODO: Add some locking mechanism to prevent multiple simultaneous restores, or for other workflow work to happen while we're restoring.
  const context = getCurrentContext();
  const workflowContext = context.getWorkflowContext();
  const node = workflowContext.checkpointLabelMap.get(label);
  if (!node) {
    throw new Error(`[GenSX] Checkpoint ${label} has not been created.`);
  }

  await restoreCheckpointByNode(node, feedback);
}
