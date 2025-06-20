/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { serve } from "@hono/node-server";
import { Ajv, ErrorObject } from "ajv/dist/ajv.js";
import { Context, Hono } from "hono";
import { cors } from "hono/cors";
import { Definition } from "typescript-json-schema";
import { ulid } from "ulidx";

/**
 * Custom error classes for consistent error handling
 */
export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export class ServerError extends Error {
  statusCode = 500;
  constructor(message: string) {
    super(message);
    this.name = "ServerError";
  }
}

/**
 * Configuration options for the GenSX dev server
 */
export interface ServerOptions {
  port?: number;
  hostname?: string;
  logger: {
    info: (message: string, ...args: unknown[]) => void;
    error: (message: string, error?: unknown) => void;
    warn: (message: string) => void;
  };
}

/**
 * Interface representing a workflow that can be executed
 */
export interface WorkflowInfo {
  id: string;
  name: string;
  inputSchema?: Definition;
  outputSchema?: Definition;
  createdAt: string;
  updatedAt: string;
  url: string;
}

/**
 * Execution status type
 */
type ExecutionStatus =
  | "queued"
  | "starting"
  | "running"
  | "completed"
  | "failed";

/**
 * Interface representing a workflow execution
 */
export interface WorkflowExecution {
  id: string;
  workflowName: string;
  executionStatus: ExecutionStatus;
  createdAt: string;
  finishedAt?: string;
  input: unknown;
  output?: unknown;
  error?: string;
  workflowMessages: WorkflowMessage[];
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type WorkflowMessage = { id: string; timestamp: string } & (
  | { type: "start"; workflowExecutionId?: string; workflowName: string }
  | {
      type: "component-start";
      componentName: string;
      label?: string;
      componentId: string;
    }
  | {
      type: "component-end";
      componentName: string;
      label?: string;
      componentId: string;
    }
  | { type: "data"; data: JsonValue }
  | { type: "object" | "event"; data: JsonValue; label: string }
  | { type: "error"; error: string }
  | { type: "end" }
);

/**
 * GenSX Server - A development server for GenSX workflows
 */
export class GensxServer {
  private app: Hono;
  private port: number;
  private hostname: string;
  private workflowMap: Map<string, unknown>;
  private schemaMap: Map<string, { input: Definition; output: Definition }>;
  private executionsMap: Map<string, WorkflowExecution>;
  private isRunning = false;
  private server: ReturnType<typeof serve> | null = null;
  private ajv: Ajv;
  private logger: ServerOptions["logger"];

  /**
   * Create a new GenSX dev server
   */
  constructor(
    workflows: Record<string, unknown> = {},
    options: ServerOptions = {
      logger: {
        info: (msg, ...args) => {
          console.info(msg, ...args);
        },
        error: (msg, err) => {
          console.error(msg, err);
        },
        warn: (msg) => {
          console.warn(msg);
        },
      },
    },
    schemas: Record<string, { input: Definition; output: Definition }> = {},
  ) {
    this.port = options.port ?? 1337;
    this.hostname = options.hostname ?? "localhost";
    this.app = new Hono();
    this.workflowMap = new Map();
    this.schemaMap = new Map(Object.entries(schemas));
    this.executionsMap = new Map();
    this.ajv = new Ajv();
    this.logger = options.logger;

    // Register all workflows from the input
    this.registerWorkflows(workflows);

    // Set up error handling middleware
    this.setupErrorHandler();

    // Set up routes
    this.setupRoutes();
  }

  /**
   * Set up error handling middleware
   */
  private setupErrorHandler(): void {
    this.app.onError((err, c) => {
      this.logger.error("❌ Server error:", err.message);

      // Handle different types of errors
      if (err instanceof NotFoundError) {
        return c.json({ error: err.message }, 404);
      } else if (err instanceof BadRequestError) {
        return c.json({ error: err.message }, 400);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        return c.json({ error: "Internal server error", message }, 500);
      }
    });
  }

