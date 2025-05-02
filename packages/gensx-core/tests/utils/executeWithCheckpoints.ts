import { Buffer } from "node:buffer";
import zlib from "node:zlib";

import { afterEach, vi } from "vitest";

import { CheckpointManager } from "../../src/checkpoint.js";
import { ExecutionNode } from "../../src/checkpoint.js";
import { withContext } from "../../src/context.js";
import { ExecutionContext } from "../../src/context.js";
import * as gensx from "../../src/index.js";
import { resolveDeep } from "../../src/resolve.js";
import { MaybePromise } from "../../src/types.js";
import { createWorkflowContext } from "../../src/workflow-context.js";

// Add types for fetch API
export type FetchInput = Parameters<typeof fetch>[0];
export type FetchInit = Parameters<typeof fetch>[1];

const originalFetch = global.fetch;
afterEach(() => {
  vi.clearAllMocks();
  global.fetch = originalFetch;
});

/**
 * Helper to execute a workflow with checkpoint tracking
 * Returns both the execution result and recorded checkpoints for verification
 */

// Support fluent API callbacks in tests
export async function executeWithCheckpoints<T>(
  callback: () => MaybePromise<T>,
): Promise<{
  result: T;
  checkpoints: ExecutionNode[];
  checkpointManager: CheckpointManager;
}> {
  const checkpoints: ExecutionNode[] = [];

  // Set up fetch mock to capture checkpoints
  mockFetch((_input: FetchInput, options?: FetchInit) => {
    if (!options?.body) throw new Error("No body provided");
    const { node: checkpoint } = getExecutionFromBody(options.body as string);
    checkpoints.push(checkpoint);
    return new Response(null, { status: 200 });
  });

  // Create and configure workflow context
  const checkpointManager = new CheckpointManager({
    apiKey: "test-api-key",
    org: "test-org",
  });
  const workflowContext = createWorkflowContext();
  workflowContext.checkpointManager = checkpointManager;
  const executionContext = new ExecutionContext({});
  const contextWithWorkflow = executionContext.withContext({
    [Symbol.for("gensx.workflow")]: workflowContext,
  });

  // Execute with context
  const result = await withContext(contextWithWorkflow, async () => {
    // Use the callback directly for fluent API
    return resolveDeep(callback());
  });

  // Wait for any pending checkpoints
  await checkpointManager.waitForPendingUpdates();

  return { result, checkpoints, checkpointManager };
}

// Update workflowWithCheckpoints to also support fluent API
export async function executeWorkflowWithCheckpoints<T>(
  callback: () => MaybePromise<T>,
  _metadata?: Record<string, unknown>,
): Promise<{
  result?: T;
  error?: Error;
  checkpoints: Record<string, ExecutionNode>;
  workflowNames: Set<string>;
}> {
  const oldOrg = process.env.GENSX_ORG;
  const oldApiKey = process.env.GENSX_API_KEY;
  process.env.GENSX_ORG = "test-org";
  process.env.GENSX_API_KEY = "test-api-key";

  const checkpoints: Record<string, ExecutionNode> = {};
  const workflowNames = new Set<string>();

  // Set up fetch mock to capture checkpoints
  mockFetch((_input: FetchInput, options?: FetchInit) => {
    if (!options?.body) throw new Error("No body provided");
    const { node: checkpoint, workflowName } = getExecutionFromBody(
      options.body as string,
    );
    checkpoints[checkpoint.id] = checkpoint;
    if (workflowName) {
      workflowNames.add(workflowName);
    }
    return new Response(null, { status: 200 });
  });

  // Create a workflow name for this execution
  const workflowName =
    "executeWorkflowWithCheckpoints" +
    Math.round(Math.random() * 1000).toFixed(0);

  // Add the workflowName to the set before execution
  workflowNames.add(workflowName);

  // Create a wrapper component to execute the callback with workflow context
  const WorkflowComponent = gensx.Component<{}, T>(
    "WorkflowComponentWrapper",
    async () => {
      // Execute the callback directly
      return resolveDeep(callback());
    },
  );

  // Execute the workflow
  const workflow = gensx.Workflow(workflowName, WorkflowComponent);

  // Execute with context
  let result: T | undefined;
  let error: Error | undefined;
  try {
    result = await workflow.run({});
  } catch (err) {
    if (err instanceof Error) {
      error = err;
    } else if (typeof err === "string") {
      error = new Error(err);
    } else {
      error = new Error("Unknown error occurred");
    }
  }

  process.env.GENSX_ORG = oldOrg;
  process.env.GENSX_API_KEY = oldApiKey;

  // This is all checkpoints that happen during the workflow execution, not just the ones for this specific execution, due to how we mock fetch to extract them.
  return { result, error, checkpoints, workflowNames };
}

export function getExecutionFromBody(bodyStr: string): {
  node: ExecutionNode;
  workflowName: string;
} {
  const body = JSON.parse(zlib.gunzipSync(bodyStr).toString()) as {
    workflowName: string;
    rawExecution: string;
  };
  const compressedExecution = Buffer.from(body.rawExecution, "base64");
  const decompressedExecution = zlib.gunzipSync(compressedExecution);
  return {
    node: JSON.parse(decompressedExecution.toString("utf-8")) as ExecutionNode,
    workflowName: body.workflowName,
  };
}

export function mockFetch(
  handler: (
    input: FetchInput,
    options?: FetchInit,
  ) => Promise<Response> | Response,
) {
  global.fetch = vi.fn().mockImplementation(handler);
}
