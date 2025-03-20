/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "@hono/node-server";
import { Context, Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";
import { ChatCompletionChunk } from "openai/resources/chat/completions.js";
import { Stream } from "openai/streaming";

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
  name: string;
  api_url: string;
  metadata?: Record<string, unknown>;
}

/**
 * GenSX Server - A development server for GenSX workflows
 */
export class GensxServer {
  private app: Hono;
  private port: number;
  private hostname: string;
  private workflowMap: Map<string, unknown>;
  private isRunning = false;
  private server: ReturnType<typeof serve> | null = null;

  /**
   * Create a new GenSX dev server
   */
  constructor(
    workflows: Record<string, unknown> = {},
    options: ServerOptions = {},
  ) {
    this.port = options.port ?? 1337;
    this.hostname = options.hostname ?? "localhost";
    this.app = new Hono();
    this.workflowMap = new Map();

    // Register all workflows from the input
    this.registerWorkflows(workflows);

    // Set up routes
    this.setupRoutes();
  }

  /**
   * Register workflows with the server
   */
  private registerWorkflows(workflows: Record<string, unknown>): void {
    // Log what we're registering
    console.log("Attempting to register workflows:", Object.keys(workflows));

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
        console.log(`Registered workflow: ${workflowName}`);
      }
    }

    if (this.workflowMap.size === 0) {
      console.warn("⚠️ No valid workflows were registered!");
    }
  }

  /**
   * Set up server routes
   */
  private setupRoutes(): void {
    // Add middleware
    this.app.use("*", logger());
    this.app.use("*", cors());

    // Health check route
    this.app.get("/", (c) => {
      return c.json({
        status: "ok",
        message: "GenSX Dev Server",
        version: "1.0.0",
        availableWorkflows: Array.from(this.workflowMap.keys()),
      });
    });

    // List all workflows
    this.app.get("/projects/local/workflows", (c) => {
      return c.json({
        workflows: Array.from(this.workflowMap.entries()).map(([name]) => ({
          name,
          url: `/projects/local/workflows/${name}`,
        })),
      });
    });

    // Execute workflow endpoint
    this.app.post("/projects/local/workflows/:workflowName", async (c) => {
      const workflowName = c.req.param("workflowName");
      const workflow = this.workflowMap.get(workflowName);

      if (!workflow) {
        return c.json({ error: `Workflow '${workflowName}' not found` }, 404);
      }

      try {
        // Get request body for workflow parameters
        const body = await c.req.json().catch(() => ({}));

        console.log(`Executing workflow '${workflowName}' with params:`, body);

        // Execute the workflow - try both run and Run methods
        const runMethod = (workflow as any).run;

        if (typeof runMethod !== "function") {
          throw new Error(
            `Workflow '${workflowName}' doesn't have a run or Run method`,
          );
        }

        const result = await runMethod.call(workflow, body);

        // Handle different response types
        if (result instanceof Stream) {
          // Handle streaming responses
          return this.handleStreamingResponse(
            c,
            result as Stream<ChatCompletionChunk>,
          );
        }

        // Handle regular JSON response
        return c.json(result);
      } catch (error) {
        console.error(`Error executing workflow '${workflowName}':`, error);
        return c.json(
          {
            error: "Workflow execution failed",
            message: error instanceof Error ? error.message : String(error),
          },
          500,
        );
      }
    });

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
    c: Context,
    streamResult: Stream<ChatCompletionChunk>,
  ) {
    return streamSSE(c, async (stream) => {
      try {
        for await (const chunk of streamResult) {
          // Stream content if available
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            await stream.writeSSE({
              data: JSON.stringify({ content }),
            });
          }

          // Stream tool calls if available
          const toolCalls = chunk.choices[0]?.delta?.tool_calls;
          if (toolCalls && toolCalls.length > 0) {
            await stream.writeSSE({
              data: JSON.stringify({ tool_calls: toolCalls }),
            });
          }
        }

        await stream.writeSSE({
          data: "[DONE]",
        });
      } catch (error) {
        console.error("Error in streaming response:", error);
        await stream.writeSSE({
          data: JSON.stringify({ error: "Streaming error occurred" }),
        });
      }
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
          const response = await fetch('/projects/local/workflows');
          const data = await response.json();

          const workflowsContainer = document.getElementById('workflows');
          workflowsContainer.innerHTML = '';

          if (data.workflows.length === 0) {
            workflowsContainer.innerHTML = '<p>No workflows found</p>';
            return;
          }

          data.workflows.forEach(workflow => {
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

            const response = await fetch(\`/projects/local/workflows/\${name}\`, {
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
      console.warn("Server is already running");
      return this;
    }

    this.server = serve({
      fetch: this.app.fetch,
      port: this.port,
    });

    this.isRunning = true;

    console.log(
      `🚀 GenSX Dev Server running at http://${this.hostname}:${this.port}`,
    );
    console.log(
      `📋 Available workflows: ${Array.from(this.workflowMap.keys()).join(", ") || "NONE FOUND"}`,
    );
    console.log(
      `🧪 Test UI available at http://${this.hostname}:${this.port}/ui`,
    );

    return this;
  }

  /**
   * Stop the server if it's running
   */
  public stop(): void {
    if (!this.isRunning) {
      console.warn("Server is not running");
      return;
    }

    if (this.server) {
      this.server.close();
    }

    this.isRunning = false;
    console.log("Server stopped");
  }

  /**
   * Return information about available workflows
   */
  public getWorkflows(): WorkflowInfo[] {
    return Array.from(this.workflowMap.entries()).map(([name, _]) => ({
      name,
      api_url: `http://${this.hostname}:${this.port}/projects/local/workflows/${name}`,
    }));
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
}

/**
 * Create a new GenSX server instance
 */
export function createServer(
  workflows: Record<string, unknown> = {},
  options: ServerOptions = {},
): GensxServer {
  return new GensxServer(workflows, options);
}