  /**
   * Register workflows with the server
   */
  private registerWorkflows(workflows: Record<string, unknown>): void {
    for (const [exportName, workflow] of Object.entries(workflows)) {
      // GenSX Workflows are functions with a __gensxWorkflow property (created by gensx.Workflow())

      if (typeof workflow === "function") {
        // Handle GenSX workflow functions
        const workflowFn = workflow as any;

        // Check if this is a GenSX workflow function
        if (workflowFn.__gensxWorkflow === true) {
          const workflowName = workflowFn.name ?? exportName;

          // Wrap the function to match the expected interface
          const wrappedWorkflow = {
            name: workflowName as string,
            run: workflowFn,
          };

          this.workflowMap.set(workflowName as string, wrappedWorkflow);
        }
      }
    }

    if (this.workflowMap.size === 0) {
      this.logger.warn("⚠️ No valid workflows were registered!");
    }
  }

  /**
   * Get a workflow by name or throw NotFoundError
   */
  private getWorkflowOrThrow(workflowName: string): unknown {
    const workflow = this.workflowMap.get(workflowName);
    if (!workflow) {
      throw new NotFoundError(`Workflow '${workflowName}' not found`);
    }
    return workflow;
  }

  /**
   * Get an execution by ID or throw NotFoundError
   */
  private getExecutionOrThrow(
    executionId: string,
    workflowName: string,
  ): WorkflowExecution {
    this.getWorkflowOrThrow(workflowName);
    const execution = this.executionsMap.get(executionId);
    if (!execution) {
      throw new NotFoundError(`Execution '${executionId}' not found`);
    }

    if (workflowName && execution.workflowName !== workflowName) {
      throw new NotFoundError(
        `Execution '${executionId}' does not belong to workflow '${workflowName}'`,
      );
    }

    return execution;
  }

  /**
   * Parse request body with error handling
   */
  private async parseJsonBody(c: Context): Promise<Record<string, unknown>> {
    try {
      return await c.req.json();
    } catch (_) {
      throw new BadRequestError("Invalid JSON");
    }
  }

  /**
   * Validate input against schema
   * Throws BadRequestError if validation fails
   */
  private validateInput(workflowName: string, input: unknown): void {
    // Check if input is missing
    if (input === undefined) {
      throw new BadRequestError("Missing required input parameters");
    }

    // Get schema for this workflow
    const schema = this.schemaMap.get(workflowName);
    if (!schema?.input) {
      // If no schema, we can't validate
      return;
    }

    // Use Ajv to validate the input against the schema
    const validate = this.ajv.compile(schema.input);
    const valid = validate(input);

    if (!valid) {
      const errors = validate.errors ?? [];
      const errorMessages = errors
        .map((err: ErrorObject) => `${err.instancePath} ${err.message}`)
        .join("; ");

      throw new BadRequestError(
        `Input validation failed: the input${errorMessages}`,
      );
    }
  }

