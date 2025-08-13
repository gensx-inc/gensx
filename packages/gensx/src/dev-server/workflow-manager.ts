import { Definition } from "typescript-json-schema";

import { NotFoundError } from "./errors.js";
import { WorkflowExecution, WorkflowInfo, WorkflowMessage } from "./types.js";
import { generateWorkflowId } from "./utils.js";

/**
 * Manages workflow registration and execution tracking
 */
export class WorkflowManager {
  private workflowMap: Map<
    string,
    {
      name: string;
      run: (
        input: unknown,
        options: { messageListener: (event: WorkflowMessage) => void },
      ) => Promise<unknown>;
    }
  >;
  private schemaMap: Map<string, { input: Definition; output: Definition }>;
  private executionsMap: Map<string, WorkflowExecution>;
  private hostname: string;
  private port: number;

  constructor(
    hostname: string,
    port: number,
    schemas: Record<string, { input: Definition; output: Definition }> = {},
  ) {
    this.workflowMap = new Map();
    this.schemaMap = new Map(Object.entries(schemas));
    this.executionsMap = new Map();
    this.hostname = hostname;
    this.port = port;
  }

  /**
   * Register workflows with the server
   */
  registerWorkflows(workflows: Record<string, unknown>): void {
    for (const [exportName, workflow] of Object.entries(workflows)) {
      if (typeof workflow !== "function") continue;

      const workflowFn = workflow as unknown as ((
        input: unknown,
        options: { messageListener: (event: WorkflowMessage) => void },
      ) => Promise<unknown>) & {
        __gensxWorkflow?: boolean;
        name?: string;
      };

      // If it's a GenSX workflow function, register with its name
      if (workflowFn.__gensxWorkflow) {
        const workflowName =
          // Prefer explicit bundler-safe name if available
          (workflowFn as unknown as { __gensxWorkflowName?: string })
            .__gensxWorkflowName ??
          workflowFn.name ??
          exportName;
        const wrappedWorkflow = {
          name: workflowName,
          run: workflowFn,
        };
        this.workflowMap.set(workflowName, wrappedWorkflow);
        continue;
      }

      // Otherwise, support plain callable exports (schema extractor supports these)
      // Prefer the export name to align with schema generation and intended public name
      const callableName = exportName;
      const wrappedCallable = {
        name: callableName,
        run: async (
          input: unknown,
          _options: { messageListener: (event: WorkflowMessage) => void },
        ): Promise<unknown> => {
          return await (
            workflow as unknown as (input: unknown) => Promise<unknown>
          )(input);
        },
      };
      this.workflowMap.set(callableName, wrappedCallable);
    }
  }

  /**
   * Get a workflow by name or throw NotFoundError
   */
  getWorkflowOrThrow(workflowName: string) {
    const workflow = this.workflowMap.get(workflowName);
    if (!workflow) {
      throw new NotFoundError(`Workflow '${workflowName}' not found`);
    }
    return workflow;
  }

  /**
   * Get an execution by ID or throw NotFoundError
   */
  getExecutionOrThrow(
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
   * Store an execution
   */
  setExecution(executionId: string, execution: WorkflowExecution): void {
    this.executionsMap.set(executionId, execution);
  }

  /**
   * Get an execution by ID
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executionsMap.get(executionId);
  }

  /**
   * Get all executions for a workflow
   */
  getExecutionsForWorkflow(workflowName: string): WorkflowExecution[] {
    return Array.from(this.executionsMap.values())
      .filter((exec) => exec.workflowName === workflowName)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  /**
   * Return information about available workflows
   */
  getWorkflows(): WorkflowInfo[] {
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
   * Get schema for a workflow
   */
  getSchema(
    workflowName: string,
  ): { input: Definition; output: Definition } | undefined {
    return this.schemaMap.get(workflowName);
  }

  /**
   * Check if any workflows are registered
   */
  hasWorkflows(): boolean {
    return this.workflowMap.size > 0;
  }

  /**
   * Get workflow count
   */
  getWorkflowCount(): number {
    return this.workflowMap.size;
  }
}
