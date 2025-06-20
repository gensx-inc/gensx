import { z } from "zod";

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

export type GSXToolAnySchema = z.ZodObject<z.ZodRawShape>;
// We export this type here so that we can share the same shape across all of our tool running implementations
export interface GSXToolProps<TSchema extends GSXToolAnySchema> {
  name: string;
  description: string;
  schema: TSchema;
  run: (args: z.infer<TSchema>) => Promise<unknown>;
  options?: {};
}
