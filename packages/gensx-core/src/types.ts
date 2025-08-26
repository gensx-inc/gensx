export type MaybePromise<T> = T | Promise<T>;

export type Primitive = string | number | boolean | null | undefined;

export interface RetryStrategy {
	/** Strategy type: fixed delay or exponential backoff */
	type?: "fixed" | "exponential";
	/** Fixed delay between attempts (ms) when type=fixed */
	delayMs?: number;
	/** Initial delay (ms) for exponential backoff */
	initialDelayMs?: number;
	/** Backoff multiplier for exponential strategy (default 2) */
	factor?: number;
	/** Optional maximum delay cap (ms) */
	maxDelayMs?: number;
	/** Add small random jitter to delay */
	jitter?: boolean;
}

export interface RetryConfig {
	/** Enable/disable retry handling for this component */
	enabled?: boolean;
	/** Maximum attempts including the first try (default 1) */
	maxAttempts?: number;
	/** Strategy to calculate wait time between attempts */
	strategy?: RetryStrategy;
	/** Optional predicate to decide if a given error is retryable */
	retryOn?: (error: unknown, attempt: number) => boolean;
}

export interface ComponentOpts {
	secretProps?: string[]; // Property paths to mask in checkpoints
	secretOutputs?: boolean; // Whether to mask the output of the component
	name?: string; // Allows you to override the name of the component
	metadata?: Record<string, unknown>; // Metadata to attach to the component
	aggregator?: (chunks: unknown[]) => unknown; // Aggregator function to use for streaming results, default is to accumulate all chunks into an array, and concatenate strings.
	__streamingResultKey?: string; // Key to use for the looking up streaming iterator, default is to use the component name.
	onComplete?: () => void; // Callback to call when the component completes
	idPropsKeys?: string[]; // Paths to values in the props to include in the id. Default is all props.
	/** Retry configuration for this component (declaration-time or runtime) */
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
