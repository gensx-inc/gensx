/**
 * GenSX SDK - Core SDK class for interacting with GenSX workflows
 */

// Note: These types are imported from @gensx/core which needs to be built first
// The types extend the core WorkflowMessage types with additional fields for SDK usage
import type {
  ComponentEndMessage,
  ComponentStartMessage,
  EndMessage,
  ErrorMessage,
  StartMessage,
} from "@gensx/core";

// Type declarations for environment variables
declare const process:
  | {
      env: Record<string, string | undefined>;
    }
  | undefined;

// GenSX Event Types - These extend the core WorkflowMessage types with additional fields
export interface GenSXStartEvent extends StartMessage {
  id: string;
  timestamp: string;
  workflowExecutionId: string; // Make this required for SDK events
}

export interface GenSXComponentStartEvent extends ComponentStartMessage {
  id: string;
  timestamp: string;
}

export interface GenSXComponentEndEvent extends ComponentEndMessage {
  id: string;
  timestamp: string;
}

export interface GenSXProgressEvent {
  type: "progress";
  data: string; // JSON string that can be parsed
  id: string;
  timestamp: string;
}

export interface GenSXOutputEvent {
  type: "output";
  content: string;
  id: string;
  timestamp: string;
}

export interface GenSXEndEvent extends EndMessage {
  id: string;
  timestamp: string;
}

export interface GenSXErrorEvent extends ErrorMessage {
  id: string;
  timestamp: string;
  message?: string; // Additional field for compatibility
}

export type GenSXEvent =
  | GenSXStartEvent
  | GenSXComponentStartEvent
  | GenSXComponentEndEvent
  | GenSXProgressEvent
  | GenSXOutputEvent
  | GenSXEndEvent
  | GenSXErrorEvent;

export interface GenSXConfig {
  baseUrl?: string;
  apiKey?: string;
  org?: string;
  project?: string;
  environment?: string;
  overrideLocalMode?: boolean; // override for devs to use locally deployed API as opposed to dev server
}

export interface RunRawOptions {
  inputs?: Record<string, unknown>;
  format?: "sse" | "ndjson" | "json";
  // Allow overriding client-level config
  org?: string;
  project?: string;
  environment?: string;
}

export interface StartOptions {
  inputs?: Record<string, unknown>;
  // Allow overriding client-level config
  org?: string;
  project?: string;
  environment?: string;
}

export interface StartResponse {
  executionId: string;
  executionStatus: string;
  data?: unknown;
}

export interface GetProgressOptions {
  executionId: string;
  format?: "sse" | "ndjson";
}

export interface WorkflowExecution {
  executionId: string;
  status: string;
  progress?: unknown[];
  result?: unknown;
  error?: unknown;
}

export interface ResumeOptions {
  executionId: string;
  nodeId: string;
  data: unknown;
}

export interface CreateScopedTokenOptions {
  name: string;
  executionScope: Record<string, unknown>;
  projectName: string;
  workflowName?: string;
  environmentName?: string;
  permissions?: string[];
  expiresAt: string; // ISO datetime string
  requiredMatchFields?: string[];
  // Allow overriding client-level config
  org?: string;
  project?: string;
  environment?: string;
}

export interface ScopedTokenResponse {
  id: string;
  token: string;
  name: string;
  executionScope: Record<string, unknown>;
  projectId: string;
  projectName: string;
  workflowName: string | null;
  environmentId: string | null;
  environmentName: string | null;
  permissions: string[];
  expiresAt: Date;
  createdAt: Date;
  requiredMatchFields?: string[];
}

/**
 * GenSX SDK for interacting with GenSX workflows
 *
 * Usage:
 * ```typescript
 * const gensx = new GenSX({
 *   apiKey: 'your-api-key',
 *   org: 'your-org',
 *   project: 'your-project',
 *   environment: 'production'
 * });
 *
 * // Start a workflow asynchronously
 * const { executionId } = await gensx.start('workflowName', {
 *   inputs: { userMessage: 'Hello world' }
 * });
 *
 * // Or override org/project for a specific call
 * const { executionId } = await gensx.start('workflowName', {
 *   inputs: { userMessage: 'Hello world' },
 *   org: 'different-org',
 *   project: 'different-project'
 * });
 * ```
 */
export class GenSX {
  private apiKey?: string;
  private baseUrl: string;
  private org?: string;
  private project?: string;
  private environment?: string;
  private isLocal: boolean;

