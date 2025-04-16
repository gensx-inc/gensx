import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Context } from "hono";
import { Definition } from "typescript-json-schema";
import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import {
  BadRequestError,
  createServer,
  GensxServer,
  NotFoundError,
  ServerError,
} from "../src/dev-server.js";

// Mock ulid module
vi.mock("ulidx", () => ({
  ulid: vi.fn().mockReturnValue("test-execution-id"),
}));

// Mock @hono/node-server
vi.mock("@hono/node-server", () => ({
  serve: vi.fn().mockReturnValue({
    close: vi.fn(),
  }),
}));

// Simple mock workflow definition
const mockWorkflow = {
  name: "testWorkflow",
  run: vi.fn().mockResolvedValue({ result: "test result" }),
};

// Mock schemas
const mockSchemas: Record<string, { input: Definition; output: Definition }> = {
  testWorkflow: {
    input: { type: "object", properties: { test: { type: "string" } } },
    output: { type: "object", properties: { result: { type: "string" } } },
  },
};

// Type for workflow execution in tests
interface WorkflowExecution {
  id: string;
  workflowName: string;
  executionStatus: "queued" | "starting" | "running" | "completed" | "failed";
  createdAt: string;
  finishedAt?: string;
  input: unknown;
  output?: unknown;
  error?: string;
}

// Type for accessing private members in tests
interface PrivateServer {
  parseJsonBody: (c: Context) => Promise<Record<string, unknown>>;
  validateInput: (workflowName: string, input: unknown) => void;
  executeWorkflowAsync: (
    workflowName: string,
    workflow: unknown,
    executionId: string,
    input: unknown,
  ) => Promise<void>;
  handleStreamingResponse: (
    c: Context,
    streamResult: AsyncIterable<unknown>,
  ) => Response;
  executionsMap: Map<string, WorkflowExecution>;
  app: {
    onError: (err: Error, c: Context) => Promise<Response | undefined>;
  };
}

