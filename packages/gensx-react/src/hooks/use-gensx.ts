import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { JsonValue, WorkflowMessage } from "@gensx/core";
export interface WorkflowRunOptions {
  org: string;
  project: string;
  environment?: string;
  inputs?: Record<string, unknown>;
  format?: "sse" | "ndjson" | "json";
}

export interface WorkflowRunConfig<TInputs = unknown> {
  inputs: TInputs;
  org?: string;
  project?: string;
  environment?: string;
}

export interface WorkflowConfig {
  baseUrl: string;
  headers?: Record<string, string>;
}

export interface UseWorkflowConfig<TOutput = unknown> {
  /**
   * All workflow configuration in one place
   */
  config: WorkflowConfig;

  /**
   * Callback fired when workflow starts
   */
  onStart?: (message: string) => void;

  /**
   * Callback fired when workflow completes
   */
  onComplete?: (output: TOutput | null) => void;

  /**
   * Callback fired on error
   */
  onError?: (error: string) => void;

  /**
   * Callback fired for any event
   */
  onEvent?: (event: WorkflowMessage) => void;

  /**
   * Optional transformer to convert accumulated string content to TOutput
   * If not provided, attempts automatic string/JSON parsing
   */
  outputTransformer?: (accumulatedContent: string) => TOutput;
}

export interface UseWorkflowResult<TInputs = unknown, TOutput = unknown> {
  /** Whether the workflow is currently in progress */
  inProgress: boolean;

  /** Any error that occurred */
  error: string | null;

  /** The final output (accumulated from stream) */
  output: TOutput | null;

  /** All workflow message events received */
  execution: WorkflowMessage[];

  /** Run workflow in streaming mode */
  run: (config: WorkflowRunConfig<TInputs>) => Promise<void>;

  /** Stop the current workflow */
  stop: () => void;
}

/**
 * Hook for interacting with GenSX workflows via your API endpoint
 *
 * @example
 * ```tsx
 * const workflow = useWorkflow({
 *   config: {
 *     baseUrl: '/api/gensx',
 *     workflowName: 'updateDraft',
 *     org: 'my-org',
 *     project: 'my-project',
 *     environment: 'production',
 *   },
 *   onComplete: (output) => console.log('Done:', output)
 * });
 *
 * // Run workflow (always streams)
 * await workflow.run({ inputs: { userMessage: 'Hello' } });
 *
 * // Use structured data hooks with WorkflowMessage events
 * const currentProgress = useObject(workflow.events, 'progress');
 * const allSteps = useEvents(workflow.events, 'step-completed');
 * ```
 */