  /**
   * Set up server routes
   */
  private setupRoutes(): void {
    // Add middleware
    this.app.use("*", async (c, next) => {
      const start = Date.now();
      const { method, url } = c.req;
      this.logger.info(`<-- ${method} ${url}`);
      await next();
      const duration = Date.now() - start;
      this.logger.info(`--> ${method} ${url} ${c.res.status} ${duration}ms`);
    });
    this.app.use("*", cors());

    // List all workflows
    this.app.get(`/workflows`, (c) => {
      return c.json({
        workflows: this.getWorkflows(),
      });
    });

    // Get a single workflow by name
    this.app.get(`/workflows/:workflowName`, (c) => {
      const workflowName = c.req.param("workflowName");
      this.getWorkflowOrThrow(workflowName);

      // Get schema info
      const schema = this.schemaMap.get(workflowName);
      const id = generateWorkflowId(workflowName);
      const now = new Date().toISOString();

      return c.json({
        id,
        name: workflowName,
        inputSchema: schema?.input ?? { type: "object", properties: {} },
        outputSchema: schema?.output ?? { type: "object", properties: {} },
        createdAt: now,
        updatedAt: now,
        url: `http://${this.hostname}:${this.port}/workflows/${workflowName}`,
      });
    });

    // Start workflow execution asynchronously
    this.app.post(`/workflows/:workflowName/start`, async (c) => {
      const workflowName = c.req.param("workflowName");
      // Will throw NotFoundError if workflow doesn't exist
      const workflow = this.getWorkflowOrThrow(workflowName);

      try {
        // Get request body for workflow parameters
        const body = await this.parseJsonBody(c);

        // Validate that input exists and matches schema
        this.validateInput(workflowName, body);

        // Only create execution ID after validation succeeds
        const executionId = generateExecutionId();
        const now = new Date().toISOString();

        // Initialize execution record
        const execution: WorkflowExecution = {
          id: executionId,
          workflowName,
          executionStatus: "queued",
          createdAt: now,
          input: body,
          workflowMessages: [],
        };

        // Store the execution
        this.executionsMap.set(executionId, execution);

        // Execute the workflow asynchronously
        void this.executeWorkflowAsync(
          workflowName,
          workflow,
          executionId,
          body,
        );

        // Return immediately with executionId
        return c.json(
          {
            executionId,
            executionStatus: "queued",
          },
          202,
        );
      } catch (error) {
        if (error instanceof BadRequestError) {
          this.logger.error(
            `❌ Validation error in workflow '${workflowName}':`,
            error.message,
          );
          return c.json(
            {
              error: error.message,
            },
            400,
          );
        }

        this.logger.error(
          `❌ Error starting workflow '${workflowName}':`,
          error,
        );
        return c.json(
          {
            error: error instanceof Error ? error.message : String(error),
          },
          500,
        );
      }
    });

    // Get execution status
    this.app.get(`/workflows/:workflowName/executions/:executionId`, (c) => {
      const workflowName = c.req.param("workflowName");
      const executionId = c.req.param("executionId");

      // Will throw NotFoundError if execution doesn't exist or doesn't match workflow
      const execution = this.getExecutionOrThrow(executionId, workflowName);

      // Construct the response data with proper type safety
      const responseData: {
        id: string;
        executionStatus: ExecutionStatus;
        createdAt: string;
        finishedAt?: string;
        output?: unknown;
        logs?: {
          stderr: string;
        };
      } = {
        id: execution.id,
        executionStatus: execution.executionStatus,
        createdAt: execution.createdAt,
      };

      // Add optional fields if they exist
      if (execution.finishedAt) {
        responseData.finishedAt = execution.finishedAt;
      }

      if (execution.output !== undefined) {
        responseData.output = execution.output;
      }

      if (execution.error) {
        responseData.logs = {
          stderr: execution.error,
        };
      }

      return c.json(responseData);
    });

    // Get execution progress events
    this.app.get(`/workflowExecutions/:executionId/progress`, (c) => {
      const executionId = c.req.param("executionId");
      const execution = this.executionsMap.get(executionId);
      if (!execution) {
        throw new NotFoundError(`Execution '${executionId}' not found`);
      }

      // Get the last event ID from query param or header
      const lastEventId =
        c.req.query("lastEventId") ?? c.req.header("Last-Event-Id");

      // Filter events based on lastEventId if provided
      const events = execution.workflowMessages;
      const filteredEvents = lastEventId
        ? events.filter((event) => event.id > lastEventId)
        : events;

      // Check if we should use SSE format
      const acceptHeader = c.req.header("Accept");
      const useSSE = acceptHeader === "text/event-stream";

      if (useSSE) {
        // Create a stream for SSE events
        const stream = new ReadableStream({
          start: (controller) => {
            for (const event of filteredEvents) {
              const eventData = JSON.stringify(event);
              controller.enqueue(
                new TextEncoder().encode(
                  `id: ${event.id}\ndata: ${eventData}\n\n`,
                ),
              );
            }
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } else {
        // Return NDJSON format
        const stream = new ReadableStream({
          start: (controller) => {
            for (const event of filteredEvents) {
              controller.enqueue(
                new TextEncoder().encode(JSON.stringify(event) + "\n"),
              );
            }
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "application/x-ndjson",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
    });

    // List executions for a workflow
    this.app.get(`/workflows/:workflowName/executions`, (c) => {
      const workflowName = c.req.param("workflowName");
      // Will throw NotFoundError if workflow doesn't exist
      this.getWorkflowOrThrow(workflowName);

      // Filter executions for this workflow
      const executions = Array.from(this.executionsMap.values())
        .filter((exec) => exec.workflowName === workflowName)
        // Sort by createdAt in descending order (newest first)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .map((exec) => ({
          id: exec.id,
          executionStatus: exec.executionStatus,
          createdAt: exec.createdAt,
          finishedAt: exec.finishedAt,
        }));

      return c.json({
        executions,
      });
    });

    // Execute workflow endpoint
    this.app.post(`/workflows/:workflowName`, async (c) => {
      const workflowName = c.req.param("workflowName");
      // Will throw NotFoundError if workflow doesn't exist
      const workflow = this.getWorkflowOrThrow(workflowName);

      let body: Record<string, unknown> = {};

      try {
        // Get request body for workflow parameters
        body = await this.parseJsonBody(c);

        // Validate that input exists and matches schema
        this.validateInput(workflowName, body);

        // Only create execution ID after validation succeeds
        const executionId = generateExecutionId();
        const now = new Date().toISOString();

        this.logger.info(
          `⚡️ Executing workflow '${workflowName}' with params:`,
          body,
        );

        // Initialize execution record
        const execution: WorkflowExecution = {
          id: executionId,
          workflowName,
          executionStatus: "running", // Start directly in running state since this is synchronous
          createdAt: now,
          input: body,
          workflowMessages: [],
        };

        // Store the execution
        this.executionsMap.set(executionId, execution);

        // Execute the workflow
        const runMethod = (workflow as any).run;

        if (typeof runMethod !== "function") {
          // Update execution with error
          const errorMessage = `Workflow '${workflowName}' doesn't have a run method`;
          execution.executionStatus = "failed";
          execution.error = errorMessage;
          execution.finishedAt = new Date().toISOString();
          this.executionsMap.set(executionId, execution);

          throw new ServerError(errorMessage);
        }

        try {
          // Check if we should stream progress events
          const acceptHeader = c.req.header("Accept");
          const shouldStreamProgress =
            acceptHeader === "text/event-stream" ||
            acceptHeader === "application/x-ndjson";

          if (shouldStreamProgress) {
            // Create a stream for progress events
            const stream = new ReadableStream({
              start: async (controller) => {
                try {
                  // Set up progress listener
                  const messageListener = (event: any) => {
                    const message = {
                      ...event,
                      id: Date.now().toString(),
                      timestamp: new Date().toISOString(),
                    } as WorkflowMessage;
                    const messageData = JSON.stringify(message);
                    execution.workflowMessages.push(message);
                    if (acceptHeader === "text/event-stream") {
                      controller.enqueue(
                        new TextEncoder().encode(
                          `id: ${message.id}\ndata: ${messageData}\n\n`,
                        ),
                      );
                    } else {
                      controller.enqueue(
                        new TextEncoder().encode(messageData + "\n"),
                      );
                    }
                  };

                  // Execute workflow with progress listener
                  const result = await runMethod.call(workflow, body, {
                    messageListener,
                  });

                  if (
                    result &&
                    typeof result === "object" &&
                    Symbol.asyncIterator in result
                  ) {
                    for await (const chunk of result) {
                      const outputEvent = {
                        id: Date.now().toString(),
                        timestamp: new Date().toISOString(),
                        type: "output",
                        content:
                          typeof chunk === "string"
                            ? chunk
                            : JSON.stringify(chunk),
                      };
                      if (acceptHeader === "text/event-stream") {
                        controller.enqueue(
                          new TextEncoder().encode(
                            `id: ${outputEvent.id}\ndata: ${JSON.stringify(outputEvent)}\n\n`,
                          ),
                        );
                      } else {
                        controller.enqueue(
                          new TextEncoder().encode(
                            JSON.stringify(outputEvent) + "\n",
                          ),
                        );
                      }
                    }
                  } else {
                    const outputEvent = {
                      id: Date.now().toString(),
                      timestamp: new Date().toISOString(),
                      type: "output",
                      content:
                        typeof result === "string"
                          ? result
                          : JSON.stringify(result),
                    };
                    if (acceptHeader === "text/event-stream") {
                      controller.enqueue(
                        new TextEncoder().encode(
                          `id: ${outputEvent.id}\ndata: ${JSON.stringify(outputEvent)}\n\n`,
                        ),
                      );
                    } else {
                      controller.enqueue(
                        new TextEncoder().encode(
                          JSON.stringify(outputEvent) + "\n",
                        ),
                      );
                    }
                  }

                  // Update execution with result
                  execution.executionStatus = "completed";
                  execution.output = result;
                  execution.finishedAt = new Date().toISOString();
                  this.executionsMap.set(executionId, execution);

                  controller.close();
                } catch (error) {
                  // Update execution with error
                  execution.executionStatus = "failed";
                  execution.error =
                    error instanceof Error ? error.message : String(error);
                  execution.finishedAt = new Date().toISOString();
                  this.executionsMap.set(executionId, execution);

                  // Send error event
                  const errorEvent = {
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    type: "error",
                    executionId,
                    executionStatus: "failed",
                    error:
                      error instanceof Error ? error.message : String(error),
                  };
                  const errorEventData = JSON.stringify(errorEvent);
                  if (acceptHeader === "text/event-stream") {
                    controller.enqueue(
                      new TextEncoder().encode(
                        `id: ${errorEvent.id}\ndata: ${errorEventData}\n\n`,
                      ),
                    );
                  } else {
                    controller.enqueue(
                      new TextEncoder().encode(errorEventData + "\n"),
                    );
                  }

                  controller.close();
                }
              },
            });

            return new Response(stream, {
              headers: {
                "Content-Type":
                  acceptHeader === "text/event-stream"
                    ? "text/event-stream"
                    : "application/x-ndjson",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
              },
            });
          }

          // Handle regular non-streaming execution
          const result = await runMethod.call(workflow, body, {
            messageListener: (event: any) => {
              const message = {
                ...event,
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
              } as WorkflowMessage;
              execution.workflowMessages.push(message);
            },
          });

          // Update execution with result
          execution.executionStatus = "completed";
          execution.output = result;
          execution.finishedAt = new Date().toISOString();
          this.executionsMap.set(executionId, execution);

          // Handle different response types
          if (
            result &&
            typeof result === "object" &&
            Symbol.asyncIterator in result
          ) {
            // Handle streaming responses
            return this.handleStreamingResponse(
              c,
              result as AsyncIterable<unknown>,
            );
          }

          // Handle regular JSON response
          return c.json({
            executionId,
            executionStatus: "completed",
            output: result,
          });
        } catch (error) {
          this.logger.error(
            `❌ Error executing workflow '${workflowName}':`,
            error instanceof Error ? error.message : String(error),
          );
          execution.executionStatus = "failed";
          execution.error =
            error instanceof Error ? error.message : String(error);
          execution.finishedAt = new Date().toISOString();
          this.executionsMap.set(executionId, execution);

          return c.json(
            {
              executionId,
              executionStatus: "failed",
              error: error instanceof Error ? error.message : String(error),
            },
            422,
          );
        }
      } catch (error) {
        // For validation errors, don't create an execution record
        if (error instanceof BadRequestError) {
          this.logger.error(
            `❌ Validation error in workflow '${workflowName}':`,
            error.message,
          );
          return c.json(
            {
              error: error.message,
            },
            400,
          );
        }

        this.logger.error(
          `❌ Error executing workflow '${workflowName}':`,
          error instanceof Error ? error.message : String(error),
        );

        // For other errors, proceed with server error
        return c.json(
          {
            error: error instanceof Error ? error.message : String(error),
          },
          500,
        );
      }
    });

    // UI for testing workflows
    this.app.get("/openapi.json", (c) => {
      return c.json(this.generateOpenApiSpec());
    });

    this.app.get("/swagger-ui", (c) => {
      const html = this.generateSwaggerUI();
      return c.html(html);
    });
  }

  /**
   * Handle streaming responses
   */
  private handleStreamingResponse(
    _c: Context,
    streamResult: AsyncIterable<unknown>,
  ) {
    const logger = this.logger;
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResult) {
            // Stringify the chunk if it's not already a string
            const chunkStr =
              typeof chunk === "string" ? chunk : JSON.stringify(chunk) + "\n";
            controller.enqueue(new TextEncoder().encode(chunkStr));
          }

          // Close the stream
          controller.close();
        } catch (error) {
          logger.error(
            `❌ Error in streaming response:`,
            error instanceof Error ? error.message : String(error),
          );
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/stream",
        "Transfer-Encoding": "chunked",
      },
    });
  }

