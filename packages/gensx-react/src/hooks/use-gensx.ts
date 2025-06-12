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

  /** Run workflow in collection mode (returns final output) */
  run: (inputs: TInputs) => Promise<TOutput | null>;

  /** Run workflow in streaming mode */
  stream: (inputs: TInputs) => Promise<void>;

  /** Stop the current workflow */
  stop: () => void;

  /** Clear all state */
  clear: () => void;

  /**
   * Hook to retrieve (and optionally transform) structured progress events.
   * Always returns both events array and reduced value.
   *
   * Basic usage:
   *   const { events, value } = useProgressEvents("myType");
   *
   * With reducer:
   *   const { events, value } = useProgressEvents("myType", {
   *     reducer: {
   *       reduce: (acc, e) => acc + 1,
   *       initial: 0
   *     }
   *   });
   */
  useProgressEvents: <T extends { type: string }, R = T[]>(
    filter: T["type"] | T["type"][] | ((e: any) => e is T),
    options?: {
      reducer?: {
        reduce: (acc: R, item: T) => R;
        initial: R;
      };
    },
  ) => { events: T[]; value: R };

  /**
   * Hook to retrieve workflow control events.
   * Returns events for 'start', 'end', 'component-start', 'component-end', 'error'.
   * Excludes 'progress' and 'output' events.
   * Always returns both events array and reduced value.
   *
   * Basic usage:
   *   const { events, value } = useWorkflowEvents();
   *
   * With reducer:
   *   const { events, value } = useWorkflowEvents({
   *     reducer: {
   *       reduce: (acc, e) => acc + 1,
   *       initial: 0
   *     }
   *   });
   */
  useWorkflowEvents: <T = GenSXWorkflowEvent, R = T[]>(options?: {
    reducer?: {
      reduce: (acc: R, item: T) => R;
      initial: R;
    };
  }) => { events: T[]; value: R };

  /**
   * Hook to retrieve output events.
   * Returns GenSXOutputEvent objects for 'output' events only.
   * Always returns both events array and reduced value.
   *
   * Basic usage:
   *   const { events, value } = useOutputEvents();
   *
   * With reducer:
   *   const { events, value } = useOutputEvents({
   *     reducer: {
   *       reduce: (acc, e) => acc + e.content,
   *       initial: ''
   *     }
   *   });
   */
  useOutputEvents: <T = GenSXOutputEvent, R = T[]>(options?: {
    reducer?: {
      reduce: (acc: R, item: T) => R;
      initial: R;
    };
  }) => { events: T[]; value: R };
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

  // Hook to filter (and optionally map) structured progress events with strong typing
  const useProgressEvents = useCallback(
    <T extends { type: string }, R = T[]>(
      filter: T["type"] | T["type"][] | ((e: any) => e is T),
      options?: {
        reducer?: {
          reduce: (acc: R, item: T) => R;
          initial: R;
        };
      },
    ): { events: T[]; value: R } => {
      return useMemo(() => {
        // 1. Parse all progress events into objects (best-effort)
        const parsed: unknown[] = progressEvents
          .filter((e) => e.type === "progress")
          .map((e) => {
            const raw = (e as any).data as string | undefined;
            if (!raw) return null;
            try {
              return JSON.parse(raw);
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        // 2. Narrow to the desired subset
        let matched: T[] = [];

        if (typeof filter === "function") {
          matched = (parsed as T[]).filter(filter);
        } else {
          const keys = Array.isArray(filter) ? filter : [filter];
          matched = (parsed as T[]).filter((ev) =>
            (keys as string[]).includes((ev as any).type),
          );
        }

        // 3. Apply reducer if provided, otherwise use the events as the value
        if (options?.reducer?.initial !== undefined) {
          const value = matched.reduce(
            options.reducer.reduce as any,
            options.reducer.initial,
          );
          return { events: matched, value };
        }

        // Default: value is the events array itself
        return { events: matched, value: matched as unknown as R };
      }, [events, filter, options]);
    },
    [events],
  );

  // Hook to get all workflow events except progress and output events
  const useWorkflowEvents = useCallback(
    <T = GenSXWorkflowEvent, R = T[]>(options?: {
      reducer?: {
        reduce: (acc: R, item: T) => R;
        initial: R;
      };
    }): { events: T[]; value: R } => {
      return useMemo(() => {
        // Filter out progress and output events
        const workflowControlEvents = events.filter(
          (e) => e.type !== "progress" && e.type !== "output",
        ) as T[];

        // Apply reducer if provided, otherwise use the events as the value
        if (options?.reducer?.initial !== undefined) {
          const value = workflowControlEvents.reduce(
            options.reducer.reduce as any,
            options.reducer.initial,
          );
          return { events: workflowControlEvents, value };
        }

        // Default: value is the events array itself
        return {
          events: workflowControlEvents,
          value: workflowControlEvents as unknown as R,
        };
      }, [events, options]);
    },
    [events],
  );

  // Hook to get output events
  const useOutputEvents = useCallback(
    <T = GenSXOutputEvent, R = T[]>(options?: {
      reducer?: {
        reduce: (acc: R, item: T) => R;
        initial: R;
      };
    }): { events: T[]; value: R } => {
      return useMemo(() => {
        // Filter only output events
        const outputEvents = events.filter((e) => e.type === "output") as T[];

        // Apply reducer if provided, otherwise use the events as the value
        if (options?.reducer?.initial !== undefined) {
          const value = outputEvents.reduce(
            options.reducer.reduce as any,
            options.reducer.initial,
          );
          return { events: outputEvents, value };
        }

        // Default: value is the events array itself
        return { events: outputEvents, value: outputEvents as unknown as R };
      }, [events, options]);
    },
    [events, options],
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
    run,
    stream,
    stop,
    clear,
    useOutputEvents,
    useProgressEvents,
    useWorkflowEvents,
  };
}
