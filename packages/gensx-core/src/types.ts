import { z } from "zod";

import { ExecutionContext } from "./context.js";

export type MaybePromise<T> = T | Promise<T>;

export type Primitive = string | number | boolean | null | undefined;

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
export type DeepJSXElement<T> = T extends (infer Item)[]
  ? DeepJSXElement<Item>[] | Item[]
  : T extends object
    ? { [K in keyof T]: DeepJSXElement<T[K]> }
    : T;

// Allow children function to return plain objects that will be executed
export type ExecutableValue<T = unknown> =
  | Primitive
  | Streamable
  | Record<string, Primitive | Streamable>
  | T[]
  | Record<string, T>;

export interface ComponentOpts {
  secretProps?: string[]; // Property paths to mask in checkpoints
  secretOutputs?: boolean; // Whether to mask the output of the component
  name?: string; // Allows you to override the name of the component
  metadata?: Record<string, unknown>; // Metadata to attach to the component
}

// omit name from ComponentOpts
export type DefaultOpts = Omit<ComponentOpts, "name">;

export type ComponentProps<P> = P & {
  componentOpts?: ComponentOpts;
};

/**
 * A component that returns either:
 * - The output type O directly
 * - JSX that will resolve to type O
 * - A promise of either of the above
 */
export type GsxComponent<P, O> = ((
  props: ComponentProps<P>,
) => MaybePromise<
  O extends (infer Item)[]
    ? DeepJSXElement<O> | Item[]
    : O | DeepJSXElement<O> | ExecutableValue<O>
>) & {
  readonly __brand: "gensx-component";
  readonly __outputType: O;
  readonly __rawProps: P;
  run: (props: P & { componentOpts?: ComponentOpts }) => MaybePromise<O>;
};

export type Streamable =
  | AsyncIterableIterator<string>
  | IterableIterator<string>;

export type StreamChildrenType<T> =
  | ((
      output: T extends { stream: true } ? Streamable : string,
    ) => MaybePromise<ExecutableValue | Primitive>)
  | ((output: T extends { stream: true } ? Streamable : string) => void)
  | ((
      output: T extends { stream: true } ? Streamable : string,
    ) => Promise<void>);

export type StreamComponentProps<P> = P & {
  stream?: boolean;
  componentOpts?: ComponentOpts;
};

export type GsxStreamComponent<P> = (<T extends P & { stream?: boolean }>(
  props: StreamComponentProps<
    T & Record<Exclude<keyof T, keyof StreamComponentProps<P>>, never>
  >,
) => MaybePromise<
  | DeepJSXElement<T extends { stream: true } ? Streamable : string>
  | ExecutableValue
>) & {
  readonly __brand: "gensx-stream-component";
  readonly __outputType: Streamable;
  readonly __rawProps: P;
  run: <U extends P & { stream?: boolean; componentOpts?: ComponentOpts }>(
    props: U,
  ) => MaybePromise<U extends { stream: true } ? Streamable : string>;
};

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
