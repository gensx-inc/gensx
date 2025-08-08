import { Hono } from "hono";
import { cors } from "hono/cors";

import { BadRequestError, NotFoundError } from "./errors.js";
import { ExecutionManager } from "./execution-handler.js";
import { generateOpenApiSpec, generateSwaggerUI } from "./openapi.js";
import { CustomEvent, JsonValue, WorkflowMessage } from "./types.js";
import { decodeLocalScopedToken, encodeLocalScopedToken, generateExecutionId, generateWorkflowId } from "./utils.js";
import { ValidationManager } from "./validation.js";
import { WorkflowManager } from "./workflow-manager.js";

/**
 * Set up all routes for the GenSX dev server
 */
export function setupRoutes(
  app: Hono,
  workflowManager: WorkflowManager,
  validationManager: ValidationManager,
  executionHandler: ExecutionManager,
  logger: {
    info: (msg: string, ...args: unknown[]) => void;
    error: (msg: string, error?: unknown) => void;
    warn: (msg: string) => void;
  },
  hostname: string,
  port: number,
): void {
  // Add middleware
  app.use("*", async (c, next) => {
    const start = Date.now();
    const { method, url } = c.req;
    logger.info(`<-- ${method} ${url}`);
    await next();
    const duration = Date.now() - start;
    logger.info(`--> ${method} ${url} ${c.res.status} ${duration}ms`);
  });
  app.use("*", cors());

  // List all workflows
  app.get(`/workflows`, (c) => {
    return c.json({
      workflows: workflowManager.getWorkflows(),
    });
  });

  // Create a local scoped token (dev-only)
  app.post(`/scoped-tokens`, async (c) => {
    try {
      const body = (await validationManager.parseJsonBody(c));
      const name = String(body.name as string | undefined ?? "local-scoped-token");
      const executionScope = (body.executionScope as Record<string, unknown> | undefined) ?? {};
      const projectName = String(body.projectName as string | undefined ?? "local-project");
      const workflowName = (body.workflowName as string | undefined | null) ?? null;
      const environmentName = (body.environmentName as string | undefined | null) ?? null;
      const permissions = (Array.isArray(body.permissions) ? (body.permissions as string[]) : [
        "start",
        "run",
        "progress",
        "output",
        "status",
      ]);
      const expiresAtStr = String(body.expiresAt as string | undefined ?? new Date(Date.now() + 1000 * 60 * 60).toISOString());
      const requiredMatchFields = (Array.isArray(body.requiredMatchFields)
        ? (body.requiredMatchFields as string[])
        : ["*"]);

      const id = generateExecutionId();
      const token = encodeLocalScopedToken(executionScope);
      const createdAt = new Date();
      const expiresAt = new Date(expiresAtStr);

      return c.json({
        id,
        token,
        name,
        executionScope,
        projectId: "local-project-id",
        projectName,
        workflowName,
        environmentId: environmentName ? "local-environment-id" : null,
        environmentName,
        permissions,
        expiresAt,
        createdAt,
        requiredMatchFields,
      });
    } catch (error) {
      logger.error("❌ Error creating local scoped token:", error instanceof Error ? error.message : String(error));
      return c.json({ error: "Failed to create local scoped token" }, 500);
    }
  });

  // Get a single workflow by name
  app.get(`/workflows/:workflowName`, (c) => {
    const workflowName = c.req.param("workflowName");
    workflowManager.getWorkflowOrThrow(workflowName);

    // Get schema info
    const schema = workflowManager.getSchema(workflowName);
    const id = generateWorkflowId(workflowName);
    const now = new Date().toISOString();

    return c.json({
      id,
      name: workflowName,
      inputSchema: schema?.input ?? { type: "object", properties: {} },
      outputSchema: schema?.output ?? { type: "object", properties: {} },
      createdAt: now,
      updatedAt: now,
      url: `http://${hostname}:${port}/workflows/${workflowName}`,
    });
  });

  // Start workflow execution asynchronously
  app.post(`/workflows/:workflowName/start`, async (c) => {
    const workflowName = c.req.param("workflowName");
    // Will throw NotFoundError if workflow doesn't exist
    const workflow = workflowManager.getWorkflowOrThrow(workflowName);

    try {
      // Get request body for workflow parameters
      const body = await validationManager.parseJsonBody(c);

      // Extract local scoped token execution scope if provided
      const authHeader = c.req.header("Authorization") ?? c.req.header("authorization");
      const bearer = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : undefined;
      const localExecutionScope = bearer ? decodeLocalScopedToken(bearer) : undefined;

      // Validate that input exists and matches schema
      const schema = workflowManager.getSchema(workflowName);
      validationManager.validateInput(body, schema);

      // Create execution record
      const execution = executionHandler.createExecution(workflowName, body);

      // Execute the workflow asynchronously
      void executionHandler.executeWorkflowAsync(
        workflowName,
        workflow,
        execution.id,
        body,
        logger,
        localExecutionScope,
      );

      // Return immediately with executionId
      return c.json(
        {
          executionId: execution.id,
          executionStatus: "queued",
        },
        202,
      );
    } catch (error) {
      if (error instanceof BadRequestError) {
        logger.error(
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

      logger.error(`❌ Error starting workflow '${workflowName}':`, error);
      return c.json(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  });

  // Get execution status
  app.get(`/workflows/:workflowName/executions/:executionId`, (c) => {
    const workflowName = c.req.param("workflowName");
    const executionId = c.req.param("executionId");

    // Will throw NotFoundError if execution doesn't exist or doesn't match workflow
    const execution = workflowManager.getExecutionOrThrow(
      executionId,
      workflowName,
    );

    // Construct the response data with proper type safety
    const responseData: {
      id: string;
      executionStatus: string;
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
  app.get(`/workflowExecutions/:executionId/progress`, (c) => {
    const executionId = c.req.param("executionId");
    const execution = workflowManager.getExecution(executionId);
    if (!execution) {
      throw new NotFoundError(`Execution '${executionId}' not found`);
    }

    // Get the last event ID from query param or header
    const lastEventId =
      c.req.query("lastEventId") ?? c.req.header("Last-Event-Id");

    // Filter events based on lastEventId if provided
    const events = execution.workflowMessages.getMessages();
    const filteredEvents = lastEventId
      ? events.filter((event) => event.id > lastEventId)
      : events;

    const preparedEvents = filteredEvents.map((event) => {
      // Amend the event if fulfilled
      if (event.type === "external-tool") {
        const inputRequest = executionHandler.getInputRequest(
          executionId,
          event.nodeId,
        );

        if (inputRequest?.fulfilled) {
          return {
            ...event,
            fulfilled: true,
          };
        }
      }

      return event;
    });

    // Check if we should use SSE format
    const acceptHeader = c.req.header("Accept");
    const useSSE = acceptHeader === "text/event-stream";

    if (useSSE) {
      // Create a stream for SSE events
      const stream = new ReadableStream({
        start: (controller) => {
          for (const event of preparedEvents) {
            const eventData = JSON.stringify(event);
            controller.enqueue(
              new TextEncoder().encode(
                `id: ${event.id}\ndata: ${eventData}\n\n`,
              ),
            );
          }

          if (!preparedEvents.find((event) => event.type === "end")) {
            execution.workflowMessages.addEventListener(
              "message",
              (evt: Event) => {
                const event = evt as CustomEvent<WorkflowMessage>;

                controller.enqueue(
                  new TextEncoder().encode(
                    `id: ${event.detail.id}\ndata: ${JSON.stringify(event.detail)}\n\n`,
                  ),
                );

                if (event.detail.type === "end") {
                  controller.close();
                }
              },
            );
          } else {
            controller.close();
          }
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
          for (const event of preparedEvents) {
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify(event) + "\n"),
            );
          }

          if (!preparedEvents.find((event) => event.type === "end")) {
            execution.workflowMessages.addEventListener(
              "message",
              (evt: Event) => {
                const event = evt as CustomEvent<WorkflowMessage>;
                controller.enqueue(
                  new TextEncoder().encode(JSON.stringify(event.detail) + "\n"),
                );

                if (event.detail.type === "end") {
                  controller.close();
                }
              },
            );
          } else {
            controller.close();
          }
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
  app.get(`/workflows/:workflowName/executions`, (c) => {
    const workflowName = c.req.param("workflowName");
    // Will throw NotFoundError if workflow doesn't exist
    workflowManager.getWorkflowOrThrow(workflowName);

    // Filter executions for this workflow
    const executions = workflowManager
      .getExecutionsForWorkflow(workflowName)
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

  // Fulfill input request for a node
  app.post(`/workflowExecutions/:executionId/fulfill/:nodeId`, async (c) => {
    const executionId = c.req.param("executionId");
    const nodeId = c.req.param("nodeId");
    const execution = workflowManager.getExecution(executionId);
    if (!execution) {
      throw new NotFoundError(`Execution '${executionId}' not found`);
    }

    const data = (await c.req.json()) as unknown as JsonValue;

    executionHandler.handleInputRequest(executionId, nodeId, data);

    return c.json({ success: true });
  });

  // Execute workflow endpoint
  app.post(`/workflows/:workflowName`, async (c) => {
    const workflowName = c.req.param("workflowName");
    // Will throw NotFoundError if workflow doesn't exist
    const workflow = workflowManager.getWorkflowOrThrow(workflowName);

    let body: Record<string, unknown> = {};

    try {
      // Get request body for workflow parameters
      body = await validationManager.parseJsonBody(c);

      // Extract local scoped token execution scope if provided
      const authHeader = c.req.header("Authorization") ?? c.req.header("authorization");
      const bearer = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : undefined;
      const localExecutionScope = bearer ? decodeLocalScopedToken(bearer) : undefined;

      // Validate that input exists and matches schema
      const schema = workflowManager.getSchema(workflowName);
      validationManager.validateInput(body, schema);

      // Create execution record
      const execution = executionHandler.createExecution(workflowName, body);

      logger.info(
        `⚡️ Executing workflow '${workflowName}' with params:`,
        body,
      );

      // Execute the workflow
      const runMethod = workflow.run;

      if (typeof runMethod !== "function") {
        // Update execution with error
        const errorMessage = `Workflow '${workflowName}' doesn't have a run method`;
        execution.executionStatus = "failed";
        execution.error = errorMessage;
        execution.finishedAt = new Date().toISOString();
        workflowManager.setExecution(execution.id, execution);

        throw new Error(errorMessage);
      }

      try {
        // Check if we should stream progress events
        const acceptHeader = c.req.header("Accept");
        const shouldStreamProgress =
          acceptHeader === "text/event-stream" ||
          acceptHeader === "application/x-ndjson";

        const onRequestInput = executionHandler.createInputRequestCallback(
          execution.id,
        );

        if (shouldStreamProgress) {
          // Create a stream for progress events
          const stream = new ReadableStream({
            start: async (controller) => {
              try {
                // Set up progress listener
                const messageListener = (event: WorkflowMessage) => {
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
                  workflowExecutionId: execution.id,
                  onRequestInput,
                  executionScope: localExecutionScope,
                });

                if (
                  result &&
                  typeof result === "object" &&
                  Symbol.asyncIterator in result
                ) {
                  for await (const chunk of result as AsyncIterable<unknown>) {
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
                workflowManager.setExecution(execution.id, execution);

                controller.close();
              } catch (error) {
                // Update execution with error
                execution.executionStatus = "failed";
                execution.error =
                  error instanceof Error ? error.message : String(error);
                execution.finishedAt = new Date().toISOString();
                workflowManager.setExecution(execution.id, execution);

                // Send error event
                const errorEvent = {
                  id: Date.now().toString(),
                  timestamp: new Date().toISOString(),
                  type: "error",
                  executionId: execution.id,
                  executionStatus: "failed",
                  error: error instanceof Error ? error.message : String(error),
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
          messageListener: (event: WorkflowMessage) => {
            const message = {
              ...event,
              id: Date.now().toString(),
              timestamp: new Date().toISOString(),
            } as WorkflowMessage;
            execution.workflowMessages.push(message);
          },
          workflowExecutionId: execution.id,
          onRequestInput,
          executionScope: localExecutionScope,
        });

        // Update execution with result
        execution.executionStatus = "completed";
        execution.output = result;
        execution.finishedAt = new Date().toISOString();
        workflowManager.setExecution(execution.id, execution);

        // Handle different response types
        if (
          result &&
          typeof result === "object" &&
          Symbol.asyncIterator in result
        ) {
          // Handle streaming responses
          return executionHandler.handleStreamingResponse(
            result as AsyncIterable<unknown>,
            logger,
          );
        }

        // Handle regular JSON response
        return c.json({
          executionId: execution.id,
          executionStatus: "completed",
          output: result,
        });
      } catch (error) {
        logger.error(
          `❌ Error executing workflow '${workflowName}':`,
          error instanceof Error ? error.message : String(error),
        );
        execution.executionStatus = "failed";
        execution.error =
          error instanceof Error ? error.message : String(error);
        execution.finishedAt = new Date().toISOString();
        workflowManager.setExecution(execution.id, execution);

        return c.json(
          {
            executionId: execution.id,
            executionStatus: "failed",
            error: error instanceof Error ? error.message : String(error),
          },
          422,
        );
      }
    } catch (error) {
      // For validation errors, don't create an execution record
      if (error instanceof BadRequestError) {
        logger.error(
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

      logger.error(
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
  app.get("/openapi.json", (c) => {
    return c.json(
      generateOpenApiSpec(workflowManager.getWorkflows(), hostname, port),
    );
  });

  app.get("/swagger-ui", (c) => {
    const html = generateSwaggerUI();
    return c.html(html);
  });
}
