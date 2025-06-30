import {
  InputRequest,
  JsonValue,
  WorkflowExecution,
  WorkflowMessage,
} from "./types.js";
import { generateExecutionId } from "./utils.js";
import { WorkflowManager } from "./workflow-manager.js";

/**
 * Handles workflow execution and input request management
 */
export class ExecutionHandler {
  private workflowManager: WorkflowManager;
  private inputRequests: Map<string, Map<string, InputRequest[]>>;

  constructor(workflowManager: WorkflowManager) {
    this.workflowManager = workflowManager;
    this.inputRequests = new Map();
  }

  /**
   * Create a new execution record
   */
  createExecution(workflowName: string, input: unknown): WorkflowExecution {
    const executionId = generateExecutionId();
    const now = new Date().toISOString();

    const execution: WorkflowExecution = {
      id: executionId,
      workflowName,
      executionStatus: "queued",
      createdAt: now,
      input,
      workflowMessages: [],
    };

    this.workflowManager.setExecution(executionId, execution);
    return execution;
  }

  /**
   * Execute a workflow asynchronously and update its status
   */
  async executeWorkflowAsync(
    workflowName: string,
    workflow: {
      run: (
        input: unknown,
        options: { messageListener: (event: WorkflowMessage) => void },
      ) => Promise<unknown>;
    },
    executionId: string,
    input: unknown,
    logger: {
      info: (msg: string, ...args: unknown[]) => void;
      error: (msg: string, error?: unknown) => void;
    },
  ): Promise<void> {
    // Get the current execution record
    const execution = this.workflowManager.getExecution(executionId);
    if (!execution) {
      logger.error(`Execution ${executionId} not found`);
      return;
    }

    try {
      // Initialize progress events array
      execution.workflowMessages = [];

      // Update status to starting
      execution.executionStatus = "starting";
      this.workflowManager.setExecution(executionId, execution);

      // Get the run method
      const runMethod = workflow.run;
      if (typeof runMethod !== "function") {
        throw new Error(`Workflow '${workflowName}' doesn't have a run method`);
      }

      // Update status to running
      execution.executionStatus = "running";
      this.workflowManager.setExecution(executionId, execution);

      // Execute the workflow
      logger.info(
        `⚡️ Executing async workflow '${workflowName}' with execution ID ${executionId}`,
      );

      // Set up progress listener
      const messageListener = (event: WorkflowMessage) => {
        const workflowMessage: WorkflowMessage = {
          ...event,
        };
        execution.workflowMessages.push(workflowMessage);
        this.workflowManager.setExecution(executionId, execution);
      };

      const result = await runMethod.call(workflow, input, {
        messageListener,
      });

      // Update execution with result
      execution.executionStatus = "completed";
      execution.output = result;
      execution.finishedAt = new Date().toISOString();
      this.workflowManager.setExecution(executionId, execution);

      logger.info(
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

      this.workflowManager.setExecution(executionId, execution);

      logger.error(
        `❌ Failed async workflow '${workflowName}' execution ${executionId}:`,
        error,
      );
    }
  }

  /**
   * Handle input request for external tools
   */
  handleInputRequest(
    executionId: string,
    nodeId: string,
    sequenceNumber: number,
    data: JsonValue,
  ): void {
    let executionRequests = this.inputRequests.get(executionId);
    if (!executionRequests) {
      executionRequests = new Map();
      this.inputRequests.set(executionId, executionRequests);
    }

    let requestsByNodeId = executionRequests.get(nodeId);
    if (!requestsByNodeId) {
      requestsByNodeId = [];
      executionRequests.set(nodeId, requestsByNodeId);
    }

    let inputRequest = requestsByNodeId.find(
      (request) =>
        request.sequenceNumber === sequenceNumber && !request.fulfilled,
    );

    if (!inputRequest) {
      inputRequest = requestsByNodeId.find((request) => !request.fulfilled);
      if (inputRequest) {
        console.warn(
          `[GenSX] Sequence number mismatch for node '${nodeId}' with sequence number '${sequenceNumber}'`,
        );
      }
    }

    if (!inputRequest) {
      requestsByNodeId.push({
        sequenceNumber,
        nodeId,
        fulfilled: false,
        data,
      });
      return;
    }

    inputRequest.fulfilled = inputRequest.onInput !== undefined;
    inputRequest.data = data;
    inputRequest.onInput?.(inputRequest.data);
  }

  /**
   * Create input request callback for workflow execution
   */
  createInputRequestCallback(executionId: string) {
    return (request: { nodeId: string; sequenceNumber: number }) => {
      const { nodeId, sequenceNumber } = request;
      let executionRequests = this.inputRequests.get(executionId);
      if (!executionRequests) {
        executionRequests = new Map();
        this.inputRequests.set(executionId, executionRequests);
      }

      let requestsByNodeId = executionRequests.get(nodeId);
      if (!requestsByNodeId) {
        requestsByNodeId = [];
        executionRequests.set(nodeId, requestsByNodeId);
      }

      // find with the matching sequence number
      let foundRequest = requestsByNodeId.find(
        (request) =>
          request.sequenceNumber === sequenceNumber && !request.fulfilled,
      );
      if (!foundRequest) {
        foundRequest = requestsByNodeId.find((request) => !request.fulfilled);
        if (foundRequest) {
          console.warn(
            `Sequence number mismatch for node '${nodeId}' with sequence number '${sequenceNumber}'`,
          );
        }
      }

      if (foundRequest?.data) {
        // This means the callback already happened and we have the data.
        foundRequest.fulfilled = true;
        return foundRequest.data;
      } else if (foundRequest) {
        return new Promise<unknown>((resolve) => {
          foundRequest.onInput = resolve;
        });
      }

      // otherwise we have not yet received the input from the user, so add a callback.
      return new Promise<unknown>((resolve) => {
        requestsByNodeId.push({
          sequenceNumber,
          nodeId,
          fulfilled: false,
          onInput: resolve,
        });
      });
    };
  }

  /**
   * Handle streaming responses
   */
  handleStreamingResponse(
    streamResult: AsyncIterable<unknown>,
    logger: { error: (msg: string, error?: unknown) => void },
  ): Response {
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
}
