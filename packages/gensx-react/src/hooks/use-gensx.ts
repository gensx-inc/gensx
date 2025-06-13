import {
  GenSXComponentEndEvent,
  GenSXComponentStartEvent,
  GenSXEndEvent,
  GenSXErrorEvent,
  GenSXEvent,
  GenSXOutputEvent,
  GenSXProgressEvent,
  GenSXStartEvent,
} from "@gensx/client";
import { useCallback, useMemo, useRef, useState } from "react";

// JSON-serializable value type for progress data
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// WorkflowMessage type (from gensx-core)
export type WorkflowMessage =
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
  | { type: "object" | "event"; data: Record<string, JsonValue>; label: string }
  | { type: "error"; error: string }
  | { type: "end" };

// Match the Client's RunOptions interface
export interface GenSXRunOptions {
  org: string;
  project: string;
  environment?: string;
  inputs?: Record<string, unknown>;
  format?: "sse" | "ndjson" | "json";
}

export interface UseGenSXOptions<
  TInputs = unknown,
  TOutput = unknown,
  TEvent extends GenSXProgressEvent = GenSXProgressEvent,
> {
  /**
   * API endpoint URL (your server endpoint that proxies to GenSX)
   */
  endpoint: string;

  /**
   * Workflow name to execute (required now)
   */
  workflowName: string;

  /**
   * Default configuration applied to every run/stream (org, project, env, etc.)
   * Does NOT include inputs – those are passed per invocation.
   */
  defaultConfig?: Omit<Partial<GenSXRunOptions>, "inputs">;

  /**
   * Optional headers to include in the request
   */
  headers?: Record<string, string>;

  /**
   * Callback fired when workflow starts
   */
  onStart?: (message: string) => void;

  /**
   * Callback fired for progress updates
   * Can receive either a string message or a parsed JSON object for structured progress events
   */
  onProgress?: (message: string | any) => void;

  /**
   * Callback fired for each output chunk (streaming mode only)
   */
  onOutput?: (chunk: string) => void;

  /**
   * Callback fired when workflow completes
   */
  onComplete?: (output: TOutput) => void;

  /**
   * Callback fired on error
   */
  onError?: (error: string) => void;

  /**
   * Callback fired for any event
   */
  onEvent?: (event: TEvent) => void;
}

// Union type for workflow control events (excludes progress and output)
export type GenSXWorkflowEvent =
  | GenSXStartEvent
  | GenSXComponentStartEvent
  | GenSXComponentEndEvent
  | GenSXEndEvent
  | GenSXErrorEvent;

export interface UseGenSXResult<
  TInputs = any,
  TOutput = any,
  TEvent extends GenSXProgressEvent = GenSXProgressEvent,
> {
  /** Whether the workflow is currently running */
  isLoading: boolean;

  /** Whether the workflow is streaming */
  isStreaming: boolean;

  /** Any error that occurred */
  error: string | null;

  /** The final output (collection mode) */
  output: TOutput | null;

  /** All events received */
  events: GenSXEvent[];

  /** All events received */
  workflowEvents: GenSXEvent[];

  /** Progress events */
  progressEvents: TEvent[];

  /** Output events */
  outputEvents: GenSXOutputEvent[];

  /** WorkflowMessage events (for useObject and useEvent hooks) */
  workflowMessages: WorkflowMessage[];

  /** Run workflow in collection mode (returns final output) */
  run: (inputs: TInputs) => Promise<TOutput | null>;

  /** Run workflow in streaming mode */
  stream: (inputs: TInputs) => Promise<void>;

  /** Stop the current workflow */
  stop: () => void;

  /** Clear all state */
  clear: () => void;
}

/**
 * Hook for interacting with GenSX workflows via your API endpoint
 *
 * Matches the GenSX Client interface for easy passthrough implementations
 *
 * @example
 * ```tsx
 * // Configure defaults
 * const gensx = useGenSX({
 *   endpoint: '/api/gensx',
 *   defaultConfig: {
 *     org: 'my-org',
 *     project: 'my-project',
 *     environment: 'production'
 *   },
 *   onOutput: (chunk) => console.log(chunk),
 *   onComplete: (output) => console.log('Done:', output)
 * });
 *
 * // Collection mode - wait for final output
 * const result = await gensx.run('ChatWorkflow', {
 *   inputs: { userMessage: 'Hello' }
 * });
 *
 * // Streaming mode - get chunks as they arrive
 * await gensx.stream('ChatWorkflow', {
 *   inputs: { userMessage: 'Tell me a story' }
 * });
 *
 * // Override defaults for specific call
 * await gensx.run('ChatWorkflow', {
 *   org: 'different-org',
 *   project: 'different-project',
 *   inputs: { userMessage: 'Hello from different org' }
 * });
 *
 * // Use the new useObject and useEvent hooks with WorkflowMessage events
 * const currentProgress = useObject(gensx.workflowMessages, 'progress');
 * const allSteps = useEvent(gensx.workflowMessages, 'step-completed');
 * ```
 */
