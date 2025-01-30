import zlib from "node:zlib";

import { vi } from "vitest";

import { CheckpointManager } from "@/checkpoint";
import { ExecutionNode } from "@/checkpoint";
import { withContext } from "@/context";
import { ExecutionContext } from "@/context";
import { gsx } from "@/index";
import { ExecutableValue } from "@/types";
import { createWorkflowContext } from "@/workflow-context";

// Add types for fetch API
export type FetchInput = Parameters<typeof fetch>[0];
export type FetchInit = Parameters<typeof fetch>[1];

/**
 * Helper to execute a workflow with checkpoint tracking
 * Returns both the execution result and recorded checkpoints for verification
 */

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export async function executeWithCheckpoints<T>(
  element: ExecutableValue,
): Promise<{
  result: T;
  checkpoints: ExecutionNode[];
  checkpointManager: CheckpointManager;
}> {
  const checkpoints: ExecutionNode[] = [];

  // Set up fetch mock to capture checkpoints
  global.fetch = vi
    .fn()
    // eslint-disable-next-line @typescript-eslint/require-await
    .mockImplementation(async (_input: FetchInput, options?: FetchInit) => {
      if (!options?.body) throw new Error("No body provided");
      const checkpoint = getExecutionFromBody(options.body as string);
      checkpoints.push(checkpoint);
      return new Response(null, { status: 200 });
    });

  // Create and configure workflow context
  const checkpointManager = new CheckpointManager();
  const workflowContext = createWorkflowContext();
  workflowContext.checkpointManager = checkpointManager;
  const executionContext = new ExecutionContext({});
  const contextWithWorkflow = executionContext.withContext({
    [Symbol.for("gensx.workflow")]: workflowContext,
  });

  // Execute with context
  const result = await withContext(contextWithWorkflow, () =>
    gsx.execute<T>(element),
  );

  // Wait for any pending checkpoints
  await checkpointManager.waitForPendingUpdates();

  return { result, checkpoints, checkpointManager };
}

export function getExecutionFromBody(bodyStr: string): ExecutionNode {
  const body = JSON.parse(zlib.gunzipSync(bodyStr).toString()) as {
    rawExecution: string;
  };
  const compressedExecution = Buffer.from(body.rawExecution, "base64");
  const decompressedExecution = zlib.gunzipSync(compressedExecution);
  return JSON.parse(decompressedExecution.toString("utf-8")) as ExecutionNode;
}
