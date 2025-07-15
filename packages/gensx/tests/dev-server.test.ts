/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Context } from "hono";
import { Definition } from "typescript-json-schema";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

import {
  BadRequestError,
  createServer,
  GensxServer,
  NotFoundError,
  ServerError,
  WorkflowExecution,
  WorkflowMessage,
} from "../src/dev-server/index.js";
import { WorkflowMessageList } from "../src/dev-server/types.js";

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
const mockWorkflow = vi.fn(function testWorkflow(
  _input: unknown,
  opts?: { messageListener?: (event: any) => void },
) {
  if (opts?.messageListener) {
    opts.messageListener({
      type: "start",
      workflowExecutionId: "test-execution-id",
      workflowName: "testWorkflow",
    });
    opts.messageListener({
      type: "end",
    });
  }
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

describe("GenSX Dev Server", () => {
  let server: GensxServer;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
  });

  afterEach(async () => {
    // Stop the server
    await server.stop();
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

    server.start();
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
  });

  it("should handle stopping server multiple times", async () => {
    const workflows = { testWorkflow: mockWorkflow };
    server = createServer(workflows);

    server.start();
    await server.stop();
    await server.stop(); // Second call should do nothing
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

    await expect(server.parseJsonBody(mockContext)).rejects.toThrow(
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

    // Valid input
    const validInput = { test: "valid" };
    expect(() => {
      server.validateInput("testWorkflow", validInput);
    }).not.toThrow();

    // Invalid input
    const invalidInput = { test: 123 }; // Should be string according to schema
    expect(() => {
      server.validateInput("testWorkflow", invalidInput);
    }).toThrow("Input validation failed");

    // Missing input
    expect(() => {
      server.validateInput("testWorkflow", undefined);
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

    // Create the execution record first (necessary for executeWorkflowAsync to run)
    const now = new Date().toISOString();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowName: "testWorkflow",
      executionStatus: "queued",
      createdAt: now,
      input,
      workflowMessages: new WorkflowMessageList([]),
    };
    server.setExecution(executionId, execution);

    // Get the wrapped workflow from the server
    const wrappedWorkflow = server.getWorkflowByName("testWorkflow");
    expect(wrappedWorkflow).toBeDefined();

    // Execute the workflow
    await server.executeWorkflowAsync(
      "testWorkflow",
      wrappedWorkflow,
      executionId,
      input,
    );

    // Verify the mock was called through the run method
    expect(mockWorkflow).toHaveBeenCalledWith(
      input,
      expect.objectContaining({
        messageListener: expect.any(Function),
      }),
    );

    const updatedExecution = server.getExecution(executionId);
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

    // Create the execution record first (necessary for executeWorkflowAsync to run)
    const now = new Date().toISOString();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowName: "failingWorkflow",
      executionStatus: "queued",
      createdAt: now,
      input,
      workflowMessages: new WorkflowMessageList([]),
    };
    server.setExecution(executionId, execution);

    // Get the wrapped workflow from the server
    const wrappedWorkflow = server.getWorkflowByName("failingWorkflow");
    expect(wrappedWorkflow).toBeDefined();

    // Execute the workflow
    await server.executeWorkflowAsync(
      "failingWorkflow",
      wrappedWorkflow,
      executionId,
      input,
    );

    // Verify the mock was called through the run method
    expect(failingWorkflow).toHaveBeenCalledWith(
      input,
      expect.objectContaining({
        messageListener: expect.any(Function),
      }),
    );

    const updatedExecution = server.getExecution(executionId);
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

    const runResult = (await streamingWorkflow(
      {},
    )) as AsyncGenerator<StreamResult>;
    const asyncIterable: AsyncIterable<StreamResult> = {
      [Symbol.asyncIterator]: () => runResult,
    };

    const response = server.handleStreamingResponse(asyncIterable);

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

  it("should stream progress events in SSE format", async () => {
    interface ProgressEvent {
      type: "start" | "progress" | "end";
      workflowName?: string;
      data?: string;
    }

    const progressWorkflow = vi.fn(function progressWorkflow(
      _input: unknown,
      opts?: { messageListener?: (event: ProgressEvent) => void },
    ) {
      if (opts?.messageListener) {
        opts.messageListener({
          type: "start",
          workflowName: "progressWorkflow",
        });
        opts.messageListener({ type: "progress", data: "Processing..." });
        opts.messageListener({ type: "end" });
      }
      return Promise.resolve({ result: "done" });
    }) as WorkflowFunction;
    progressWorkflow.__gensxWorkflow = true;
    Object.defineProperty(progressWorkflow, "name", {
      value: "progressWorkflow",
    });

    const workflows = { progressWorkflow };
    server = createServer(workflows);

    const response = await server.app.fetch(
      new Request("http://localhost/workflows/progressWorkflow", {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ test: "data" }),
      }),
    );

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
    expect(response.headers.get("Connection")).toBe("keep-alive");

    // Test SSE content
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

    // Verify SSE format
    const sseContent = chunks.join("");
    expect(sseContent).toMatch(
      /id: \d+\ndata: {"type":"start","workflowName":"progressWorkflow","id":"\d+","timestamp":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"}\n\n/,
    );
    expect(sseContent).toMatch(
      /id: \d+\ndata: {"type":"progress","data":"Processing...","id":"\d+","timestamp":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"}\n\n/,
    );
    expect(sseContent).toMatch(
      /id: \d+\ndata: {"type":"end","id":"\d+","timestamp":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"}\n\n/,
    );
  });

  it("should stream progress events in NDJSON format", async () => {
    interface ProgressEvent {
      type: "start" | "progress" | "end";
      workflowName?: string;
      data?: string;
    }

    const progressWorkflow = vi.fn(function progressWorkflow(
      _input: unknown,
      opts?: { messageListener?: (event: ProgressEvent) => void },
    ) {
      if (opts?.messageListener) {
        opts.messageListener({
          type: "start",
          workflowName: "progressWorkflow",
        });
        opts.messageListener({ type: "progress", data: "Processing..." });
        opts.messageListener({ type: "end" });
      }
      return Promise.resolve({ result: "done" });
    }) as WorkflowFunction;
    progressWorkflow.__gensxWorkflow = true;
    Object.defineProperty(progressWorkflow, "name", {
      value: "progressWorkflow",
    });

    const workflows = { progressWorkflow };
    server = createServer(workflows);

    const response = await server.app.fetch(
      new Request("http://localhost/workflows/progressWorkflow", {
        method: "POST",
        headers: {
          Accept: "application/x-ndjson",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ test: "data" }),
      }),
    );

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("Content-Type")).toBe("application/x-ndjson");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
    expect(response.headers.get("Connection")).toBe("keep-alive");

    // Test NDJSON content
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

    // Verify NDJSON format
    const ndjsonContent = chunks.join("");
    const lines = ndjsonContent.split("\n").filter(Boolean);
    expect(lines).toHaveLength(4);
    expect(JSON.parse(lines[0])).toEqual({
      id: expect.any(String),
      timestamp: expect.any(String),
      type: "start",
      workflowName: "progressWorkflow",
    });
    expect(JSON.parse(lines[1])).toEqual({
      id: expect.any(String),
      timestamp: expect.any(String),
      type: "progress",
      data: "Processing...",
    });
    expect(JSON.parse(lines[2])).toEqual({
      id: expect.any(String),
      timestamp: expect.any(String),
      type: "end",
    });
    expect(JSON.parse(lines[3])).toMatchObject({
      id: expect.any(String),
      timestamp: expect.any(String),
      type: "output",
      content: '{"result":"done"}',
    });
  });

  it("should handle errors in streaming progress", async () => {
    interface ProgressEvent {
      type: "start" | "error";
      workflowName?: string;
      error?: string;
    }

    const errorWorkflow = vi.fn(function errorWorkflow(
      _input: unknown,
      opts?: { messageListener?: (event: ProgressEvent) => void },
    ) {
      if (opts?.messageListener) {
        opts.messageListener({ type: "start", workflowName: "errorWorkflow" });
        throw new Error("Workflow failed");
      }
      return Promise.resolve({ result: "done" });
    }) as WorkflowFunction;
    errorWorkflow.__gensxWorkflow = true;
    Object.defineProperty(errorWorkflow, "name", {
      value: "errorWorkflow",
    });

    const workflows = { errorWorkflow };
    server = createServer(workflows);

    const response = await server.app.fetch(
      new Request("http://localhost/workflows/errorWorkflow", {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ test: "data" }),
      }),
    );

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    // Test SSE content
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

    // Verify error event
    const sseContent = chunks.join("");
    expect(sseContent).toMatch(
      /id: \d+\ndata: {"type":"start","workflowName":"errorWorkflow","id":"\d+","timestamp":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"}\n\n/,
    );
    expect(sseContent).toMatch(
      /id: \d+\ndata: {"id":"\d+","timestamp":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z","type":"error","executionStatus":"failed","error":"Workflow failed"}\n\n/,
    );
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
    // Create an execution record
    const executionId = "test-execution-id";
    const now = new Date().toISOString();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowName: "failingWorkflow",
      executionStatus: "queued",
      createdAt: now,
      input: { test: "data" },
      workflowMessages: new WorkflowMessageList([]),
    };
    server.setExecution(executionId, execution);

    // Get the wrapped workflow from the server
    const wrappedWorkflow = server.getWorkflowByName("failingWorkflow");
    expect(wrappedWorkflow).toBeDefined();

    // Execute the workflow
    await server.executeWorkflowAsync(
      "failingWorkflow",
      wrappedWorkflow,
      executionId,
      { test: "data" },
    );

    // Verify the mock was called through the run method
    expect(failingWorkflow).toHaveBeenCalledWith(
      { test: "data" },
      expect.objectContaining({
        messageListener: expect.any(Function),
      }),
    );

    // Verify the execution was updated with the error
    const updatedExecution = server.getExecution(executionId);
    expect(updatedExecution).toBeDefined();
    expect(updatedExecution?.executionStatus).toBe("failed");
    expect(updatedExecution?.error).toBe("Workflow failed");
    expect(updatedExecution?.finishedAt).toBeDefined();
  });

  // Test workflow registration edge cases
  it("should handle invalid workflow definitions gracefully", async () => {
    // Create a fresh server with no valid workflows
    const noValidWorkflowsServer = createServer({});
    const registeredWorkflows = noValidWorkflowsServer.getWorkflows();

    // Should have no registered workflows
    expect(registeredWorkflows).toHaveLength(0);

    // Start the server to trigger the warning
    noValidWorkflowsServer.start();

    // Cleanup
    await noValidWorkflowsServer.stop();
  });

  describe("Progress Events", () => {
    it("should return workflow messages in SSE format", async () => {
      const executionId = "test-execution";
      const execution: WorkflowExecution = {
        id: executionId,
        workflowName: "testWorkflow",
        executionStatus: "completed",
        createdAt: new Date().toISOString(),
        input: {},
        workflowMessages: new WorkflowMessageList([
          {
            id: "1",
            type: "start",
            workflowName: "testWorkflow",
            timestamp: new Date().toISOString(),
          },
          {
            id: "2",
            type: "data",
            data: "Processing...",
            timestamp: new Date().toISOString(),
          },
          {
            id: "3",
            type: "object",
            data: {
              result: "done",
            },
            label: "testWorkflow",
            timestamp: new Date().toISOString(),
          },
          {
            id: "4",
            type: "event",
            data: {
              result: "done",
            },
            label: "testWorkflow2",
            timestamp: new Date().toISOString(),
          },
          {
            id: "5",
            type: "end",
            timestamp: new Date().toISOString(),
          },
        ]),
      };
      server.setExecution(executionId, execution);

      const response = await server.app.fetch(
        new Request(
          `http://localhost/workflowExecutions/${executionId}/progress`,
          {
            headers: {
              Accept: "text/event-stream",
            },
          },
        ),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
      expect(response.headers.get("Connection")).toBe("keep-alive");

      const sseContent = await response.text();
      expect(sseContent).toContain(
        'id: 1\ndata: {"id":"1","type":"start","workflowName":"testWorkflow"',
      );
      expect(sseContent).toContain(
        'id: 2\ndata: {"id":"2","type":"data","data":"Processing..."',
      );
      expect(sseContent).toContain(
        'id: 3\ndata: {"id":"3","type":"object","data":{"result":"done"},"label":"testWorkflow"',
      );
      expect(sseContent).toContain(
        'id: 4\ndata: {"id":"4","type":"event","data":{"result":"done"},"label":"testWorkflow2"',
      );
      expect(sseContent).toContain('id: 5\ndata: {"id":"5","type":"end"');
    });

    it("should return workflow messages in NDJSON format", async () => {
      // Create a workflow execution with some workflow messages
      const executionId = "test-execution-ndjson";
      const execution: WorkflowExecution = {
        id: executionId,
        workflowName: "testWorkflow",
        executionStatus: "completed",
        createdAt: new Date().toISOString(),
        input: {},
        workflowMessages: new WorkflowMessageList([
          {
            id: "1",
            type: "start",
            workflowName: "testWorkflow",
            timestamp: new Date().toISOString(),
          },
          {
            id: "2",
            type: "data",
            data: "Processing...",
            timestamp: new Date().toISOString(),
          },
          {
            id: "3",
            type: "object",
            data: {
              result: "done",
            },
            label: "testWorkflow",
            timestamp: new Date().toISOString(),
          },
          {
            id: "4",
            type: "end",
            timestamp: new Date().toISOString(),
          },
        ]),
      };
      server.setExecution(executionId, execution);

      const response = await server.app.fetch(
        new Request(
          `http://localhost/workflowExecutions/${executionId}/progress`,
        ),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/x-ndjson");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
      expect(response.headers.get("Connection")).toBe("keep-alive");

      const ndjsonContent = await response.text();
      const events = ndjsonContent
        .trim()
        .split("\n")
        .map((line: string) => JSON.parse(line) as WorkflowMessage);
      expect(events).toHaveLength(4);
      expect(events[0]).toMatchObject({
        id: "1",
        type: "start",
        workflowName: "testWorkflow",
      });
      expect(events[1]).toMatchObject({
        id: "2",
        type: "data",
        data: "Processing...",
      });
      expect(events[2]).toMatchObject({
        id: "3",
        type: "object",
        data: {
          result: "done",
        },
        label: "testWorkflow",
      });
      expect(events[3]).toMatchObject({
        id: "4",
        type: "end",
      });
    });

    it("should filter events based on lastEventId", async () => {
      // Create a workflow execution with some progress events
      const executionId = "test-execution-filter";
      const execution: WorkflowExecution = {
        id: executionId,
        workflowName: "testWorkflow",
        executionStatus: "completed",
        createdAt: new Date().toISOString(),
        input: {},
        workflowMessages: new WorkflowMessageList([
          {
            id: "1",
            type: "start",
            workflowName: "testWorkflow",
            timestamp: new Date().toISOString(),
          },
          {
            id: "2",
            type: "data",
            data: "Processing...",
            timestamp: new Date().toISOString(),
          },
          {
            id: "3",
            type: "object",
            data: {
              result: "done",
            },
            label: "testWorkflow",
            timestamp: new Date().toISOString(),
          },
          {
            id: "4",
            type: "end",
            timestamp: new Date().toISOString(),
          },
        ]),
      };
      server.setExecution(executionId, execution);

      // Test with query parameter
      const response1 = await server.app.fetch(
        new Request(
          `http://localhost/workflowExecutions/${executionId}/progress?lastEventId=1`,
          {
            headers: {
              Accept: "text/event-stream",
            },
          },
        ),
      );

      const sseContent1 = await response1.text();
      expect(sseContent1).not.toContain("id: 1\n");
      expect(sseContent1).toContain("id: 2\n");
      expect(sseContent1).toContain("id: 3\n");
      expect(sseContent1).toContain("id: 4\n");

      // Test with header
      const response2 = await server.app.fetch(
        new Request(
          `http://localhost/workflowExecutions/${executionId}/progress`,
          {
            headers: {
              Accept: "text/event-stream",
              "Last-Event-Id": "2",
            },
          },
        ),
      );

      const sseContent2 = await response2.text();
      expect(sseContent2).not.toContain("id: 1\n");
      expect(sseContent2).not.toContain("id: 2\n");
      expect(sseContent2).toContain("id: 3\n");
    });

    it("should return 404 for non-existent execution", async () => {
      const response = await server.app.fetch(
        new Request(
          "http://localhost/workflowExecutions/non-existent/progress",
        ),
      );

      expect(response.status).toBe(404);
    });
  });

  describe("graceful shutdown", () => {
    it("should wait for active executions to complete", async () => {
      const workflows = {
        longRunningWorkflow: vi.fn(async function longRunningWorkflow() {
          // Simulate a long-running workflow
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { result: "completed" };
        }) as WorkflowFunction,
      };
      workflows.longRunningWorkflow.__gensxWorkflow = true;

      server = createServer(workflows, {
        port: 0,
        logger: {
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
        },
        shutdownTimeout: 3000,
      });

      server.start();

      // Start a long-running workflow execution
      const execution = server.executionHandler.createExecution("longRunningWorkflow", {});
      
      // Execute the workflow asynchronously (don't await)
      server.executeWorkflowAsync(
        "longRunningWorkflow",
        workflows.longRunningWorkflow,
        execution.id,
        {}
      );

      // Wait a moment for execution to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify execution is active
      const activeExecutions = server.workflowManager.getAllExecutions()
        .filter(exec => exec.executionStatus === 'starting' || exec.executionStatus === 'running');
      
      expect(activeExecutions.length).toBe(1);

      // Start graceful shutdown
      const shutdownStart = Date.now();
      
      // Mock process.exit to prevent actual exit during test
      const originalExit = process.exit;
      process.exit = vi.fn() as any;

      try {
        await server.gracefulShutdown();
        
        // Verify shutdown took reasonable time (should wait for execution to complete)
        const shutdownDuration = Date.now() - shutdownStart;
        expect(shutdownDuration).toBeGreaterThan(900); // At least most of the 1s execution time
        
        // Verify server is in shutdown mode
        expect(server.isInShutdown()).toBe(true);

        // Verify execution completed
        const finalExecution = server.workflowManager.getExecution(execution.id);
        expect(finalExecution?.executionStatus).toBe('completed');
      } finally {
        process.exit = originalExit;
      }
    }, 10000); // Increase timeout for this test

    it("should timeout if executions don't complete in time", async () => {
      const workflows = {
        infiniteWorkflow: vi.fn(async function infiniteWorkflow() {
          // Simulate an infinite workflow that will be interrupted
          await new Promise(resolve => setTimeout(resolve, 10000)); // Long delay
          return { result: "should not complete" };
        }) as WorkflowFunction,
      };
      workflows.infiniteWorkflow.__gensxWorkflow = true;

      server = createServer(workflows, {
        port: 0,
        logger: {
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
        },
        shutdownTimeout: 500, // Short timeout for test
      });

      server.start();

      // Start an infinite workflow execution
      const execution = server.executionHandler.createExecution("infiniteWorkflow", {});
      
      // Execute the workflow asynchronously (don't await)
      server.executeWorkflowAsync(
        "infiniteWorkflow",
        workflows.infiniteWorkflow,
        execution.id,
        {}
      );

      // Wait a moment for execution to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Mock process.exit to prevent actual exit during test
      const originalExit = process.exit;
      process.exit = vi.fn() as any;

      try {
        // Start graceful shutdown
        const startTime = Date.now();
        await server.gracefulShutdown();
        const endTime = Date.now();

        // Verify it timed out (should take about 500ms + some overhead)
        expect(endTime - startTime).toBeGreaterThan(400);
        expect(endTime - startTime).toBeLessThan(1000);
      } finally {
        process.exit = originalExit;
      }
    }, 5000);

    it("should reject new requests during shutdown", async () => {
      const workflows = {
        testWorkflow: mockWorkflow,
      };

      server = createServer(workflows, {
        port: 0,
        logger: {
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
        },
      });

      server.start();
      const port = server.getPort();

      // Mark server as shutting down
      (server as any).isShuttingDown = true;

      // Try to make a request
      const response = await fetch(`http://localhost:${port}/workflows`);
      
      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toBe("Service unavailable");
      expect(data.message).toBe("Server is shutting down");
    });
  });

  describe("health endpoint", () => {
    it("should return healthy when no active executions", async () => {
      const workflows = {
        testWorkflow: mockWorkflow,
      };

      server = createServer(workflows, {
        port: 0,
        logger: {
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
        },
      });

      server.start();
      const port = server.getPort();

      const response = await fetch(`http://localhost:${port}/health`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("healthy");
      expect(data.activeExecutions).toBe(0);
      expect(data.readyForTermination).toBe(true);
    });

    it("should return draining when active executions exist", async () => {
      const workflows = {
        longRunningWorkflow: vi.fn(async function longRunningWorkflow() {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return { result: "completed" };
        }) as WorkflowFunction,
      };
      workflows.longRunningWorkflow.__gensxWorkflow = true;

      server = createServer(workflows, {
        port: 0,
        logger: {
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
        },
      });

      server.start();
      const port = server.getPort();

      // Start a long-running workflow execution
      const execution = server.executionHandler.createExecution("longRunningWorkflow", {});
      
      // Execute the workflow asynchronously (don't await)
      server.executeWorkflowAsync(
        "longRunningWorkflow",
        workflows.longRunningWorkflow,
        execution.id,
        {}
      );

      // Wait a moment for execution to start
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await fetch(`http://localhost:${port}/health`);
      
      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.status).toBe("draining");
      expect(data.activeExecutions).toBe(1);
      expect(data.readyForTermination).toBe(false);
    }, 5000);
  });
});
