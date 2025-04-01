/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { serve } from "@hono/node-server";
import { Ajv, ErrorObject } from "ajv/dist/ajv.js";
import { Context, Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
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
}

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
  private org = "local";
  private project: string;
  private ajv: Ajv;

  /**
   * Create a new GenSX dev server
   */
  constructor(
    workflows: Record<string, unknown> = {},
    org: string,
    project: string,
    options: ServerOptions = {},
    schemas: Record<string, { input: Definition; output: Definition }> = {},
  ) {
    this.port = options.port ?? 1337;
    this.hostname = options.hostname ?? "localhost";
    this.app = new Hono();
    this.workflowMap = new Map();
    this.schemaMap = new Map(Object.entries(schemas));
    this.executionsMap = new Map();
    this.ajv = new Ajv();
    this.org = org;
    this.project = project;

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
      console.error("❌ Server error:", err.message);

      // Handle different types of errors
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
    });
  }

  /**
   * Register workflows with the server
   */
  private registerWorkflows(workflows: Record<string, unknown>): void {
    // Log what we're registering
    // console.info("Attempting to register workflows:", Object.keys(workflows));

    for (const [exportName, workflow] of Object.entries(workflows)) {
      // GenSX Workflows expose name and run function
      if (workflow && typeof workflow === "object") {
        // Try to access workflow.name first
        let workflowName: string;

        if ("name" in workflow && typeof workflow.name === "string") {
          workflowName = workflow.name;
        } else {
          // Fallback to export name if name not found
          workflowName = exportName;
        }

        this.workflowMap.set(workflowName, workflow);
        //console.info(`Registered workflow: ${workflowName}`);
      }
    }

    if (this.workflowMap.size === 0) {
      console.warn("⚠️ No valid workflows were registered!");
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
      throw new BadRequestError(
        "Missing required 'input' field in request body",
      );
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
        `Input validation failed: Input${errorMessages}`,
      );
    }
  }

  /**
   * Set up server routes
   */
  private setupRoutes(): void {
    // Add middleware
    this.app.use("*", logger());
    this.app.use("*", cors());

    // Add project validation middleware
    this.app.use(
      `/org/${this.org}/projects/:projectName/*`,
      async (c, next) => {
        const projectName = c.req.param("projectName");
        if (projectName !== this.project) {
          return c.json(
            {
              status: "error",
              error: `Project '${projectName}' not found`,
            },
            404,
          );
        }
        await next();
      },
    );

    // List all workflows
    this.app.get(`/org/${this.org}/projects/${this.project}/workflows`, (c) => {
      return c.json({
        status: "ok",
        data: {
          workflows: this.getWorkflows(),
        },
      });
    });

    // Get a single workflow by name
    this.app.get(
      `/org/${this.org}/projects/${this.project}/workflows/:workflowName`,
      (c) => {
        const workflowName = c.req.param("workflowName");
        this.getWorkflowOrThrow(workflowName);

        // Get schema info
        const schema = this.schemaMap.get(workflowName);
        const id = generateWorkflowId(workflowName);
        const now = new Date().toISOString();

        return c.json({
          status: "ok",
          data: {
            id,
            name: workflowName,
            inputSchema: schema?.input ?? { type: "object", properties: {} },
            outputSchema: schema?.output ?? { type: "object", properties: {} },
            createdAt: now,
            updatedAt: now,
            url: `http://${this.hostname}:${this.port}/org/${this.org}/projects/${this.project}/workflows/${workflowName}`,
          },
        });
      },
    );

    // Start workflow execution asynchronously
    this.app.post(
      `/org/${this.org}/projects/${this.project}/workflows/:workflowName/start`,
      async (c) => {
        const workflowName = c.req.param("workflowName");
        // Will throw NotFoundError if workflow doesn't exist
        const workflow = this.getWorkflowOrThrow(workflowName);

        try {
          // Get request body for workflow parameters
          const body = await this.parseJsonBody(c);

          // Validate that input exists and matches schema
          this.validateInput(workflowName, body.input);

          // Only create execution ID after validation succeeds
          const executionId = generateExecutionId();
          const now = new Date().toISOString();

          // Initialize execution record
          const execution: WorkflowExecution = {
            id: executionId,
            workflowName,
            executionStatus: "queued",
            createdAt: now,
            input: body.input,
          };

          // Store the execution
          this.executionsMap.set(executionId, execution);

          // Execute the workflow asynchronously
          void this.executeWorkflowAsync(
            workflowName,
            workflow,
            executionId,
            body.input,
          );

          // Return immediately with executionId
          return c.json({
            status: "ok",
            data: {
              executionId,
              executionStatus: "queued",
            },
          });
        } catch (error) {
          if (error instanceof BadRequestError) {
            console.error(
              `❌ Validation error in workflow '${workflowName}':`,
              error.message,
            );
            return c.json(
              {
                status: "error",
                error: error.message,
              },
              400,
            );
          }

          console.error(`❌ Error starting workflow '${workflowName}':`, error);
          return c.json(
            {
              status: "error",
              error: error instanceof Error ? error.message : String(error),
            },
            500,
          );
        }
      },
    );

    // Get execution status
    this.app.get(
      `/org/${this.org}/projects/${this.project}/workflows/:workflowName/executions/:executionId`,
      (c) => {
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
          error?: string;
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
          responseData.error = execution.error;
        }

        return c.json({
          status: "ok",
          data: responseData,
        });
      },
    );

    // List executions for a workflow
    this.app.get(
      `/org/${this.org}/projects/${this.project}/workflows/:workflowName/executions`,
      (c) => {
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
          status: "ok",
          data: {
            executions,
          },
        });
      },
    );

    // Execute workflow endpoint
    this.app.post(
      `/org/${this.org}/projects/${this.project}/workflows/:workflowName`,
      async (c) => {
        const workflowName = c.req.param("workflowName");
        // Will throw NotFoundError if workflow doesn't exist
        const workflow = this.getWorkflowOrThrow(workflowName);

        let body: Record<string, unknown> = {};

        try {
          // Get request body for workflow parameters
          body = await this.parseJsonBody(c);

          // Validate that input exists and matches schema
          this.validateInput(workflowName, body.input);

          // Only create execution ID after validation succeeds
          const executionId = generateExecutionId();
          const now = new Date().toISOString();

          console.info(
            `⚡️ Executing workflow '${workflowName}' with params:`,
            body,
          );

          // Initialize execution record
          const execution: WorkflowExecution = {
            id: executionId,
            workflowName,
            executionStatus: "running", // Start directly in running state since this is synchronous
            createdAt: now,
            input: body.input,
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

          const result = await runMethod.call(workflow, body.input);

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
            status: "ok",
            data: {
              executionId,
              executionStatus: "completed",
              output: result,
            },
          });
        } catch (error) {
          // For validation errors, don't create an execution record
          if (error instanceof BadRequestError) {
            console.error(
              `❌ Validation error in workflow '${workflowName}':`,
              error.message,
            );
            return c.json(
              {
                status: "error",
                error: error.message,
              },
              400,
            );
          }

          console.error(
            `❌ Error executing workflow '${workflowName}':`,
            error,
          );

          // For other errors, proceed with server error
          return c.json(
            {
              status: "error",
              error: error instanceof Error ? error.message : String(error),
            },
            500,
          );
        }
      },
    );

    // UI for testing workflows
    this.app.get("/ui", (c) => {
      const html = this.generateUI();
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
          console.error("❌ Error in streaming response:", error);
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
   * Generate HTML UI for testing workflows
   */
  private generateUI(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>GenSX Dev Server</title>
      <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
        h1 { color: #333; }
        .workflow { border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem; border-radius: 4px; }
        pre { background: #f5f5f5; padding: 1rem; overflow: auto; }
        button { background: #0070f3; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0051cc; }
        textarea { width: 100%; height: 100px; margin-bottom: 1rem; padding: 0.5rem; }
        .output { margin-top: 1rem; }
        .hidden { display: none; }
      </style>
    </head>
    <body>
      <h1>GenSX Workflow Tester</h1>
      <div id="workflows">Loading...</div>

      <script>
        // Fetch the list of workflows
        async function fetchWorkflows() {
          const response = await fetch('/org/${this.org}/projects/${this.project}/workflows');
          const data = await response.json();

          const workflowsContainer = document.getElementById('workflows');
          workflowsContainer.innerHTML = '';

          if (data.data.workflows.length === 0) {
            workflowsContainer.innerHTML = '<p>No workflows found</p>';
            return;
          }

          data.data.workflows.forEach(workflow => {
            const workflowEl = document.createElement('div');
            workflowEl.className = 'workflow';
            workflowEl.innerHTML = \`
              <h2>\${workflow.name}</h2>
              <p><small>API URL: <code>\${workflow.url}</code></small></p>
              <textarea id="input-\${workflow.name}" placeholder="Input JSON (optional)"></textarea>
              <button id="run-\${workflow.name}">Run Workflow</button>
              <div id="output-\${workflow.name}" class="output hidden">
                <h3>Output:</h3>
                <pre id="output-content-\${workflow.name}"></pre>
              </div>
            \`;
            workflowsContainer.appendChild(workflowEl);

            // Add event listener
            document.getElementById(\`run-\${workflow.name}\`).addEventListener('click', () => {
              runWorkflow(workflow.name);
            });
          });
        }

        // Run a workflow
        async function runWorkflow(name) {
          const inputEl = document.getElementById(\`input-\${name}\`);
          const outputEl = document.getElementById(\`output-\${name}\`);
          const outputContentEl = document.getElementById(\`output-content-\${name}\`);

          outputEl.classList.remove('hidden');
          outputContentEl.innerText = 'Running...';

          try {
            let inputData = {};
            if (inputEl.value.trim()) {
              try {
                inputData = JSON.parse(inputEl.value);
              } catch (e) {
                outputContentEl.innerText = 'Invalid JSON input';
                return;
              }
            }

            const response = await fetch(\`/org/${this.org}/projects/${this.project}/workflows/\${name}\`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(inputData)
            });

            // Check if response is a stream
            const contentType = response.headers.get('Content-Type');

            if (contentType && contentType.includes('text/event-stream')) {
              // Handle streaming response
              outputContentEl.innerText = '';
              const reader = response.body.getReader();
              const decoder = new TextDecoder();

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value);
                const events = text.split('\\n\\n').filter(Boolean);

                for (const event of events) {
                  if (event.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(event.substring(6));
                      if (data.content) {
                        outputContentEl.innerText += data.content;
                      }
                    } catch (e) {
                      // If not valid JSON, just append the raw text
                      if (event !== 'data: [DONE]') {
                        outputContentEl.innerText += event.substring(6);
                      }
                    }
                  }
                }
              }
            } else {
              // Handle regular JSON response
              const data = await response.json();
              outputContentEl.innerText = JSON.stringify(data, null, 2);
            }
          } catch (error) {
            outputContentEl.innerText = \`Error: \${error.message}\`;
          }
        }

        // Initialize
        fetchWorkflows();
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
      console.warn("⚠️ Server is already running");
      return this;
    }

    this.server = serve({
      fetch: this.app.fetch,
      port: this.port,
    });

    this.isRunning = true;

    console.info(
      `🚀 GenSX Dev Server running at http://${this.hostname}:${this.port}`,
    );
    console.info(
      `🧪 Swagger UI available at http://${this.hostname}:${this.port}/ui`,
    );

    return this;
  }

  /**
   * Stop the server if it's running
   */
  public stop(): void {
    if (!this.isRunning) {
      console.warn("⚠️ Server is not running");
      return;
    }

    if (this.server) {
      this.server.close();
    }

    this.isRunning = false;
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
        url: `http://${this.hostname}:${this.port}/org/${this.org}/projects/${this.project}/workflows/${name}`,
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
      console.error(`Execution ${executionId} not found`);
      return;
    }

    try {
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
      console.info(
        `⚡️ Executing async workflow '${workflowName}' with execution ID ${executionId}`,
      );
      const result = await runMethod.call(workflow, input);

      // Update execution with result
      execution.executionStatus = "completed";
      execution.output = result;
      execution.finishedAt = new Date().toISOString();
      this.executionsMap.set(executionId, execution);

      console.info(
        `✅ Completed async workflow '${workflowName}' execution ${executionId}`,
      );
    } catch (error) {
      // Update execution with error
      execution.executionStatus = "failed";
      execution.error = error instanceof Error ? error.message : String(error);
      execution.finishedAt = new Date().toISOString();
      this.executionsMap.set(executionId, execution);

      console.error(
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
  org: string,
  project: string,
  options: ServerOptions = {},
  schemas: Record<string, { input: Definition; output: Definition }> = {},
): GensxServer {
  return new GensxServer(workflows, org, project, options, schemas);
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return ulid();
}