  constructor(config: GenSXConfig) {
    this.baseUrl = config.baseUrl ?? "https://api.gensx.com";
    this.isLocal =
      this.baseUrl.includes("localhost") && !config.overrideLocalMode;

    // Always capture apiKey if provided (even in local) so callers can set
    // Authorization for local dev features like scoped tokens
    this.apiKey = this.getApiKey(config.apiKey);

    if (!this.isLocal) {
      // For non-local mode, require apiKey
      if (!this.apiKey) {
        throw new Error(
          "apiKey is required. Provide it in the constructor or set the GENSX_API_KEY environment variable.",
        );
      }

      // For non-local mode, require org/project/environment
      if (!config.org || !config.project || !config.environment) {
        throw new Error(
          "org, project, and environment are required when calling deployed workflows. Provide them in the constructor or method options.",
        );
      }
    }

    this.org = config.org;
    this.project = config.project;
    this.environment = config.environment;
  }

  /**
   * Run a workflow and return the raw Response object
   * Provides direct access to the fetch response without any processing
   *
   * @param workflowName - Name of the workflow to run
   * @param options - Options including format: 'sse' | 'ndjson' | 'json'
   * @returns Raw Response object
   */
  async runRaw(
    workflowName: string,
    options: RunRawOptions = {},
  ): Promise<Response> {
    const { inputs = {}, format = "ndjson" } = options;

    // Use provided values or fall back to client defaults
    const org = options.org ?? this.org;
    const project = options.project ?? this.project;
    const environment = options.environment ?? this.environment;

    const url = this.buildWorkflowUrl(workflowName, org, project, environment);

    // Set Accept header based on format
    const acceptHeader = {
      sse: "text/event-stream",
      ndjson: "application/x-ndjson",
      json: "application/json",
    }[format];

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: acceptHeader,
    };