  /**
   * Generate OpenAPI specification dynamically based on server configuration
   */
  private generateOpenApiSpec(): Record<string, unknown> {
    const workflows = this.getWorkflows();

    return {
      openapi: "3.0.0",
      info: {
        title: "GenSX API",
        version: "1.0.0",
        description: "API documentation for GenSX workflows",
      },
      servers: [
        {
          url: `http://${this.hostname}:${this.port}`,
          description: "Development Server",
        },
      ],
      tags: [
        {
          name: "Workflows",
          description: "List and manage workflows",
        },
        ...workflows.map((workflow) => ({
          name: workflow.name,
          description: `Operations for ${workflow.name} workflow`,
        })),
      ],
      paths: {
        "/workflows": {
          get: {
            tags: ["Workflows"],
            summary: "List all workflows",
            responses: {
              "200": {
                description: "List of available workflows",
                content: {
                  "application/json": {
                    example: {
                      workflows,
                    },
                  },
                },
              },
            },
          },
        },
        "/workflowExecutions/{executionId}/progress": {
          get: {
            tags: ["Workflows"],
            summary: "Get progress events for a workflow execution",
            parameters: [
              {
                name: "executionId",
                in: "path",
                required: true,
                schema: { type: "string" },
                description: "ID of the workflow execution",
              },
              {
                name: "lastEventId",
                in: "query",
                required: false,
                schema: { type: "string" },
                description: "Filter events after this ID",
              },
            ],
            responses: {
              "200": {
                description: "Progress events in SSE or NDJSON format",
                content: {
                  "text/event-stream": {
                    schema: {
                      type: "string",
                      example:
                        'id: 1\ndata: {"type":"start","workflowName":"testWorkflow"}\n\n',
                    },
                  },
                  "application/x-ndjson": {
                    schema: {
                      type: "string",
                      example:
                        '{"id":"1","type":"start","workflowName":"testWorkflow"}\n',
                    },
                  },
                },
                headers: {
                  "Last-Event-Id": {
                    schema: {
                      type: "string",
                    },
                    description: "ID of the last event sent",
                  },
                },
              },
              "404": {
                description: "Execution not found",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        error: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        ...Object.fromEntries(
          workflows.map((workflow) => [
            `/workflows/${workflow.name}`,
            {
              get: {
                tags: [workflow.name],
                summary: `Get ${workflow.name} workflow details`,
                responses: {
                  "200": {
                    description: "Workflow details",
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            inputSchema: { type: "object" },
                            outputSchema: { type: "object" },
                            createdAt: {
                              type: "string",
                              format: "date-time",
                            },
                            updatedAt: {
                              type: "string",
                              format: "date-time",
                            },
                            url: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
              post: {
                tags: [workflow.name],
                summary: `Execute ${workflow.name} workflow`,
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: workflow.inputSchema ?? {
                        type: "object",
                        properties: {},
                      },
                    },
                  },
                },
                responses: {
                  "200": {
                    description: "Successful execution",
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            executionId: { type: "string" },
                            executionStatus: {
                              type: "string",
                              enum: [
                                "completed",
                                "queued",
                                "running",
                                "failed",
                              ],
                            },
                            output: workflow.outputSchema ?? {
                              type: "object",
                              properties: {},
                            },
                          },
                        },
                      },
                      "text/event-stream": {
                        schema: {
                          type: "string",
                          description:
                            "Server-Sent Events (SSE) stream of progress events",
                          example:
                            'id: 1\ndata: {"type":"start","workflowName":"testWorkflow"}\n\nid: 2\ndata: {"type":"progress","data":"Processing..."}\n\n',
                        },
                      },
                      "application/x-ndjson": {
                        schema: {
                          type: "string",
                          description:
                            "Newline-delimited JSON stream of progress events",
                          example:
                            '{"id":"1","type":"start","workflowName":"testWorkflow"}\n{"id":"2","type":"progress","data":"Processing..."}\n',
                        },
                      },
                      "application/stream": {
                        schema: {
                          type: "string",
                          description:
                            "Streaming response for workflows that returns streaming output",
                        },
                      },
                    },
                    headers: {
                      "Content-Type": {
                        schema: {
                          type: "string",
                          enum: [
                            "application/json",
                            "text/event-stream",
                            "application/x-ndjson",
                            "application/stream",
                          ],
                        },
                        description: "Response format based on Accept header",
                      },
                      "Transfer-Encoding": {
                        schema: {
                          type: "string",
                          enum: ["chunked"],
                        },
                        description: "Present for streaming responses",
                      },
                    },
                  },
                  "400": {
                    description: "Bad request",
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            error: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                  "422": {
                    description: "Workflow execution failed",
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            executionId: { type: "string" },
                            executionStatus: {
                              type: "string",
                              enum: ["failed"],
                            },
                            error: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ]),
        ),
        ...Object.fromEntries(
          workflows.map((workflow) => [
            `/workflows/${workflow.name}/start`,
            {
              post: {
                tags: [workflow.name],
                summary: `Start ${workflow.name} workflow asynchronously`,
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: workflow.inputSchema ?? {
                        type: "object",
                        properties: {},
                      },
                    },
                  },
                },
                responses: {
                  "202": {
                    description: "Workflow started",
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            executionId: { type: "string" },
                            executionStatus: {
                              type: "string",
                              enum: ["queued"],
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ]),
        ),
        ...Object.fromEntries(
          workflows.map((workflow) => [
            `/workflows/${workflow.name}/executions/{executionId}`,
            {
              get: {
                tags: [workflow.name],
                summary: `Get execution status for ${workflow.name} workflow`,
                parameters: [
                  {
                    name: "executionId",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                  },
                ],
                responses: {
                  "200": {
                    description: "Execution status",
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            executionStatus: {
                              type: "string",
                              enum: [
                                "queued",
                                "starting",
                                "running",
                                "completed",
                                "failed",
                              ],
                            },
                            createdAt: {
                              type: "string",
                              format: "date-time",
                            },
                            finishedAt: {
                              type: "string",
                              format: "date-time",
                            },
                            output: workflow.outputSchema ?? {},
                            error: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ]),
        ),
        ...Object.fromEntries(
          workflows.map((workflow) => [
            `/workflows/${workflow.name}/executions`,
            {
              get: {
                tags: [workflow.name],
                summary: `List executions for ${workflow.name} workflow`,
                responses: {
                  "200": {
                    description: "List of workflow executions",
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            executions: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  id: { type: "string" },
                                  executionStatus: {
                                    type: "string",
                                    enum: [
                                      "queued",
                                      "starting",
                                      "running",
                                      "completed",
                                      "failed",
                                    ],
                                  },
                                  createdAt: {
                                    type: "string",
                                    format: "date-time",
                                  },
                                  finishedAt: {
                                    type: "string",
                                    format: "date-time",
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ]),
        ),
      },
    };
  }

  /**
   * Generate Swagger UI HTML
   */
  private generateSwaggerUI(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>GenSX API</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@latest/swagger-ui.css" />
      <style>
        body {
          margin: 0;
          padding: 0;
        }
        #swagger-ui {
          max-width: 1460px;
          margin: 0 auto;
          padding: 20px;
        }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@latest/swagger-ui-bundle.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            url: '/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIBundle.SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "BaseLayout",
            displayRequestDuration: true,
            docExpansion: 'list',
            filter: true,
            tryItOutEnabled: true
          });
        };
      </script>
    </body>
    </html>
    `;
  }

  /**
   * Start the server and return this instance for chaining
   */
  public start(): this {
    if (this.isRunning) {
      this.logger.warn("⚠️ Server is already running");
      return this;
    }

    //this.logger.info(`🚀 Starting GenSX server on port ${this.port}...`);

    try {
      this.server = serve({
        fetch: this.app.fetch,
        port: this.port,
      });

      this.isRunning = true;
      //this.logger.info("✨ Server started successfully");
    } catch (error: unknown) {
      this.logger.error(
        `❌ Failed to start server on port ${this.port}`,
        error,
      );
      if (error instanceof Error && error.message.includes("EADDRINUSE")) {
        this.logger.error(
          `⛔ Port ${this.port} is already in use by another process!`,
        );
      }
      this.isRunning = false; // Ensure we mark as not running in case of error
      // Re-throw to allow calling code to handle
      throw error;
    }

    return this;
  }

  /**
   * Stop the server if it's running
   */
  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isRunning || !this.server) {
        this.logger.warn("⚠️ Server is not running or not initialized");
        this.isRunning = false; // Ensure consistent state
        resolve();
        return;
      }

      //this.logger.info("🛑 Stopping GenSX server...");

      this.server.close((err) => {
        if (err) {
          this.logger.error("❌ Error stopping server:", err);
          this.isRunning = false;
          reject(err);
          return;
        }
        this.isRunning = false;
        //this.logger.info("✅ Server stopped successfully");
        resolve();
      });

      // Attempt to close all connections if the method exists
      const serverWithAdvancedClose = this.server as any;
      if (typeof serverWithAdvancedClose.closeAllConnections === "function") {
        serverWithAdvancedClose.closeAllConnections();
      }
      if (typeof serverWithAdvancedClose.closeIdleConnections === "function") {
        serverWithAdvancedClose.closeIdleConnections();
      }
    });
  }

  /**
   * Return information about available workflows
   */
  public getWorkflows(): WorkflowInfo[] {
    return Array.from(this.workflowMap.entries()).map(([name, _]) => {
      // Get schema information
      const schema = this.schemaMap.get(name);
      // Generate a unique ID for the workflow
      const id = generateWorkflowId(name);
      const now = new Date().toISOString();

      return {
        id,
        name,
        inputSchema: schema?.input ?? { type: "object", properties: {} },
        outputSchema: schema?.output ?? { type: "object", properties: {} },
        createdAt: now,
        updatedAt: now,
        url: `http://${this.hostname}:${this.port}/workflows/${name}`,
      };
    });
  }

  /**
   * Async iterator for workflows - allows for the for-await-of pattern
   */
  public async *workflows(): AsyncIterableIterator<WorkflowInfo> {
    const workflowList = this.getWorkflows();
    for (const workflow of workflowList) {
      // Using await to satisfy the linter requirement
      await Promise.resolve();
      yield workflow;
    }
  }

  /**
   * Execute a workflow asynchronously and update its status
   */
  private async executeWorkflowAsync(
    workflowName: string,
    workflow: unknown,
    executionId: string,
    input: unknown,
  ): Promise<void> {
    // Get the current execution record
    const execution = this.executionsMap.get(executionId);
    if (!execution) {
      this.logger.error(`Execution ${executionId} not found`);
      return;
    }

    try {
      // Initialize progress events array
      execution.workflowMessages = [];

      // Update status to starting
      execution.executionStatus = "starting";
      this.executionsMap.set(executionId, execution);

      // Get the run method
      const runMethod = (workflow as any).run;
      if (typeof runMethod !== "function") {
        throw new Error(`Workflow '${workflowName}' doesn't have a run method`);
      }

      // Update status to running
      execution.executionStatus = "running";
      this.executionsMap.set(executionId, execution);

      // Execute the workflow
      this.logger.info(
        `⚡️ Executing async workflow '${workflowName}' with execution ID ${executionId}`,
      );

      // Set up progress listener
      const messageListener = (event: any) => {
        const workflowMessage: WorkflowMessage = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          ...event,
        };
        execution.workflowMessages.push(workflowMessage);
        this.executionsMap.set(executionId, execution);
      };

      const result = await runMethod.call(workflow, input, {
        messageListener,
      });

      // Update execution with result
      execution.executionStatus = "completed";
      execution.output = result;
      execution.finishedAt = new Date().toISOString();
      this.executionsMap.set(executionId, execution);

      this.logger.info(
        `✅ Completed async workflow '${workflowName}' execution ${executionId}`,
      );
    } catch (error) {
      // Update execution with error
      execution.executionStatus = "failed";
      execution.error = error instanceof Error ? error.message : String(error);
      execution.finishedAt = new Date().toISOString();

      // Add error event
      const errorEvent: WorkflowMessage = {
        id: Date.now().toString(),
        type: "error",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
      execution.workflowMessages.push(errorEvent);

      this.executionsMap.set(executionId, execution);

      this.logger.error(
        `❌ Failed async workflow '${workflowName}' execution ${executionId}:`,
        error,
      );
    }
  }
}

/**
 * Create a new GenSX server instance
 */
export function createServer(
  workflows: Record<string, unknown> = {},
  options: ServerOptions = {
    logger: {
      info: (msg, ...args) => {
        console.info(msg, ...args);
      },
      error: (msg, err) => {
        console.error(msg, err);
      },
      warn: (msg) => {
        console.warn(msg);
      },
    },
  },
  schemas: Record<string, { input: Definition; output: Definition }> = {},
): GensxServer {
  return new GensxServer(workflows, options, schemas);
}

/**
 * Generate a deterministic ID for a workflow
 */
function generateWorkflowId(name: string): string {
  const prefix = "01";
  const encoded = Buffer.from(name)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .toUpperCase()
    .substring(0, 22);

  return `${prefix}${encoded}`;
}

function generateExecutionId(): string {
  return ulid();
}
