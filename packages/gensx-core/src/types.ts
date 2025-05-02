import { z } from "zod";

import { ExecutionContext } from "./context.js";

// Basic primitives
export type Primitive = string | number | boolean | null | undefined;

// Allows for a Promise or direct value
export type MaybePromise<T> = T | Promise<T>;

/**
 * This allows an element to return either a plain object or an object with JSX.Element children
 * This is useful for components that return a nested object structure, where each key can be a component
 * that returns a plain object or an object with JSX.Element children.
 *
 * For example:
 *
 * interface ComponentOutput {
 *   nested: {
 *     foo: string;
 *     bar: string;
 *   }[];
 * }
 *
 * interface Args {
 *   input: string;
 * }
 *
 * const Component = gensx.Component<Args, ComponentOutput>(
 *   "Component",
 *   ({ input }) => ({
 *     nested: [
 *       { foo: <Foo input={input} />, bar: <Bar input={input} /> },
 *       { foo: <Foo />, bar: <Bar /> },
 *     ],
 *   }),
 * );
 */
export type DeepJSXElement<T> =
  | T
  | Record<string, T>
  | (T | Record<string, T>)[];

// Executable values
export type ExecutableValue<T = unknown> = () => MaybePromise<T>;

// Component options
export interface ComponentOpts {
  name?: string;
  provider?: unknown;
  metadata?: Record<string, unknown>;
  secretProps?: string[];
  secretOutputs?: boolean;
}

// Default options for components
export interface DefaultOpts {
  metadata?: Record<string, unknown>;
  secretProps?: string[];
  secretOutputs?: boolean;
}

// Streamable output
export interface Streamable extends AsyncIterable<string> {
  [Symbol.asyncIterator](): AsyncIterator<string>;
}

// Props for components
export type ComponentProps<P, O> = P & {
  children?: (result: O) => unknown;
  length?: never;
};

// Children function types for streaming
export type StreamChildrenType<T> = (result: T | Streamable) => unknown;

// The FluentComponent interface for typings
export interface FluentComponent<P extends object, O> {
  // Core execution with overloads for stream parameter
  run(
    props?: Partial<P & { stream: true }> & { componentOpts?: ComponentOpts },
  ): Promise<Streamable>;
  run(
    props?: Partial<P & { stream: false }> & { componentOpts?: ComponentOpts },
  ): Promise<string>;
  run(props?: Partial<P> & { componentOpts?: ComponentOpts }): Promise<O>;

  // Binding operations
  props(props: Partial<P>): FluentComponent<P, O>;
  withProvider(provider: unknown): FluentComponent<P, O>;

  // Transform operations
  pipe<R>(mapFn: (output: O) => MaybePromise<R>): FluentComponent<P, R>;
  branch<R>(
    predicate: (output: O) => boolean | Promise<boolean>,
    ifTrue: (output: O) => MaybePromise<R>,
    ifFalse: (output: O) => MaybePromise<R>,
  ): FluentComponent<P, R>;

  // Array operations
  map<R>(mapFn: (item: unknown) => MaybePromise<R>): FluentComponent<P, R[]>;

  // Parallel execution
  fork(
    ...mapFns: ((output: O) => MaybePromise<unknown>)[]
  ): FluentFork<P, O, unknown[]>;
}

// Fork interface for parallel execution
export interface FluentFork<
  P extends object,
  _ParentOutput,
  R extends unknown[],
> {
  join<R2>(joinFn: (...results: R) => MaybePromise<R2>): FluentComponent<P, R2>;
}

// Provider interface
export interface Provider<T> {
  value: T;
  props(props: Partial<T>): Provider<T>;
  execute<P extends object, O>(
    component: FluentComponent<P, O>,
    props?: P,
  ): Promise<O>;
  with<R>(fn: (provider: Provider<T>) => MaybePromise<R>): Promise<R>;
}

// Legacy types for backwards compatibility
export type GsxComponent<P extends object, O> = FluentComponent<P, O>;
export type GsxStreamComponent<P extends object> = FluentComponent<
  P,
  string | Streamable
>;

export interface Context<T> {
  readonly __type: "Context";
  readonly defaultValue: T;
  readonly symbol: symbol;
  Provider: GsxComponent<
    { value: T; onComplete?: () => Promise<void> | void },
    ExecutionContext
  >;
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
