import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Definition } from "typescript-json-schema";

import { BadRequestError, NotFoundError } from "./errors.js";
import { ExecutionManager } from "./execution-handler.js";
import { setupRoutes } from "./routes.js";
import { ServerOptions, WorkflowInfo } from "./types.js";
import { ValidationManager } from "./validation.js";
import { WorkflowManager } from "./workflow-manager.js";

/**
 * GenSX Server - A development server for GenSX workflows
 */
export class GensxServer {
  public app: Hono;
  private port: number;
  private hostname: string;
  private isRunning = false;
  private server: ReturnType<typeof serve> | null = null;
  private logger: ServerOptions["logger"];
  public workflowManager: WorkflowManager;
  private validationManager: ValidationManager;
  public executionHandler: ExecutionManager;
  private isShuttingDown = false;
  private shutdownTimeout = 30000; // 30 seconds default timeout
  private signalHandlersRegistered = false;

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
    this.logger = options.logger;
    this.shutdownTimeout = options.shutdownTimeout ?? 30000;

    // Initialize managers
    this.workflowManager = new WorkflowManager(
      this.hostname,
      this.port,
      schemas,
    );
    this.validationManager = new ValidationManager();
    this.executionHandler = new ExecutionManager(this.workflowManager);

    // Register all workflows from the input
    this.workflowManager.registerWorkflows(workflows);

    // Set up error handling middleware
    this.setupErrorHandler();

    // Add middleware to check shutdown state before processing requests
    this.app.use('*', async (c, next) => {
      if (this.isShuttingDown) {
        return c.json({ 
          error: "Service unavailable", 
          message: "Server is shutting down" 
        }, 503);
      }
      await next();
    });

    // Set up routes
    setupRoutes(
      this.app,
      this.workflowManager,
      this.validationManager,
      this.executionHandler,
      this.logger,
      this.hostname,
      this.port,
    );
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
   * Start the server and return this instance for chaining
   */
  public start(): this {
    if (this.isRunning) {
      this.logger.warn("⚠️ Server is already running");
      return this;
    }

    // Register signal handlers for graceful shutdown
    this.registerSignalHandlers();

    try {
      this.server = serve({
        fetch: this.app.fetch,
        port: this.port,
      });

      this.isRunning = true;
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

      this.server.close((err) => {
        if (err) {
          this.logger.error("❌ Error stopping server:", err);
          this.isRunning = false;
          reject(err);
          return;
        }
        this.isRunning = false;
        resolve();
      });

      // Attempt to close all connections if the method exists
      const serverWithAdvancedClose = this.server as {
        closeAllConnections: () => void;
        closeIdleConnections: () => void;
      };
      if (typeof serverWithAdvancedClose.closeAllConnections === "function") {
        serverWithAdvancedClose.closeAllConnections();
      }
      if (typeof serverWithAdvancedClose.closeIdleConnections === "function") {
        serverWithAdvancedClose.closeIdleConnections();
      }
    });
  }

  /**
   * Register signal handlers for graceful shutdown
   */
  private registerSignalHandlers(): void {
    if (this.signalHandlersRegistered) {
      return;
    }

    const handleShutdown = (signal: string) => {
      this.logger.info(`🔄 Received ${signal}, initiating graceful shutdown...`);
      this.gracefulShutdown().catch((error) => {
        this.logger.error("❌ Error during graceful shutdown:", error);
        process.exit(1);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
    
    this.signalHandlersRegistered = true;
  }

  /**
   * Get all active workflow executions (starting or running)
   */
  private getActiveExecutions(): import("./types.js").WorkflowExecution[] {
    const allExecutions = Array.from(this.workflowManager.getAllExecutions());
    return allExecutions.filter(execution => 
      execution.executionStatus === 'starting' || 
      execution.executionStatus === 'running'
    );
  }

  /**
   * Wait for active executions to complete or timeout
   */
  private async waitForActiveExecutions(): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.shutdownTimeout) {
      const activeExecutions = this.getActiveExecutions();
      
      if (activeExecutions.length === 0) {
        this.logger.info("✅ All active workflow executions completed");
        return;
      }

      this.logger.info(
        `⏳ Waiting for ${activeExecutions.length} active execution(s) to complete...`
      );
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const remainingExecutions = this.getActiveExecutions();
    if (remainingExecutions.length > 0) {
      this.logger.warn(
        `⚠️ Shutdown timeout reached. ${remainingExecutions.length} execution(s) still active. Forcing shutdown.`
      );
    }
  }

  /**
   * Perform graceful shutdown by waiting for active executions to complete
   */
  public async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn("⚠️ Graceful shutdown already in progress");
      return;
    }

    this.isShuttingDown = true;
    this.logger.info("🛑 Starting graceful shutdown process...");

    try {
      // Wait for active executions to complete
      await this.waitForActiveExecutions();
      
      // Stop the server
      await this.stop();
      
      this.logger.info("✅ Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      this.logger.error("❌ Error during graceful shutdown:", error);
      process.exit(1);
    }
  }

  /**
   * Check if the server is in shutdown mode
   */
  public isInShutdown(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Return information about available workflows
   */
  public getWorkflows(): WorkflowInfo[] {
    return this.workflowManager.getWorkflows();
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
   * Check if the server is running
   */
  public isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get the server port
   */
  public getPort(): number {
    return this.port;
  }

  /**
   * Get the server hostname
   */
  public getHostname(): string {
    return this.hostname;
  }

  /**
   * Expose parseJsonBody for testing
   */
  public async parseJsonBody(
    c: import("hono").Context,
  ): Promise<Record<string, unknown>> {
    return this.validationManager.parseJsonBody(c);
  }

  /**
   * Expose validateInput for testing
   */
  public validateInput(workflowName: string, input: unknown): void {
    const schema = this.workflowManager.getSchema(workflowName);
    this.validationManager.validateInput(input, schema);
  }

  /**
   * Expose executeWorkflowAsync for testing
   */
  public async executeWorkflowAsync(
    workflowName: string,
    workflow: {
      run: (
        input: unknown,
        options: {
          messageListener: (
            event: import("./types.js").WorkflowMessage,
          ) => void;
          onRequestInput?: (request: { nodeId: string }) => unknown;
          workflowExecutionId?: string;
        },
      ) => Promise<unknown>;
    },
    executionId: string,
    input: unknown,
  ): Promise<void> {
    // Use the server's logger for consistency
    return this.executionHandler.executeWorkflowAsync(
      workflowName,
      workflow,
      executionId,
      input,
      this.logger,
    );
  }

  /**
   * Expose handleStreamingResponse for testing
   */
  public handleStreamingResponse(
    streamResult: AsyncIterable<unknown>,
  ): Response {
    return this.executionHandler.handleStreamingResponse(
      streamResult,
      this.logger,
    );
  }

  /**
   * Expose workflow lookup for testing
   */
  public getWorkflowByName(workflowName: string) {
    return this.workflowManager.getWorkflowOrThrow(workflowName);
  }

  /**
   * Expose setExecution for testing
   */
  public setExecution(
    executionId: string,
    execution: import("./types.js").WorkflowExecution,
  ): void {
    this.workflowManager.setExecution(executionId, execution);
  }

  /**
   * Expose getExecution for testing
   */
  public getExecution(executionId: string) {
    return this.workflowManager.getExecution(executionId);
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
