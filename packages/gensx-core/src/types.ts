import { z } from "zod";

import { GsxArray } from "./array.js";
import { WithComponentOpts } from "./component.js";
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

// Component props as a type alias instead of interface
export type Args<P, O> = P & {
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
  props: Args<P, O>,
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
  run: (props: WithComponentOpts<P>) => MaybePromise<O>;
};

export type Streamable =
  | AsyncIterableIterator<string>
  | IterableIterator<string>;

type StreamChildrenType<T> = T extends { stream: true }
  ?
      | ((output: Streamable) => MaybePromise<ExecutableValue | Primitive>)
      | ((output: Streamable) => void)
      | ((output: Streamable) => Promise<void>)
  :
      | ((output: string) => MaybePromise<ExecutableValue | Primitive>)
      | ((output: string) => void)
      | ((output: string) => Promise<void>);

export type StreamArgs<P> = P & {
  stream?: boolean;
  children?: StreamChildrenType<P>;
};

export type GsxStreamComponent<P extends object & { length?: never }> = ((
  props: StreamArgs<P>,
) => MaybePromise<
  | DeepJSXElement<P extends { stream: true } ? Streamable : string>
  | ExecutableValue
>) /*
 * Use branding to preserve output type information.
 * This allows direct access to the output type O while maintaining
 * compatibility with the more flexible JSX composition system.
 */ & {
  readonly __brand: "gensx-stream-component";
  readonly __outputType: Streamable;
  readonly __rawProps: P;
  run: (props: WithComponentOpts<P>) => MaybePromise<Streamable>;
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
