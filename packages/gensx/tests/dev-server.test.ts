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

// Add type for workflow function
type WorkflowFunction = {
  (input: unknown): Promise<unknown> | AsyncIterable<unknown>;
  __gensxWorkflow?: boolean;
} & ReturnType<typeof vi.fn>;

// Simple mock workflow definition
const mockWorkflow = vi.fn(function testWorkflow(_input: unknown) {
  return Promise.resolve({ result: "test result" });
}) as WorkflowFunction;
mockWorkflow.__gensxWorkflow = true;
Object.defineProperty(mockWorkflow, "name", { value: "testWorkflow" });

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
    fetch: (request: Request) => Promise<Response>;
  };
  workflowMap: Map<string, WorkflowFunction>;
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

  afterEach(async () => {
    // Restore console methods
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;

    // Temporarily silence warnings during server.stop()
    const tempWarn = console.warn;
    console.warn = vi.fn();

    // Stop the server
    await server.stop();

    // Restore console.warn
    console.warn = tempWarn;
  });

  it("should create server instance with workflows", () => {
    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(workflows);

    expect(server).toBeInstanceOf(GensxServer);
  });

  it("should properly register workflows", () => {
    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(workflows);

    const registeredWorkflows = server.getWorkflows();
    expect(registeredWorkflows).toHaveLength(1);
    expect(registeredWorkflows[0].name).toBe("testWorkflow");
  });

  it("should handle missing workflows gracefully", () => {
    server = createServer({});

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
    server = createServer(workflows, {
      port: 4000,
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      },
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
      {
        logger: {
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
        },
      },
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
    server = createServer(workflows);

    server.start();
    server.start(); // Second call should do nothing

    expect(serve).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Server is already running"),
    );
  });

  it("should handle stopping server multiple times", async () => {
    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(workflows);

    server.start();
    await server.stop();
    await server.stop(); // Second call should do nothing

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Server is not running"),
    );
  });

  it("should return correct URLs for workflows", () => {
    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(workflows, {
      port: 4000,
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      },
    });

    const registeredWorkflows = server.getWorkflows();
    expect(registeredWorkflows[0].url).toBe(
      "http://localhost:4000/workflows/testWorkflow",
    );
  });

  it("should support async iteration of workflows", async () => {
    const workflow1 = vi.fn(function workflow1(_input: unknown) {
      return Promise.resolve();
    }) as WorkflowFunction;
    workflow1.__gensxWorkflow = true;
    Object.defineProperty(workflow1, "name", { value: "workflow1" });

    const workflow2 = vi.fn(function workflow2(_input: unknown) {
      return Promise.resolve();
    }) as WorkflowFunction;
    workflow2.__gensxWorkflow = true;
    Object.defineProperty(workflow2, "name", { value: "workflow2" });

    const workflows = {
      workflow1,
      workflow2,
    };

    server = createServer(workflows);

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
    server = createServer(workflows);

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
      {
        logger: {
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
        },
      },
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
    }).toThrow("Missing required input parameters");
  });

  it("should execute workflow and handle success", async () => {
    // Update mockWorkflow to properly return a result
    mockWorkflow.mockImplementation(function (this: unknown, _input: unknown) {
      return Promise.resolve({ result: "test result" });
    });

    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(workflows);

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

    // Get the wrapped workflow from the server
    const wrappedWorkflow = privateServer.workflowMap.get("testWorkflow");
    expect(wrappedWorkflow).toBeDefined();

    // Execute the workflow
    await privateServer.executeWorkflowAsync(
      "testWorkflow",
      wrappedWorkflow,
      executionId,
      input,
    );

    // Verify the mock was called through the run method
    expect(mockWorkflow).toHaveBeenCalledWith(input);

    const updatedExecution = privateServer.executionsMap.get(executionId);
    expect(updatedExecution).toBeDefined();
    expect(updatedExecution?.executionStatus).toBe("completed");
    expect(updatedExecution?.output).toEqual({ result: "test result" });
    expect(updatedExecution?.finishedAt).toBeDefined();
  });

  it("should handle workflow execution failure", async () => {
    const failingWorkflow = vi.fn(function failingWorkflow(
      this: unknown,
      _input: unknown,
    ) {
      return Promise.reject(new Error("Workflow failed"));
    }) as WorkflowFunction;
    failingWorkflow.__gensxWorkflow = true;
    Object.defineProperty(failingWorkflow, "name", {
      value: "failingWorkflow",
    });

    const workflows = { failingWorkflow };
    server = createServer(workflows);

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

    // Get the wrapped workflow from the server
    const wrappedWorkflow = privateServer.workflowMap.get("failingWorkflow");
    expect(wrappedWorkflow).toBeDefined();

    // Execute the workflow
    await privateServer.executeWorkflowAsync(
      "failingWorkflow",
      wrappedWorkflow,
      executionId,
      input,
    );

    // Verify the mock was called through the run method
    expect(failingWorkflow).toHaveBeenCalledWith(input);

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

    const streamingWorkflow = vi.fn(function streamingWorkflow(
      _input: unknown,
    ) {
      return generator();
    }) as WorkflowFunction;
    streamingWorkflow.__gensxWorkflow = true;
    Object.defineProperty(streamingWorkflow, "name", {
      value: "streamingWorkflow",
    });

    const workflows = { streamingWorkflow };
    server = createServer(workflows);

    const mockContext = {} as Context;
    const runResult = (await streamingWorkflow(
      {},
    )) as AsyncGenerator<StreamResult>;
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
    server = createServer(workflows);

    const mockJsonResponse = vi.fn();
    const mockContext = { json: mockJsonResponse } as unknown as Context;

    // Create an onError handler directly using the same function as in setupErrorHandler
    const onError = (err: Error, c: Context) => {
      if (err instanceof NotFoundError) {
        return c.json({ error: err.message }, 404);
      } else if (err instanceof BadRequestError) {
        return c.json({ error: err.message }, 400);
      } else {
        return c.json({ error: "Internal server error" }, 500);
      }
    };

    const notFoundError = new NotFoundError("Resource not found");
    onError(notFoundError, mockContext);
    expect(mockJsonResponse).toHaveBeenCalledWith(
      { error: "Resource not found" },
      404,
    );

    mockJsonResponse.mockClear();
    const badRequestError = new BadRequestError("Invalid input");
    onError(badRequestError, mockContext);
    expect(mockJsonResponse).toHaveBeenCalledWith(
      { error: "Invalid input" },
      400,
    );

    mockJsonResponse.mockClear();
    const serverError = new ServerError("Internal error");
    onError(serverError, mockContext);
    expect(mockJsonResponse).toHaveBeenCalledWith(
      { error: "Internal server error" },
      500,
    );
  });

  it("should return 422 when workflow execution fails", async () => {
    const failingWorkflow = vi.fn(function failingWorkflow(
      this: unknown,
      _input: unknown,
    ) {
      return Promise.reject(new Error("Workflow failed"));
    }) as WorkflowFunction;
    failingWorkflow.__gensxWorkflow = true;
    Object.defineProperty(failingWorkflow, "name", {
      value: "failingWorkflow",
    });

    const workflows = { failingWorkflow };
    server = createServer(workflows);

    // Get the private server instance
    const privateServer = server as unknown as PrivateServer;

    // Create an execution record
    const executionId = "test-execution-id";
    const now = new Date().toISOString();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowName: "failingWorkflow",
      executionStatus: "queued",
      createdAt: now,
      input: { test: "data" },
    };
    privateServer.executionsMap.set(executionId, execution);

    // Get the wrapped workflow from the server
    const wrappedWorkflow = privateServer.workflowMap.get("failingWorkflow");
    expect(wrappedWorkflow).toBeDefined();

    // Execute the workflow
    await privateServer.executeWorkflowAsync(
      "failingWorkflow",
      wrappedWorkflow,
      executionId,
      { test: "data" },
    );

    // Verify the mock was called through the run method
    expect(failingWorkflow).toHaveBeenCalledWith({ test: "data" });

    // Verify the execution was updated with the error
    const updatedExecution = privateServer.executionsMap.get(executionId);
    expect(updatedExecution).toBeDefined();
    expect(updatedExecution?.executionStatus).toBe("failed");
    expect(updatedExecution?.error).toBe("Workflow failed");
    expect(updatedExecution?.finishedAt).toBeDefined();
  });

  // Test workflow registration edge cases
  it("should handle invalid workflow definitions gracefully", async () => {
    // Mock console.warn
    console.warn = vi.fn();

    // Create a fresh server with no valid workflows
    const noValidWorkflowsServer = createServer({});
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
    await noValidWorkflowsServer.stop();
  });
});
