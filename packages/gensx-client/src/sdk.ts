/**
 * GenSX SDK - Core SDK class for interacting with GenSX workflows
 */

// Type declarations for environment variables
declare const process: {
  env: Record<string, string | undefined>;
} | undefined;

// GenSX Event Types
export type GenSXStartEvent = {
  type: 'start';
  workflowExecutionId: string;
  workflowName: string;
  id: string;
  timestamp: string;
}

export type GenSXComponentStartEvent = {
  type: 'component-start';
  componentName: string;
  componentId: string;
  id: string;
  timestamp: string;
}

export type GenSXComponentEndEvent = {
  type: 'component-end';
  componentName: string;
  componentId: string;
  id: string;
  timestamp: string;
}

export type GenSXProgressEvent = {
  type: 'progress'
  data: {
    type: string;
  };
  id: string;
  timestamp: string;
}

export type GenSXOutputEvent = {
  type: 'output';
  content: string;
  id: string;
  timestamp: string;
}

export type GenSXEndEvent = {
  type: 'end';
  id: string;
  timestamp: string;
}

export type GenSXErrorEvent = {
  type: 'error';
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
  apiKey: string;
  baseUrl?: string;
  org?: string;
  project?: string;
  environment?: string;
}

export interface RunOptions {
  inputs?: Record<string, any>;
  stream?: boolean;
  // Allow overriding client-level config
  org?: string;
  project?: string;
  environment?: string;
}

export interface RunRawOptions {
  inputs?: Record<string, any>;
  format?: 'sse' | 'ndjson' | 'json';
  // Allow overriding client-level config
  org?: string;
  project?: string;
  environment?: string;
}

export interface StartOptions {
  inputs?: Record<string, any>;
  // Allow overriding client-level config
  org?: string;
  project?: string;
  environment?: string;
}

export interface StartResponse {
  executionId: string;
  executionStatus: string;
  data?: any;
}

export interface GetProgressOptions {
  executionId: string;
  format?: 'sse' | 'ndjson';
}

export interface WorkflowExecution {
  executionId: string;
  status: string;
  progress?: any[];
  result?: any;
  error?: any;
}