export function useWorkflow<TInputs = unknown, TOutput = unknown>(
  options: UseWorkflowConfig<TOutput>,
): UseWorkflowResult<TInputs, TOutput> {
  const { config, onStart, onComplete, onError, onEvent, outputTransformer } =
    options;

  const { baseUrl, headers = {} } = config;

  // State
  const [inProgress, setInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<TOutput | null>(null);
  const [events, setEvents] = useState<WorkflowMessage[]>([]);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const outputRef = useRef<TOutput | null>(null);
  const accumulatedStringRef = useRef<string>("");

  // Process a single WorkflowMessage event
  const processEvent = useCallback(
    (event: WorkflowMessage) => {
      // Batch all state updates for this event to prevent race conditions
      startTransition(() => {
        // Add event to events array
        setEvents((prev) => [...prev, event]);

        // Fire the onEvent callback for all events
        onEvent?.(event);

        // Handle specific event types and fire callbacks
        switch (event.type) {
          case "start":
            setInProgress(true);
            onStart?.(event.workflowName);
            break;

          case "output":
            // Handle streaming content from "output" events
            const content = event.content || "";

            // Accumulate content outside of state setter to avoid race conditions
            accumulatedStringRef.current += content;
            const currentAccumulatedString = accumulatedStringRef.current;

            // Process output transformation outside of state setter
            let newOutput: TOutput | null = null;
            try {
              // Use custom transformer if provided
              if (outputTransformer) {
                newOutput = outputTransformer(currentAccumulatedString);
              } else if (currentAccumulatedString === "") {
                newOutput = null as TOutput;
              } else {
                // Try to parse as JSON for complex types
                try {
                  newOutput = JSON.parse(currentAccumulatedString) as TOutput;
                } catch {
                  // If JSON parsing fails, return as string (for string output types)
                  newOutput = currentAccumulatedString as TOutput;
                }
              }
            } catch (error) {
              console.warn("Output transformation failed:", error);
              // Fallback to accumulated string
              newOutput = currentAccumulatedString as TOutput;
            }

            // Update refs and state with the processed output
            outputRef.current = newOutput;
            setOutput(newOutput);
            break;

          case "event":
            // Handle simple workflow events
            if (event.label === "workflow-start") {
              setInProgress(true);
            } else if (event.label === "workflow-end") {
              setInProgress(false);
            }
            break;

          case "end":
            setInProgress(false);
            onComplete?.(outputRef.current);
            break;

          case "error":
            setError(event.error);
            setInProgress(false);
            onError?.(event.error);
            break;
        }
      });
    },
    [onStart, onComplete, onError, onEvent, outputTransformer],
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
          buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const event = JSON.parse(line) as WorkflowMessage;
              processEvent(event);
            } catch (_e) {
              console.warn("Failed to parse event:", line);
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const event = JSON.parse(buffer) as WorkflowMessage;
            processEvent(event);
          } catch (_e) {
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
    setInProgress(false);
    setError(null);
    setOutput(null);
    setEvents([]);
    outputRef.current = null;
    accumulatedStringRef.current = "";
  }, []);

  // Stop current workflow
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setInProgress(false);
  }, []);

  // Build request payload - just pass inputs since API route handles workflow config
  const buildPayload = useCallback((runConfig: WorkflowRunConfig<TInputs>) => {
    return {
      ...runConfig.inputs,
    };
  }, []);

  // Run workflow in streaming mode
  const run = useCallback(
    async (runConfig: WorkflowRunConfig<TInputs>) => {
      // Reset state
      clear();
      setInProgress(true);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify(buildPayload(runConfig)),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to run workflow: ${response.status} ${response.statusText}`,
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
        setInProgress(false);
        abortControllerRef.current = null;
      }
    },
    [baseUrl, headers, clear, parseStream, buildPayload],
  );

  return {
    inProgress,
    error,
    output,
    execution: events,
    run,
    stop,
  };
}

// New hook to get the most recent object by label from WorkflowMessage events
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function useObject<
  T extends Record<string, JsonValue> = Record<string, JsonValue>,
>(events: WorkflowMessage[], label: string): T | undefined {
  return useMemo(() => {
    const objectEvents: T[] = [];

    for (const event of events) {
      if (event.type === "object" && event.label === label) {
        objectEvents.push(event.data as T);
      }
    }

    // Return the most recent object for this label
    return objectEvents[objectEvents.length - 1];
  }, [events, label]);
}

// New hook to get all events by label from WorkflowMessage events
export function useEvents<T extends Record<string, JsonValue>>(
  events: WorkflowMessage[],
  label: string,
  onEvent?: (event: T) => void,
): T[] {
  const eventList = useMemo(() => {
    const list: T[] = [];

    for (const event of events) {
      if (event.type === "event" && event.label === label) {
        list.push(event.data as T);
      }
    }

    return list;
  }, [events, label]);

  // Track the last processed event index to prevent duplicate notifications
  const lastProcessedIndexRef = useRef(-1);

  // Call onEvent callback for new events only
  useEffect(() => {
    if (onEvent && eventList.length > 0) {
      // Only process events that haven't been processed yet
      for (
        let i = lastProcessedIndexRef.current + 1;
        i < eventList.length;
        i++
      ) {
        onEvent(eventList[i]);
      }
      // Update the last processed index
      lastProcessedIndexRef.current = eventList.length - 1;
    }
  }, [eventList, onEvent]);

  return eventList;
}
