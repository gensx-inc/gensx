/**
 * GenSX SDK - Core SDK class for interacting with GenSX workflows
 */

// Type declarations for environment variables
declare const process:
  | {
      env: Record<string, string | undefined>;
    }
  | undefined;

// GenSX Event Types
export interface GenSXStartEvent {
  type: "start";
  workflowExecutionId: string;
  workflowName: string;
  id: string;
  timestamp: string;
}

export interface GenSXComponentStartEvent {
  type: "component-start";
  componentName: string;
  componentId: string;
  id: string;
  timestamp: string;
}

export interface GenSXComponentEndEvent {
  type: "component-end";
  componentName: string;
  componentId: string;
  id: string;
  timestamp: string;
}

export interface GenSXProgressEvent {
  type: "progress";
  data: {
    type: string;
  };
  id: string;
  timestamp: string;
}

export interface GenSXOutputEvent {
  type: "output";
  content: string;
  id: string;
  timestamp: string;
}

export interface GenSXEndEvent {
  type: "end";
  id: string;
  timestamp: string;
}

export interface GenSXErrorEvent {
  type: "error";
  error?: string;
  message?: string;
  id: string;
  timestamp: string;
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

export interface RunOptions {
  inputs?: Record<string, unknown>;
  stream?: boolean;
  // Allow overriding client-level config
  org?: string;
  project?: string;
  environment?: string;
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

type RunReturn<
  TOutput,
  TStream extends boolean | undefined = undefined,
> = TStream extends true
  ? {
      outputStream: AsyncIterable<TOutput>;
      progressStream: ReadableStream;
    }
  : {
      output: TOutput;
      progressStream: ReadableStream;
    };

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
 * // Run a workflow with just inputs
 * const { output } = await gensx.run<string>('workflowName', {
 *   inputs: { userMessage: 'Hello world' }
 * });
 *
 * // Or override org/project for a specific call
 * const { output } = await gensx.run<string>('workflowName', {
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

    if (!this.isLocal) {
      // For non-local mode, require apiKey
      this.apiKey = this.getApiKey(config.apiKey);
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
   * Run a workflow with optional streaming
   * @returns Either { output, progressStream } or { outputStream, progressStream } based on stream flag
   */
  async run<TOutput = unknown>(
    workflowName: string,
    options: RunOptions = {},
  ): Promise<RunReturn<TOutput, typeof options.stream>> {
    const { inputs = {}, stream = false } = options;

    // Use provided values or fall back to client defaults
    const org = options.org ?? this.org;
    const project = options.project ?? this.project;
    const environment = options.environment ?? this.environment;

    const response = await this.runRaw(workflowName, {
      inputs,
      org,
      project,
      environment,
    });

    if (!response.body) {
      throw new Error("Response body is null");
    }

    if (stream) {
      // For streaming mode, split and return both streams
      const { outputStream, progressStream } = this.splitStreams(response);

      // Convert ReadableStream to AsyncIterable
      const outputIterable = this.createAsyncIterable(outputStream);

      return {
        outputStream: outputIterable as AsyncIterable<TOutput>,
        progressStream,
      };
    } else {
      // Parse all events
      const events: GenSXEvent[] = [];
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              events.push(JSON.parse(line) as GenSXEvent);
            } catch {
              console.warn("Failed to parse event:", line);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Process any output event to get the final result
      let output: TOutput;

      // Aggregate output from output events
      const outputContents = events
        .filter(
          (
            e,
          ): e is {
            type: "output";
            content: string;
            id: string;
            timestamp: string;
          } => e.type === "output",
        )
        .map((e) => e.content);

      if (outputContents.length === 0) {
        output = null as TOutput;
      } else if (typeof outputContents[0] === "string") {
        output = outputContents.join("") as TOutput;
      } else {
        output = outputContents as TOutput;
      }

      // Create progress stream from events
      const progressStream = new ReadableStream<GenSXEvent>({
        start(controller) {
          events.forEach((event) => {
            if (event.type !== "output") {
              controller.enqueue(event);
            }
          });
          controller.close();
        },
      });

      return { output, progressStream };
    }
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

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: acceptHeader,
      },
      body: JSON.stringify(inputs),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to run workflow: ${response.status} ${response.statusText}`,
      );
    }

    return response;
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

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
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

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: accept,
      },
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
   * Process NDJSON stream and split into output and progress streams
   */
  private async *processStream(
    response: Response,
  ): AsyncGenerator<{ output?: string; progress?: GenSXEvent }> {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line) as GenSXEvent;

            if (event.type === "output") {
              yield { output: event.content };
            } else {
              yield { progress: event };
            }
          } catch (e) {
            console.warn("Failed to parse NDJSON line:", e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Create separate streams for output and progress events
   */
  private splitStreams(response: Response): {
    outputStream: ReadableStream<string>;
    progressStream: ReadableStream<GenSXEvent>;
  } {
    const processedStream = this.processStream(response);

    // Create transform streams to split the events
    const outputTransform = new TransformStream<
      { output?: string; progress?: GenSXEvent },
      string
    >({
      transform(chunk, controller) {
        if (chunk.output !== undefined) {
          controller.enqueue(chunk.output);
        }
      },
    });

    const progressTransform = new TransformStream<
      { output?: string; progress?: GenSXEvent },
      GenSXEvent
    >({
      transform(chunk, controller) {
        if (chunk.progress !== undefined) {
          controller.enqueue(chunk.progress);
        }
      },
    });

    // Create readable stream from async generator
    const sourceStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const item of processedStream) {
            controller.enqueue(item);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    // Pipe through transforms
    const [stream1, stream2] = sourceStream.tee();
    const outputStream = stream1.pipeThrough(outputTransform);
    const progressStream = stream2.pipeThrough(progressTransform);

    return { outputStream, progressStream };
  }

  /**
   * Create an async iterable from output stream
   */
  private async *createAsyncIterable(
    stream: ReadableStream<string>,
  ): AsyncIterable<string> {
    const reader = stream.getReader();

    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
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
