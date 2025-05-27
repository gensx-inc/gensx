import { Buffer } from "node:buffer";
import zlib from "node:zlib";

import { afterEach, vi } from "vitest";

import { CheckpointManager } from "../../src/checkpoint.js";
import { ExecutionNode } from "../../src/checkpoint.js";
import { withContext } from "../../src/context.js";
import { ExecutionContext } from "../../src/context.js";
import * as gensx from "../../src/index.js";
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

export async function executeWithCheckpoints<T, P extends object = {}>(
  componentFn: (props: P) => T,
  props: P = {} as P,
  options?: { name?: string },
): Promise<{
  result: T;
  checkpoints: ExecutionNode[];
  checkpointManager: CheckpointManager;
}> {
  const checkpoints: ExecutionNode[] = [];

  // Set up fetch mock to capture checkpoints
  mockFetch((_input: FetchInput, options?: FetchInit) => {
    // Create a unique ID for this test run
    const testId = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Save a placeholder checkpoint if we can't parse the real one
    const placeholderCheckpoint: ExecutionNode = {
      id: testId,
      componentName: "TestComponent",
      startTime: Date.now(),
      endTime: Date.now(),
      children: [],
      props: {},
      output: "test-output",
    };

    try {
      if (options?.body) {
        const { node: checkpoint } = getExecutionFromBody(
          options.body as string,
        );
        checkpoints.push(checkpoint);
      } else {
        checkpoints.push(placeholderCheckpoint);
      }
    } catch (error) {
      console.error("Failed to parse checkpoint:", error);
      checkpoints.push(placeholderCheckpoint);
    }

    // Return a mock response that the CheckpointManager expects
    return new Response(
      JSON.stringify({
        executionId: testId,
        traceId: testId,
        workflowName: "test-workflow",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  });

  // Create and configure workflow context
  // Use {} to create a CheckpointManager with default settings
  // The default constructor will use env vars or config files
  const checkpointManager = new CheckpointManager({
    apiKey: "test-api-key",
    org: "test-org",
    disabled: true, // Disable actual checkpoint API calls in tests
  });
  const workflowContext = createWorkflowContext();
  workflowContext.checkpointManager = checkpointManager;
  const executionContext = new ExecutionContext({});
  const contextWithWorkflow = executionContext.withContext({
    [Symbol.for("gensx.workflow")]: workflowContext,
  });

  // Create a decorated component with optional name
  const DecoratedComponent = gensx.Component(
    "DecoratedComponent",
    componentFn,
    options,
  );

  // Execute with context
  const result = withContext(contextWithWorkflow, () =>
    DecoratedComponent(props),
  );

  // Wait for any pending checkpoints
  await checkpointManager.waitForPendingUpdates();

  return { result, checkpoints, checkpointManager };
}

export async function executeWorkflowWithCheckpoints<T, P extends object = {}>(
  componentFn: (props: P) => T,
  props: P = {} as P,
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
    // Create a unique ID for this test run
    const testId = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Save a placeholder checkpoint if we can't parse the real one
    const placeholderCheckpoint: ExecutionNode = {
      id: testId,
      componentName: "WorkflowComponentWrapper",
      startTime: Date.now(),
      endTime: Date.now(),
      children: [],
      props: {},
      output: "test-output",
    };

    try {
      if (options?.body) {
        const { node: checkpoint, workflowName } = getExecutionFromBody(
          options.body as string,
        );
        checkpoints[checkpoint.id] = checkpoint;
        workflowNames.add(workflowName);
      } else {
        checkpoints[testId] = placeholderCheckpoint;
        workflowNames.add("test-workflow");
      }
    } catch {
      checkpoints[testId] = placeholderCheckpoint;
      workflowNames.add("test-workflow");
    }

    // Return a mock response that the CheckpointManager expects
    return new Response(
      JSON.stringify({
        executionId: testId,
        traceId: testId,
        workflowName: "test-workflow",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  });

  // Create a workflow to wrap the component
  const WorkflowComponent = gensx.Workflow("WorkflowComponent", componentFn, {
    name:
      "executeWorkflowWithCheckpoints" +
      Math.round(Math.random() * 1000).toFixed(0),
    metadata,
  });

  // Execute with context
  let result: T | undefined;
  let error: Error | undefined;
  try {
    result = await WorkflowComponent(props);
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
  try {
    const body = JSON.parse(zlib.gunzipSync(bodyStr).toString()) as {
      workflowName: string;
      rawExecution: string;
    };
    const compressedExecution = Buffer.from(body.rawExecution, "base64");
    const decompressedExecution = zlib.gunzipSync(compressedExecution);
    const node = JSON.parse(
      decompressedExecution.toString("utf-8"),
    ) as ExecutionNode;
    return {
      node,
      workflowName: body.workflowName || "test-workflow",
    };
  } catch (error) {
    // Return a placeholder checkpoint if there's an error
    console.error("Error parsing execution body:", error);
    return {
      node: {
        id: "test-id-" + Date.now().toString(),
        componentName: "TestComponent",
        startTime: Date.now(),
        children: [],
        props: {},
      },
      workflowName: "test-workflow",
    };
  }
}

export function mockFetch(
  handler: (
    input: FetchInput,
    options?: FetchInit,
  ) => Promise<Response> | Response,
) {
  global.fetch = vi.fn().mockImplementation(handler);
}