suite("GenSX Dev Server", () => {
  // Original console methods
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  let server: GensxServer;

  beforeEach(() => {
    // Mock console methods
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();

    // Reset mocks
    vi.resetAllMocks();
  });

  afterEach(() => {
    // Restore console methods
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;

    // Temporarily silence warnings during server.stop()
    const tempWarn = console.warn;
    console.warn = vi.fn();

    // Stop the server
    server.stop();

    // Restore console.warn
    console.warn = tempWarn;
  });

  it("should create server instance with workflows", () => {
    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(workflows, "test-org", "test-project", "test-env");

    expect(server).toBeInstanceOf(GensxServer);
  });

  it("should properly register workflows", () => {
    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(workflows, "test-org", "test-project", "test-env");

    const registeredWorkflows = server.getWorkflows();
    expect(registeredWorkflows).toHaveLength(1);
    expect(registeredWorkflows[0].name).toBe("testWorkflow");
  });

  it("should handle missing workflows gracefully", () => {
    server = createServer({}, "test-org", "test-project", "test-env");

    const registeredWorkflows = server.getWorkflows();
    expect(registeredWorkflows).toHaveLength(0);

    // Start the server to trigger a warning
    server.start();

    // Should log a warning
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("No valid workflows were registered!"),
    );
  });

  it("should start server with correct port", () => {
    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(workflows, "test-org", "test-project", "test-env", {
      port: 4000,
    });

    server.start();

    expect(serve).toHaveBeenCalledWith(
      expect.objectContaining({
        fetch: expect.any(Function) as unknown as Hono["fetch"],
        port: 4000,
      }),
    );
  });

  it("should handle workflows with schemas", () => {
    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(
      workflows,
      "test-org",
      "test-project",
      "test-env",
      {},
      mockSchemas,
    );

    const registeredWorkflows = server.getWorkflows();
    expect(registeredWorkflows[0].inputSchema).toEqual(
      mockSchemas.testWorkflow.input,
    );
    expect(registeredWorkflows[0].outputSchema).toEqual(
      mockSchemas.testWorkflow.output,
    );
  });

  it("should handle starting server multiple times", () => {
    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(workflows, "test-org", "test-project", "test-env");

    server.start();
    server.start(); // Second call should do nothing

    expect(serve).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Server is already running"),
    );
  });

  it("should handle stopping server multiple times", () => {
    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(workflows, "test-org", "test-project", "test-env");

    server.start();
    server.stop();
    server.stop(); // Second call should do nothing

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Server is not running"),
    );
  });

  it("should return correct URLs for workflows", () => {
    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(workflows, "test-org", "test-project", "test-env");

    const registeredWorkflows = server.getWorkflows();
    expect(registeredWorkflows[0].url).toBe(
      "http://localhost:1337/org/test-org/projects/test-project/environments/test-env/workflows/testWorkflow",
    );
  });

  it("should support async iteration of workflows", async () => {
    const workflows = {
      workflow1: { name: "workflow1", run: vi.fn() },
      workflow2: { name: "workflow2", run: vi.fn() },
    };

    server = createServer(workflows, "test-org", "test-project", "test-env");

    const workflowNames: string[] = [];
    for await (const workflow of server.workflows()) {
      workflowNames.push(workflow.name);
    }

    expect(workflowNames).toContain("workflow1");
    expect(workflowNames).toContain("workflow2");
    expect(workflowNames).toHaveLength(2);
  });

  it("should handle invalid JSON in request body", async () => {
    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(workflows, "test-org", "test-project", "test-env");

    const mockContext = {
      req: {
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      },
    } as unknown as Context;

    const privateServer = server as unknown as PrivateServer;
    await expect(privateServer.parseJsonBody(mockContext)).rejects.toThrow(
      "Invalid JSON",
    );
  });

  it("should validate input against schema", () => {
    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(
      workflows,
      "test-org",
      "test-project",
      "test-env",
      {},
      mockSchemas,
    );

    const privateServer = server as unknown as PrivateServer;

    // Valid input
    const validInput = { test: "valid" };
    expect(() => {
      privateServer.validateInput("testWorkflow", validInput);
    }).not.toThrow();

    // Invalid input
    const invalidInput = { test: 123 }; // Should be string according to schema
    expect(() => {
      privateServer.validateInput("testWorkflow", invalidInput);
    }).toThrow("Input validation failed");

    // Missing input
    expect(() => {
      privateServer.validateInput("testWorkflow", undefined);
    }).toThrow("Missing required 'input' field");
  });

  it("should execute workflow and handle success", async () => {
    // Update mockWorkflow to properly return a result
    mockWorkflow.run.mockImplementation(() => {
      return Promise.resolve({ result: "test result" });
    });

    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(workflows, "test-org", "test-project", "test-env");

    const executionId = "test-execution-id";
    const input = { test: "data" };
    const privateServer = server as unknown as PrivateServer;

    // Create the execution record first (necessary for executeWorkflowAsync to run)
    const now = new Date().toISOString();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowName: "testWorkflow",
      executionStatus: "queued",
      createdAt: now,
      input,
    };
    privateServer.executionsMap.set(executionId, execution);

    // Execute the workflow
    await privateServer.executeWorkflowAsync(
      "testWorkflow",
      mockWorkflow,
      executionId,
      input,
    );

    // Verify the mock was called
    expect(mockWorkflow.run).toHaveBeenCalledWith(input);

    const updatedExecution = privateServer.executionsMap.get(executionId);
    expect(updatedExecution).toBeDefined();
    expect(updatedExecution?.executionStatus).toBe("completed");
    expect(updatedExecution?.output).toEqual({ result: "test result" });
    expect(updatedExecution?.finishedAt).toBeDefined();
  });

  it("should handle workflow execution failure", async () => {
    const failingWorkflow = {
      name: "failingWorkflow",
      run: vi.fn().mockImplementation(() => {
        return Promise.reject(new Error("Workflow failed"));
      }),
    };

    const workflows = { failingWorkflow };
    server = createServer(workflows, "test-org", "test-project", "test-env");

    const executionId = "test-execution-id";
    const input = { test: "data" };
    const privateServer = server as unknown as PrivateServer;

    // Create the execution record first (necessary for executeWorkflowAsync to run)
    const now = new Date().toISOString();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowName: "failingWorkflow",
      executionStatus: "queued",
      createdAt: now,
      input,
    };
    privateServer.executionsMap.set(executionId, execution);

    // Execute the workflow
    await privateServer.executeWorkflowAsync(
      "failingWorkflow",
      failingWorkflow,
      executionId,
      input,
    );

    // Verify the mock was called
    expect(failingWorkflow.run).toHaveBeenCalledWith(input);

    const updatedExecution = privateServer.executionsMap.get(executionId);
    expect(updatedExecution).toBeDefined();
    expect(updatedExecution?.executionStatus).toBe("failed");
    expect(updatedExecution?.error).toBe("Workflow failed");
    expect(updatedExecution?.finishedAt).toBeDefined();
  });

  it("should handle streaming responses", async () => {
    type StreamResult = string | { data: string };
    const generator = async function* () {
      await Promise.resolve(); // Add await to satisfy linter
      yield "chunk1";
      yield { data: "chunk2" };
    };

    const streamingWorkflow = {
      name: "streamingWorkflow",
      run: vi.fn().mockReturnValue(generator()),
    };

    const workflows = { streamingWorkflow };
    server = createServer(workflows, "test-org", "test-project", "test-env");

    const mockContext = {} as Context;
    const runResult =
      (await streamingWorkflow.run()) as AsyncGenerator<StreamResult>;
    const asyncIterable: AsyncIterable<StreamResult> = {
      [Symbol.asyncIterator]: () => runResult,
    };

    const privateServer = server as unknown as PrivateServer;
    const response = privateServer.handleStreamingResponse(
      mockContext,
      asyncIterable,
    );

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("Content-Type")).toBe("application/stream");
    expect(response.headers.get("Transfer-Encoding")).toBe("chunked");

    // Test stream content
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body reader is undefined");
    }

    const chunks: string[] = [];
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value instanceof Uint8Array) {
        chunks.push(new TextDecoder().decode(result.value));
      }
    }
    expect(chunks).toContain("chunk1");
    expect(chunks).toContain('{"data":"chunk2"}\n');
  });

  it("should handle different types of errors appropriately", () => {
    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(workflows, "test-org", "test-project", "test-env");

    const mockJsonResponse = vi.fn();
    const mockContext = { json: mockJsonResponse } as unknown as Context;

    // Create an onError handler directly using the same function as in setupErrorHandler
    const onError = (err: Error, c: Context) => {
      if (err instanceof NotFoundError) {
        return c.json({ status: "error", error: err.message }, 404);
      } else if (err instanceof BadRequestError) {
        return c.json({ status: "error", error: err.message }, 400);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        return c.json(
          { status: "error", error: "Internal server error", message },
          500,
        );
      }
    };

    const notFoundError = new NotFoundError("Resource not found");
    onError(notFoundError, mockContext);
    expect(mockJsonResponse).toHaveBeenCalledWith(
      { status: "error", error: "Resource not found" },
      404,
    );

    mockJsonResponse.mockClear();
    const badRequestError = new BadRequestError("Invalid input");
    onError(badRequestError, mockContext);
    expect(mockJsonResponse).toHaveBeenCalledWith(
      { status: "error", error: "Invalid input" },
      400,
    );

    mockJsonResponse.mockClear();
    const serverError = new ServerError("Internal error");
    onError(serverError, mockContext);
    expect(mockJsonResponse).toHaveBeenCalledWith(
      {
        status: "error",
        error: "Internal server error",
        message: "Internal error",
      },
      500,
    );
  });

  // Test workflow registration edge cases
  it("should handle invalid workflow definitions gracefully", () => {
    // Mock console.warn
    console.warn = vi.fn();

    // Create a fresh server with no valid workflows
    const noValidWorkflowsServer = createServer(
      {},
      "test-org",
      "test-project",
      "test-env",
    );
    const registeredWorkflows = noValidWorkflowsServer.getWorkflows();

    // Should have no registered workflows
    expect(registeredWorkflows).toHaveLength(0);

    // Start the server to trigger the warning
    noValidWorkflowsServer.start();

    // Should warn about no valid workflows
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("No valid workflows were registered!"),
    );

    // Cleanup
    noValidWorkflowsServer.stop();
  });
});
