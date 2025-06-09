import { useCallback, useEffect, useRef, useState } from "react";

// Types for workflow execution
export interface WorkflowExecutionOptions {
  /** Base URL for the GenSX dev server (defaults to http://localhost:1337) */
  baseUrl?: string;
  /** Timeout in milliseconds for workflow execution */
  timeout?: number;
  /** Production API configuration */
  production?: {
    /** GenSX organization name */
    org: string;
    /** GenSX project name */
    project: string;
    /** Environment name (e.g., 'default', 'staging', 'production') */
    environment: string;
    /** GenSX API key for authentication */
    apiKey: string;
    /** Production API base URL (defaults to https://api.gensx.com) */
    apiBaseUrl?: string;
  };
}

export interface WorkflowState<T = unknown> {
  /** The current state data */
  data: T | null;
  /** Whether the workflow is currently loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Whether the workflow has completed */
  isComplete: boolean;
  /** The execution ID for this workflow run */
  executionId: string | null;
}

export interface UseWorkflowResult<TInput, TOutput> {
  /** Execute the workflow synchronously (returns result) */
  execute: (input: TInput) => Promise<TOutput>;
  /** Current execution state */
  isLoading: boolean;
  /** Last execution error */
  error: Error | null;
  /** Last execution result */
  result: TOutput | null;
}

export interface UseAsyncWorkflowResult<TInput> {
  /** Start the workflow asynchronously */
  start: (input: TInput) => Promise<string>; // Returns execution ID
  /** Current execution state */
  isLoading: boolean;
  /** Last execution error */
  error: Error | null;
  /** Current execution ID */
  executionId: string | null;
}

export interface ProgressEvent {
  id: string;
  type: string;
  timestamp: string;
  executionId: string;
  data: unknown;
}

export interface StateUpdateEvent extends ProgressEvent {
  type: "state-update";
  data: {
    stateName: string;
    patch?: {
      op: "replace" | "add" | "remove";
      path: string;
      value?: unknown;
    }[];
    fullState?: unknown;
  };
}

interface JSONPatch {
  op: "replace" | "add" | "remove";
  path: string;
  value?: unknown;
}

// Internal configuration interface
interface ResolvedConfig {
  isProduction: boolean;
  baseUrl: string;
  timeout: number;
  headers: Record<string, string>;
  buildWorkflowUrl: (workflowPath: string) => string;
  buildProgressUrl: (executionId: string) => string;
}

// Utility function to resolve configuration
function resolveConfig(options: WorkflowExecutionOptions): ResolvedConfig {
  const isProduction = !!options.production;
  const timeout = options.timeout ?? 30000;

  if (isProduction) {
    const {
      org,
      project,
      environment,
      apiKey,
      apiBaseUrl = "https://api.gensx.com",
    } = options.production!;

    const baseUrl = apiBaseUrl;
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    return {
      isProduction: true,
      baseUrl,
      timeout,
      headers,
      buildWorkflowUrl: (workflowPath: string) => {
        // Remove leading slash if present
        const cleanWorkflowPath = workflowPath.startsWith("/")
          ? workflowPath.slice(1)
          : workflowPath;
        return `${baseUrl}/org/${org}/projects/${project}/environments/${environment}/workflows/${cleanWorkflowPath}`;
      },
      buildProgressUrl: (executionId: string) => {
        // Production uses the same workflow URL for streaming
        // We'll handle this differently in the streaming logic
        return `${baseUrl}/org/${org}/projects/${project}/environments/${environment}/executions/${executionId}/progress`;
      },
    };
  } else {
    // Development configuration
    const baseUrl = options.baseUrl ?? "http://localhost:1337";
    const headers = {
      "Content-Type": "application/json",
    };

    return {
      isProduction: false,
      baseUrl,
      timeout,
      headers,
      buildWorkflowUrl: (workflowPath: string) => {
        return `${baseUrl}/workflows${workflowPath}`;
      },
      buildProgressUrl: (executionId: string) => {
        return `${baseUrl}/workflowExecutions/${executionId}/progress`;
      },
    };
  }
}

/**
 * Hook for running workflows synchronously and getting the result
 */
export function useWorkflow<TInput = unknown, TOutput = unknown>(
  workflowPath: string,
  options: WorkflowExecutionOptions = {},
): UseWorkflowResult<TInput, TOutput> {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<TOutput | null>(null);

  const config = resolveConfig(options);

  const execute = useCallback(
    async (input: TInput): Promise<TOutput> => {
      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, config.timeout);

        const url = config.buildWorkflowUrl(workflowPath);
        const response = await fetch(url, {
          method: "POST",
          headers: config.headers,
          body: JSON.stringify(input),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `Workflow execution failed: ${response.status} ${response.statusText}`,
          );
        }

        const output = (await response.json()) as TOutput;
        setResult(output);
        return output;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Unknown error occurred");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [workflowPath, config],
  );

  return {
    execute,
    isLoading,
    error,
    result,
  };
}

/**
 * Hook for starting workflows asynchronously and getting execution ID
 */
export function useAsyncWorkflow<TInput = unknown>(
  workflowPath: string,
  options: WorkflowExecutionOptions = {},
): UseAsyncWorkflowResult<TInput> {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);

  const config = resolveConfig(options);

  const start = useCallback(
    async (input: TInput): Promise<string> => {
      setIsLoading(true);
      setError(null);
      setExecutionId(null);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, config.timeout);

        let url: string;
        if (config.isProduction) {
          // Production: Start workflow with streaming intent but get execution ID
          url = config.buildWorkflowUrl(workflowPath);
        } else {
          // Development: Use the dedicated start endpoint
          url = `${config.baseUrl}/workflows${workflowPath}/start`;
        }

        const response = await fetch(url, {
          method: "POST",
          headers: config.headers,
          body: JSON.stringify(input),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `Workflow start failed: ${response.status} ${response.statusText}`,
          );
        }

        const result = (await response.json()) as { executionId: string };
        const execId = result.executionId;
        setExecutionId(execId);
        return execId;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Unknown error occurred");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [workflowPath, config],
  );

  return {
    start,
    isLoading,
    error,
    executionId,
  };
}