    // Only include Authorization header if apiKey is defined
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(inputs),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to run workflow: ${response.status} ${response.statusText}`,
      );
    }

    return response;
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  async run<T>(workflowName: string, options: StartOptions = {}) {
    const { inputs = {} } = options;

    // Use provided values or fall back to client defaults
    const org = options.org ?? this.org;
    const project = options.project ?? this.project;
    const environment = options.environment ?? this.environment;

    const url = this.buildWorkflowUrl(workflowName, org, project, environment);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Only include Authorization header if apiKey is defined
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(inputs),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to start workflow: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      executionId: string;
      output: T;
    };

    return data;
  }

  /**
   * Start a workflow asynchronously
   */
  async start(
    workflowName: string,
    options: StartOptions = {},
  ): Promise<StartResponse> {
    const { inputs = {} } = options;

    // Use provided values or fall back to client defaults
    const org = options.org ?? this.org;
    const project = options.project ?? this.project;
    const environment = options.environment ?? this.environment;

    const url = this.buildStartUrl(workflowName, org, project, environment);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Only include Authorization header if apiKey is defined
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(inputs),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to start workflow: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      executionId: string;
      executionStatus?: string;
      status?: string;
    };
    const executionId =
      response.headers.get("X-Execution-Id") ?? data.executionId;

    return {
      executionId,
      executionStatus: data.executionStatus ?? data.status ?? "started",
      data,
    };
  }

  async getOutput(options: {
    executionId: string;
  }): Promise<{ output: string }> {
    const { executionId } = options;

    const url = this.isLocal
      ? `${this.baseUrl}/workflowExecutions/${executionId}/output`
      : `${this.baseUrl}/org/${this.org}/workflowExecutions/${executionId}/output`;

    const headers: Record<string, string> = {};

    // Only include Authorization header if apiKey is defined
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get progress: ${response.status} ${response.statusText}`,
      );
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    return (await response.json()) as { output: string };
  }

  /**
   * Get progress updates for a workflow execution
   */
  async getProgress(options: GetProgressOptions): Promise<ReadableStream> {
    const { executionId, format = "ndjson" } = options;

    const url = this.isLocal
      ? `${this.baseUrl}/workflowExecutions/${executionId}/progress`
      : `${this.baseUrl}/org/${this.org}/workflowExecutions/${executionId}/progress`;

    const accept =
      format === "sse" ? "text/event-stream" : "application/x-ndjson";

    const headers: Record<string, string> = {
      Accept: accept,
    };

    // Only include Authorization header if apiKey is defined
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get progress: ${response.status} ${response.statusText}`,
      );
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    return response.body;
  }

  async resume(options: ResumeOptions): Promise<Response> {
    const { executionId, nodeId, data } = options;

    const url = this.isLocal
      ? `${this.baseUrl}/workflowExecutions/${executionId}/fulfill/${nodeId}`
      : `${this.baseUrl}/org/${this.org}/workflowExecutions/${executionId}/fulfill/${nodeId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      // If the execution is still running, retry.
      if (
        response.status === 400 &&
        response.statusText === "Bad Request" &&
        (await response.text()).includes("Execution is currently running.")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.resume(options);
      }
      throw new Error(
        `Failed to resume workflow: ${response.status} ${response.statusText}`,
      );
    }

    return response;
  }

  /**
   * Create a scoped token for API access
   */
  async createScopedToken(
    options: CreateScopedTokenOptions,
  ): Promise<ScopedTokenResponse> {
    if (this.isLocal) {
      const url = `${this.baseUrl}/scoped-tokens`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          name: options.name,
          executionScope: options.executionScope,
          projectName: options.projectName,
          workflowName: options.workflowName,
          environmentName: options.environmentName,
          permissions: options.permissions ?? [
            "start",
            "run",
            "progress",
            "output",
            "status",
          ],
          expiresAt: options.expiresAt,
          requiredMatchFields: options.requiredMatchFields ?? ["*"],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to create scoped token (local): ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as ScopedTokenResponse;
      return {
        ...data,
        expiresAt: new Date(data.expiresAt),
        createdAt: new Date(data.createdAt),
      };
    }

    // Non-local (cloud)
    // Use provided values or fall back to client defaults
    const org = options.org ?? this.org;

    if (!org) {
      throw new Error("org is required to create scoped tokens");
    }

    if (this.isLocal) {
      console.warn("Scoped tokens are not supported in local mode");
      return {
        id: "local-scoped-token",
        token: "local-scoped-token",
        name: options.name,
        executionScope: options.executionScope,
        projectId: "local-project-id",
        projectName: "local-project-name",
        workflowName: "local-workflow-name",
        environmentId: "local-environment-id",
        environmentName: "local-environment-name",
        permissions: options.permissions ?? ["start", "run", "progress", "output", "status"],
        expiresAt: new Date(options.expiresAt),
        createdAt: new Date(),
        requiredMatchFields: options.requiredMatchFields ?? ["*"],
      };
    }

    const url = `${this.baseUrl}/org/${org}/scoped-tokens`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Only include Authorization header if apiKey is defined
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: options.name,
        executionScope: options.executionScope,
        projectName: options.projectName,
        workflowName: options.workflowName,
        environmentName: options.environmentName,
        permissions: options.permissions ?? [
          "start",
          "run",
          "progress",
          "output",
          "status",
        ],
        expiresAt: options.expiresAt,
        requiredMatchFields: options.requiredMatchFields ?? ["*"],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create scoped token: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as ScopedTokenResponse;
    return {
      ...data,
      expiresAt: new Date(data.expiresAt),
      createdAt: new Date(data.createdAt),
    };
  }

  // Private helper methods
  private buildWorkflowUrl(
    workflowName: string,
    org?: string,
    project?: string,
    environment?: string,
  ): string {
    // If baseUrl is localhost, use simplified path structure
    if (this.isLocal) {
      return `${this.baseUrl}/workflows/${workflowName}`;
    }

    // For non-local mode, require all parameters
    if (!org || !project || !environment) {
      throw new Error(
        "org, project, and environment are required when calling deployed workflows",
      );
    }

    const path = `/org/${org}/projects/${project}/environments/${environment}/workflows/${workflowName}`;
    return `${this.baseUrl}${path}`;
  }

  private buildStartUrl(
    workflowName: string,
    org?: string,
    project?: string,
    environment?: string,
  ): string {
    return `${this.buildWorkflowUrl(workflowName, org, project, environment)}/start`;
  }

  /**
   * Helper function to get API key from constructor or environment
   */
  private getApiKey(providedKey?: string): string | undefined {
    if (providedKey) {
      return providedKey;
    }
    try {
      return typeof process !== "undefined"
        ? process.env.GENSX_API_KEY
        : undefined;
    } catch {
      return undefined;
    }
  }
}
