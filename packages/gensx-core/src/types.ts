import { z } from "zod";

import { GsxArray } from "./array.js";
import { ExecutionContext } from "./context.js";
import { JSX } from "./jsx-runtime.js";

export type MaybePromise<T> = T | Promise<T>;

export type Element = JSX.Element;

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
export type DeepJSXElement<T> =
  | (T extends (infer Item)[]
      ? DeepJSXElement<Item>[] | GsxArray<Item> | Item[]
      : T extends GsxArray<infer Item>
        ? GsxArray<Item>
        : T extends object
          ? { [K in keyof T]: DeepJSXElement<T[K]> }
          : JSX.Element | T)
  | JSX.Element;

// Allow children function to return plain objects that will be executed
export type ExecutableValue<T = unknown> =
  | Element
  | Element[]
  | Primitive
  | Streamable
  | Record<string, Element | Primitive | Streamable>
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

export type ComponentProps<P, O> = P & {
  componentOpts?: ComponentOpts;
  children?:
    | ((output: O) => MaybePromise<ExecutableValue<O>>)
    | ((output: O) => void)
    | ((output: O) => Promise<void>);
};

/**
 * A component that returns either:
 * - The output type O directly
 * - JSX that will resolve to type O
 * - A promise of either of the above
 */
export type GsxComponent<P, O> = ((
  props: ComponentProps<P, O>,
) => MaybePromise<
  O extends (infer Item)[]
    ? DeepJSXElement<O> | GsxArray<Item> | Item[] | (Item | Element)[]
    : O | DeepJSXElement<O> | ExecutableValue<O>
>) /*
 * Use branding to preserve output type information.
 * This allows direct access to the output type O while maintaining
 * compatibility with the more flexible JSX composition system.
 */ & {
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
  children?: StreamChildrenType<P>;
};

export type GsxStreamComponent<P> = (<T extends P & { stream?: boolean }>(
  props: StreamComponentProps<
    T &
      (Exclude<keyof T, keyof StreamComponentProps<P>> extends never
        ? T
        : "T must be exactly of type P")
  >,
) => MaybePromise<
  | DeepJSXElement<T extends { stream: true } ? Streamable : string>
  | ExecutableValue
>) /*
 * Use branding to preserve output type information.
 * This allows direct access to the output type O while maintaining
 * compatibility with the more flexible JSX composition system.
 */ & {
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