/**
 * Hook for streaming workflow state from a running execution
 */
export function useWorkflowState<T = unknown>(
  executionId: string | null,
  stateName?: string,
  options: WorkflowExecutionOptions = {},
): WorkflowState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  const config = resolveConfig(options);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!executionId) {
      setData(null);
      setIsLoading(false);
      setError(null);
      setIsComplete(false);
      return;
    }

    let mounted = true;
    setIsLoading(true);
    setError(null);

    const connectToStream = async (): Promise<void> => {
      try {
        // Cancel any existing connection
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        // Build URL and headers based on environment
        let url: string;
        let headers: Record<string, string>;

        if (config.isProduction) {
          // Production: Use progress endpoint
          url = config.buildProgressUrl(executionId);
          headers = {
            ...config.headers,
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
          };
        } else {
          // Development: Use the progress endpoint with query params
          const progressUrl = new URL(config.buildProgressUrl(executionId));
          if (lastEventIdRef.current) {
            progressUrl.searchParams.set("lastEventId", lastEventIdRef.current);
          }
          url = progressUrl.toString();
          headers = {
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
          };
        }

        const response = await fetch(url, {
          headers,
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to connect to progress stream: ${response.status}`,
          );
        }

        if (!response.body) {
          throw new Error("No response body available");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (mounted) {
            const { done, value } = await reader.read();

            if (done) {
              setIsComplete(true);
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (!line.trim()) continue;

              if (line.startsWith("id: ")) {
                lastEventIdRef.current = line.substring(4).trim();
                continue;
              }

              if (line.startsWith("data: ")) {
                try {
                  const eventData = JSON.parse(line.substring(6)) as unknown;
                  const event = eventData as ProgressEvent;

                  // Handle state update events
                  if (event.type === "state-update" && mounted) {
                    const stateEvent = event as StateUpdateEvent;

                    // If stateName is specified, only process events for that state
                    if (!stateName || stateEvent.data.stateName === stateName) {
                      if (stateEvent.data.fullState !== undefined) {
                        // Full state update
                        setData(stateEvent.data.fullState as T);
                      } else if (stateEvent.data.patch) {
                        // Apply JSON patches
                        setData((prevData: T | null) => {
                          if (!prevData) return prevData;

                          let newData = JSON.parse(
                            JSON.stringify(prevData),
                          ) as T;

                          for (const patch of stateEvent.data.patch!) {
                            try {
                              applyJsonPatch(
                                newData as Record<string, unknown>,
                                patch,
                              );
                            } catch (patchError) {
                              console.warn(
                                "Failed to apply JSON patch:",
                                patch,
                                patchError,
                              );
                            }
                          }

                          return newData;
                        });
                      }
                    }
                  }

                  // Handle workflow completion
                  if (
                    event.type === "workflow-complete" ||
                    event.type === "workflow-error"
                  ) {
                    setIsComplete(true);
                  }
                } catch (parseError) {
                  console.warn("Failed to parse event data:", line, parseError);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch (err) {
        if (mounted && !abortControllerRef.current?.signal.aborted) {
          const error =
            err instanceof Error ? err : new Error("Stream connection failed");
          setError(error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void connectToStream();

    return () => {
      mounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [executionId, stateName, config]);

  return {
    data,
    isLoading,
    error,
    isComplete,
    executionId,
  };
}

/**
 * Combined hook for running a workflow asynchronously and streaming its state
 */
export function useWorkflowWithState<TInput = unknown, TState = unknown>(
  workflowPath: string,
  stateName?: string,
  options: WorkflowExecutionOptions = {},
) {
  const asyncWorkflow = useAsyncWorkflow<TInput>(workflowPath, options);
  const state = useWorkflowState<TState>(
    asyncWorkflow.executionId,
    stateName,
    options,
  );

  return {
    start: asyncWorkflow.start,
    state: state.data,
    isLoading: asyncWorkflow.isLoading || state.isLoading,
    error: asyncWorkflow.error ?? state.error,
    isComplete: state.isComplete,
    executionId: asyncWorkflow.executionId,
  };
}

// Utility function to apply JSON patches
function applyJsonPatch(obj: Record<string, unknown>, patch: JSONPatch): void {
  const pathParts = patch.path.split("/").filter((p) => p !== "");

  if (patch.op === "replace" || patch.op === "add") {
    let current: Record<string, unknown> = obj;

    // Navigate to the parent object
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!part) continue;

      if (!(part in current)) {
        current[part] = {};
      }
      const next = current[part];
      if (typeof next === "object" && next !== null) {
        current = next as Record<string, unknown>;
      }
    }

    // Set the value
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart) {
      current[lastPart] = patch.value;
    }
  } else if (patch.op === "remove") {
    let current: Record<string, unknown> = obj;

    // Navigate to the parent object
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!part) continue;

      if (!(part in current)) {
        return; // Path doesn't exist, nothing to remove
      }
      const next = current[part];
      if (typeof next === "object" && next !== null) {
        current = next as Record<string, unknown>;
      }
    }

    // Remove the property
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart in current) {
      delete current[lastPart];
    }
  }
}

// Types are already exported as interfaces above
