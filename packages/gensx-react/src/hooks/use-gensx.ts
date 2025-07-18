import type {
  InferToolParams,
  JsonValue,
  ToolBox,
  ToolImplementations,
  WorkflowMessage,
} from "@gensx/core";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

export interface UseWorkflowConfig<
  TOutput = unknown,
  TToolBox extends ToolBox = ToolBox,
> {
  /**
   * All workflow configuration in one place
   */
  config: WorkflowConfig;

  /**
   * External tools that can be called from the workflow
   */
  tools?: ToolImplementations<TToolBox>;

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

  /** Run workflow in streaming mode */
  start: (config: WorkflowRunConfig<TInputs>) => Promise<void>;

  /** Stop the current workflow */
  stop: () => void;

  /** Clear all workflow state */
  clear: () => void;
}

/**
 * Hook for interacting with GenSX workflows via your API endpoint
 *
 * @example
 * ```tsx
 * const workflow = useWorkflow({
 *   config: {
 *     baseUrl: '/api/gensx',
 *   },
 *   onEvent: (event) => console.log('Event:', event)
 * });
 *
 * // Run the workflow
 * await workflow.run({ inputs: { userMessage: 'Hello' } });
 *
 * // Stream strongly-typed objects
 * const currentProgress = useObject<ProgressEvent>(workflow.execution, 'progress');
 *
 * // Process events as they come in
 * const allSteps = useEvents<StepEvent>(workflow.execution, 'step-completed', (step) => {
 *   console.log('Step completed:', step);
 * });
 *
 * // Clear workflow state
 * workflow.clear();
 * ```
 */
export function useWorkflow<
  TInputs = unknown,
  TOutput = unknown,
  TToolBox extends ToolBox = ToolBox,
>(
  options: UseWorkflowConfig<TOutput, TToolBox>,
): UseWorkflowResult<TInputs, TOutput> {
  const {
    config,
    tools,
    onStart,
    onComplete,
    onError,
    onEvent,
    outputTransformer,
  } = options;

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
  const executionId = useRef<string | null>(null);

  // Process a single WorkflowMessage event
  const processEvent = useCallback(
    (event: WorkflowMessage) => {
      // Batch all state updates for this event to prevent race conditions
      startTransition(async () => {
        // Add event to events array
        setEvents((prev) => [...prev, event]);

        // Fire the onEvent callback for all events
        onEvent?.(event);

        // Handle specific event types and fire callbacks
        switch (event.type) {
          case "start":
            executionId.current = event.workflowExecutionId ?? null;
            setInProgress(true);
            onStart?.(event.workflowName);
            break;

          case "data":
            // Handle streaming content from "data" events
            const content =
              typeof event.data === "string"
                ? event.data
                : JSON.stringify(event.data);

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

          case "external-tool":
            if (!executionId.current) {
              console.error(
                "[GenSX] Cannot resolve tool call, execution ID is not set.",
              );
              break;
            }
            const toolImpl = tools?.[event.toolName as keyof typeof tools];
            // Handle external tool calls from workflow
            if (toolImpl) {
              const result = await toolImpl.execute(
                event.params as unknown as InferToolParams<
                  TToolBox,
                  typeof event.toolName
                >,
              );

              // Send this to the API
              const response = await fetch(
                `${baseUrl}/workflowExecutions/${executionId.current}/fulfill/${event.nodeId}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...headers,
                  },
                  body: JSON.stringify(result),
                },
              );

              if (!response.ok) {
                throw new Error(
                  `Failed to resume workflow: ${response.status} ${response.statusText}`,
                );
              }

              break;
            }
            console.warn(
              "[GenSX] Tool implementation not found:",
              event.toolName,
            );

            // If there is no tool implementation, return a well-known object as the result so the workflow can continue
            const response = await fetch(
              `${baseUrl}/workflowExecutions/${executionId.current}/fulfill/${event.nodeId}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...headers,
                },
                body: JSON.stringify({
                  __gensxMissingToolImplementation: true,
                  toolName: event.toolName,
                }),
              },
            );
            if (!response.ok) {
              throw new Error(
                `Failed to resume workflow: ${response.status} ${response.statusText}`,
              );
            }
            break;
        }
      });
    },
    [
      onStart,
      onComplete,
      onError,
      onEvent,
      outputTransformer,
      tools,
      executionId,
    ],
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
              const event = JSON.parse(line.trim()) as WorkflowMessage;
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
  const start = useCallback(
    async (runConfig: WorkflowRunConfig<TInputs>) => {
      // Reset state
      clear();
      setInProgress(true);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`${baseUrl}/start`, {
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

        const { executionId: newExecutionId } = (await response.json()) as {
          executionId: string;
        };
        executionId.current = newExecutionId;

        // Connect to progress events
        const progressResponse = await fetch(
          `${baseUrl}/workflowExecutions/${executionId.current}/progress`,
          {
            method: "POST",
          },
        );

        // Parse the stream
        await parseStream(progressResponse);

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
    start,
    stop,
    clear,
  };
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