export function useWorkflow<
  TInputs = any,
  TOutput = any,
  // This should actually be BaseProgressEvent
  TEvent extends GenSXProgressEvent = GenSXProgressEvent,
>(
  options: UseGenSXOptions<TInputs, TOutput, TEvent>,
): UseGenSXResult<TInputs, TOutput, TEvent> {
  const {
    endpoint,
    workflowName,
    defaultConfig = {},
    headers = {},
    onStart,
    onProgress,
    onOutput,
    onComplete,
    onError,
    onEvent,
  } = options;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<TOutput | null>(null);
  const [events, setEvents] = useState<GenSXEvent[]>([]);
  const [workflowEvents, setWorkflowEvents] = useState<GenSXEvent[]>([]);
  const [progressEvents, setProgressEvents] = useState<TEvent[]>([]);
  const [outputEvents, setOutputEvents] = useState<GenSXOutputEvent[]>([]);
  const [workflowMessages, setWorkflowMessages] = useState<WorkflowMessage[]>([]);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const outputRef = useRef<TOutput | null>(null);

  // Process a single event
  const processEvent = useCallback(
    (event: GenSXEvent) => {
      // Add to events list
      setEvents((prev) => [...prev, event]);

      // Add to workflowEvents if it's a workflow control event (not progress or output)
      if (event.type !== "progress" && event.type !== "output") {
        setWorkflowEvents((prev) => [...prev, event]);
      }

      // Convert GenSXEvent to WorkflowMessage and add to workflowMessages
      const convertToWorkflowMessage = (e: GenSXEvent): WorkflowMessage | null => {
        switch (e.type) {
          case "start":
            return {
              type: "start",
              workflowExecutionId: e.workflowExecutionId,
              workflowName: e.workflowName,
            };
          case "component-start":
            return {
              type: "component-start",
              componentName: e.componentName,
              componentId: e.componentId,
            };
          case "component-end":
            return {
              type: "component-end",
              componentName: e.componentName,
              componentId: e.componentId,
            };
          case "progress":
            // Convert progress event data to WorkflowMessage data format
            if ("data" in e && typeof (e as any).data === "string") {
              try {
                const parsedData = JSON.parse((e as any).data);
                return {
                  type: "data",
                  data: parsedData,
                };
              } catch {
                return {
                  type: "data",
                  data: (e as any).data,
                };
              }
            }
            return null;
          case "error":
            return {
              type: "error",
              error: e.error || e.message || "Unknown error",
            };
          case "end":
            return {
              type: "end",
            };
          default:
            return null;
        }
      };

      const workflowMessage = convertToWorkflowMessage(event);
      if (workflowMessage) {
        setWorkflowMessages((prev) => [...prev, workflowMessage]);
      }

      // Fire generic callback
      if (event.type === "progress") {
        onEvent?.(event as unknown as TEvent);
      }

      // Handle specific event types
      switch (event.type) {
        case "start":
          onStart?.(event.workflowName);
          break;

        case "progress":
          if ("data" in event && typeof (event as any).data === "string") {
            const dataStr = (event as any).data;
            setProgressEvents((prev) => [...prev, event as TEvent]);

            // Try to parse progress message as JSON for structured progress events
            try {
              const parsedProgress = JSON.parse(dataStr);
              onProgress?.(parsedProgress);
            } catch {
              // If not JSON, pass as-is
              onProgress?.(dataStr);
            }
          }
          break;

        case "output":
          setOutputEvents((prev) => [...prev, event]);
          setOutput((prev) => {
            if (typeof prev === "string" || prev === null) {
              const newOutput = ((prev || "") + event.content) as TOutput;
              outputRef.current = newOutput; // Keep ref in sync
              return newOutput;
            }
            // For non-string outputs, just return the previous value
            return prev;
          });
          onOutput?.(event.content);
          break;

        case "end":
          // Don't set output here - it's already accumulated in real-time
          setIsLoading(false);
          setIsStreaming(false);
          // Call onComplete with the accumulated output
          onComplete?.(outputRef.current || (null as any));
          break;

        case "error":
          const errorMessage = event.error || event.message || "Unknown error";
          setError(errorMessage);
          setIsLoading(false);
          setIsStreaming(false);
          onError?.(errorMessage);
          break;
      }
    },
    [onEvent, onStart, onProgress, onOutput, onComplete, onError],
  );

  // Parse streaming response
  const parseStream = useCallback(
    async (response: Response): Promise<void> => {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const event = JSON.parse(line) as GenSXEvent;
              processEvent(event);
            } catch (e) {
              console.warn("Failed to parse event:", line);
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const event = JSON.parse(buffer) as GenSXEvent;
            processEvent(event);
          } catch (e) {
            console.warn("Failed to parse final event:", buffer);
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
    [processEvent],
  );

  // Clear state
  const clear = useCallback(() => {
    setIsLoading(false);
    setIsStreaming(false);
    setError(null);
    setOutput(null);
    setEvents([]);
    setWorkflowEvents([]);
    setProgressEvents([]);
    setOutputEvents([]);
    setWorkflowMessages([]);
    outputRef.current = null;
  }, []);

  // Stop current workflow
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsStreaming(false);
  }, []);

  // Build request payload matching Client format
  const buildPayload = useCallback(
    (inputs: TInputs) => {
      // Merge with defaults (no inputs here)
      const config = {
        ...defaultConfig,
        inputs,
      } as GenSXRunOptions;

      return {
        workflowName,
        org: config.org,
        project: config.project,
        environment: config.environment,
        format: config.format,
        ...config.inputs,
      };
    },
    [defaultConfig, workflowName],
  );

  // Run workflow in collection mode
  const run = useCallback(
    async (inputs: TInputs) => {
      // Reset state
      clear();
      setIsLoading(true);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify(buildPayload(inputs)),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to run workflow: ${response.status} ${response.statusText}`,
          );
        }

        // Parse the stream
        await parseStream(response);

        // Return the final output
        return outputRef.current;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [endpoint, headers, clear, parseStream, buildPayload],
  );

  // Run workflow in streaming mode
  const stream = useCallback(
    async (inputs: TInputs) => {
      // Reset state
      clear();
      setIsLoading(true);
      setIsStreaming(true);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify(buildPayload(inputs)),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to stream workflow: ${response.status} ${response.statusText}`,
          );
        }

        // Parse the stream
        await parseStream(response);

        // onComplete is already called in processEvent when 'end' event is received
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [endpoint, headers, clear, parseStream, buildPayload],
  );

  return {
    isLoading,
    isStreaming,
    error,
    output,
    events,
    workflowEvents,
    progressEvents,
    outputEvents,
    workflowMessages,
    run,
    stream,
    stop,
    clear
  };
}

