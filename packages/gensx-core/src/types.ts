export type MaybePromise<T> = T | Promise<T>;

export type Primitive = string | number | boolean | null | undefined;

export interface ComponentOpts {
  secretProps?: string[]; // Property paths to mask in checkpoints
  secretOutputs?: boolean; // Whether to mask the output of the component
  name?: string; // Allows you to override the name of the component
  metadata?: Record<string, unknown>; // Metadata to attach to the component
  aggregator?: (chunks: unknown[]) => unknown; // Aggregator function to use for streaming results, default is to accumulate all chunks into an array, and concatenate strings.
  __streamingResultKey?: string; // Key to use for the looking up streaming iterator, default is to use the component name.
  onComplete?: () => void; // Callback to call when the component completes
  idPropsKeys?: string[]; // Paths to values in the props to include in the id. Default is all props.
  /**
   * Retry configuration. When provided, component execution errors will be retried
   * according to the strategy until success or attempts are exhausted.
   */
  retry?: RetryConfig;
}

// omit name from ComponentOpts
export type DefaultOpts = Omit<ComponentOpts, "name">;

export interface DecoratorComponentOpts extends DefaultOpts {
  name?: string;
}

export interface DecoratorWorkflowOpts extends WorkflowOpts {
  name?: string;
}

export interface WorkflowOpts extends ComponentOpts {
  metadata?: Record<string, unknown>;
}

export type RetryStrategy = "fixed" | "exponential" | "none";

export interface RetryConfig {
  /** Whether retries are enabled for this component. Default: true when object is present */
  enabled?: boolean;
  /** Maximum number of tries including the initial attempt. Default: 1 (no retry) */
  maxTries?: number;
  /** Strategy for computing delays between retries. */
  strategy?: RetryStrategy;
  /** Fixed delay (ms) between attempts when using "fixed" strategy. Default: 1000 */
  delayMs?: number;
  /** Base delay (ms) for exponential backoff. Default: 500 */
  baseDelayMs?: number;
  /** Backoff multiplier for exponential strategy. Default: 2 */
  factor?: number;
  /** Maximum backoff delay (ms) cap for exponential strategy. Optional. */
  maxDelayMs?: number;
  /** Add jitter to delay to spread contention. Provide 0-1 to apply +/- jitter. Default: 0 */
  jitter?: number;
}
