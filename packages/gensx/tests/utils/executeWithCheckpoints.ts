import zlib from "node:zlib";

import { afterEach, vi } from "vitest";

import { CheckpointManager } from "@/checkpoint";
import { ExecutionNode } from "@/checkpoint";
import { withContext } from "@/context";
import { ExecutionContext } from "@/context";
import { gsx } from "@/index";
import { resolveDeep } from "@/resolve";
import { ExecutableValue } from "@/types";
import { createWorkflowContext } from "@/workflow-context";

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
  const result = await withContext(contextWithWorkflow, () =>
    gsx.execute<T>(element),
  );

  // Wait for any pending checkpoints
  await checkpointManager.waitForPendingUpdates();

  return { result, checkpoints, checkpointManager };
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export async function executeWorkflowWithCheckpoints<T>(
  element: ExecutableValue,
  metadata?: Record<string, unknown>,
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
    workflowNames.add(workflowName);
    return new Response(null, { status: 200 });
  });

  const WorkflowComponent = gsx.Component<{}, T>(
    "WorkflowComponentWrapper",
    async () => {
      const result = await resolveDeep(element);
      return result as T;
    },
  );

  const workflow = gsx.Workflow(
    "executeWorkflowWithCheckpoints" +
      Math.round(Math.random() * 1000).toFixed(0),
    WorkflowComponent,
    { metadata },
  );

  // Execute with context
  let result: T | undefined;
  let error: Error | undefined;
  try {
    result = await workflow.run({});
  } catch (err) {
    error = err as Error;
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