// Standalone hook to retrieve the most recent structured progress event object for a given type
export function useProgressObject<T extends { type: string }>(
  events: T[] | Array<GenSXProgressEvent | GenSXWorkflowEvent | GenSXOutputEvent>,
  typeKey: T['type']
): T | undefined {
  return useMemo(() => {
    const matched: T[] = [];
    for (const e of events) {
      let obj: any = e;
      // If this event has a data field (progress event), try to parse JSON
      if ('data' in e && typeof (e as any).data === 'string') {
        try {
          obj = JSON.parse((e as any).data as string);
        } catch {
          // Fallback to using the raw event object
          obj = e;
        }
      }
      if (obj && obj.type === typeKey) {
        matched.push(obj as T);
      }
    }
    // Return the most recent matching object
    return matched.pop();
  }, [events, typeKey]);
}

// New hook to get the most recent object by label from WorkflowMessage events
export function useObject<T extends Record<string, JsonValue>>(
  events: WorkflowMessage[],
  label: string
): T | undefined {
  return useMemo(() => {
    const objectEvents: T[] = [];

    for (const event of events) {
      if (event.type === 'object' && event.label === label) {
        objectEvents.push(event.data as T);
      }
    }

    // Return the most recent object for this label
    return objectEvents[objectEvents.length - 1];
  }, [events, label]);
}

// New hook to get all events by label from WorkflowMessage events
export function useEvent<T extends Record<string, JsonValue>>(
  events: WorkflowMessage[],
  label: string
): T[] {
  return useMemo(() => {
    const eventList: T[] = [];

    for (const event of events) {
      if (event.type === 'event' && event.label === label) {
        eventList.push(event.data as T);
      }
    }

    return eventList;
  }, [events, label]);
}