type RunReturn<TOutput, TStream extends boolean | undefined = undefined> =
  TStream extends true
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
 *   environment: 'production' // optional
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
  private apiKey: string;
  private baseUrl: string;
  private org?: string;
  private project?: string;
  private environment?: string;

  constructor(config: GenSXConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || '';
    this.org = config.org;
    this.project = config.project;
    this.environment = config.environment;
  }

  /**
   * Run a workflow with optional streaming
   * @returns Either { output, progressStream } or { outputStream, progressStream } based on stream flag
   */
  async run<TOutput = any>(
    workflowName: string,
    options: RunOptions = {}
  ): Promise<RunReturn<TOutput, typeof options.stream>> {
    const { inputs = {}, stream = false } = options;
    
    // Use provided values or fall back to client defaults
    const org = options.org || this.org;
    const project = options.project || this.project;
    const environment = options.environment || this.environment;
    
    if (!org || !project) {
      throw new Error('org and project are required. Provide them in the constructor or method options.');
    }

    const response = await this.runRaw(workflowName, { 
      inputs, 
      org, 
      project, 
      environment 
    });

    if (!response.body) {
      throw new Error('Response body is null');
    }

    if (stream) {
      // For streaming mode, split and return both streams
      const { outputStream, progressStream } = this.splitStreams(response);
      
      // Convert ReadableStream to AsyncIterable
      const outputIterable = this.createAsyncIterable(outputStream);
      
      return { outputStream: outputIterable, progressStream } as any;
    } else {
      // Parse all events
      const events: GenSXEvent[] = [];
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              events.push(JSON.parse(line));
            } catch (e) {
              console.warn('Failed to parse event:', line);
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
        .filter((e): e is { type: 'output'; content: string; id: string; timestamp: string } => e.type === 'output')
        .map(e => e.content);
      
      if (outputContents.length === 0) {
        output = null as any;
      } else if (typeof outputContents[0] === 'string') {
        output = outputContents.join('') as any;
      } else {
        output = outputContents as any;
      }

      // Create progress stream from events
      const progressStream = new ReadableStream<GenSXEvent>({
        start(controller) {
          events.forEach(event => {
            if (event.type !== 'output') {
              controller.enqueue(event);
            }
          });
          controller.close();
        }
      });

      return { output, progressStream } as any;
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
  async runRaw(workflowName: string, options: RunRawOptions = {}): Promise<Response> {
    const { inputs = {}, format = 'ndjson' } = options;
    
    // Use provided values or fall back to client defaults
    const org = options.org || this.org;
    const project = options.project || this.project;
    const environment = options.environment || this.environment;
    
    if (!org || !project) {
      throw new Error('org and project are required. Provide them in the constructor or method options.');
    }

    const url = this.buildWorkflowUrl(org, project, workflowName, environment);
    
    // Set Accept header based on format
    const acceptHeader = {
      'sse': 'text/event-stream',
      'ndjson': 'application/x-ndjson',
      'json': 'application/json'
    }[format];
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': acceptHeader
      },
      body: JSON.stringify(inputs)
    });

    if (!response.ok) {
      throw new Error(`Failed to run workflow: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  /**
   * Start a workflow asynchronously
   */
  async start(workflowName: string, options: StartOptions = {}): Promise<StartResponse> {
    const { inputs = {} } = options;
    
    // Use provided values or fall back to client defaults
    const org = options.org || this.org;
    const project = options.project || this.project;
    const environment = options.environment || this.environment;
    
    if (!org || !project) {
      throw new Error('org and project are required. Provide them in the constructor or method options.');
    }

    const url = this.buildStartUrl(org, project, workflowName, environment);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(inputs)
    });

    if (!response.ok) {
      throw new Error(`Failed to start workflow: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const executionId = response.headers.get('X-Execution-Id') || data.executionId;
    
    return {
      executionId,
      executionStatus: data.executionStatus || data.status || 'started',
      data
    };
  }

  /**
   * Get progress updates for a workflow execution
   */
  async getProgress(options: GetProgressOptions): Promise<ReadableStream> {
    const { executionId, format = 'ndjson' } = options;

    const url = `${this.baseUrl}/org/gensx/workflowExecutions/${executionId}/progress`;
    const accept = format === 'sse' ? 'text/event-stream' : 'application/x-ndjson';

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': accept
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get progress: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    return response.body;
  }

  // Private helper methods
  private buildWorkflowUrl(org: string, project: string, workflowName: string, environment?: string): string {
    const path = environment 
      ? `/org/${org}/projects/${project}/environments/${environment}/workflows/${workflowName}`
      : `/org/${org}/projects/${project}/workflows/${workflowName}`;
    return `${this.baseUrl}${path}`;
  }

  private buildStartUrl(org: string, project: string, workflowName: string, environment?: string): string {
    return `${this.buildWorkflowUrl(org, project, workflowName, environment)}/start`;
  }

  /**
   * Process NDJSON stream and split into output and progress streams
   */
  private async *processStream(response: Response): AsyncGenerator<{ output?: string; progress?: GenSXEvent }> {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line) as GenSXEvent;
            
            if (event.type === 'output') {
              yield { output: event.content };
            } else {
              yield { progress: event };
            }
          } catch (e) {
            console.warn('Failed to parse NDJSON line:', e);
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
  private splitStreams(response: Response): { outputStream: ReadableStream<string>; progressStream: ReadableStream<GenSXEvent> } {
    const processedStream = this.processStream(response);

    // Create transform streams to split the events
    const outputTransform = new TransformStream<{ output?: string; progress?: GenSXEvent }, string>({
      transform(chunk, controller) {
        if (chunk.output !== undefined) {
          controller.enqueue(chunk.output);
        }
      }
    });

    const progressTransform = new TransformStream<{ output?: string; progress?: GenSXEvent }, GenSXEvent>({
      transform(chunk, controller) {
        if (chunk.progress !== undefined) {
          controller.enqueue(chunk.progress);
        }
      }
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
      }
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
  private async *createAsyncIterable(stream: ReadableStream<string>): AsyncIterable<string> {
    const reader = stream.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  }
}

/**
 * Helper function to validate user message
 */
export function validateUserMessage(userMessage: any): string | null {
  if (!userMessage || typeof userMessage !== 'string') {
    return 'userMessage is required and must be a string';
  }
  if (userMessage.trim().length === 0) {
    return 'userMessage cannot be empty';
  }
  return null;
}

/**
 * Helper function to get API key from environment
 */
export function getApiKey(): string | null {
  try {
    return (typeof process !== 'undefined' && process?.env?.GENSX_API_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Create streaming response helper
 */
export async function createStreamingResponse(gensxResponse: Response): Promise<ReadableStream> {
  if (!gensxResponse.body) {
    throw new Error('Response body is null');
  }
  return gensxResponse.body;
} 