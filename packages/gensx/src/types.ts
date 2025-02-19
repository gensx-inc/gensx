import { ExecutionContext } from "./context";
import { JSX } from "./jsx-runtime";

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
 * const Component = gsx.Component<Args, ComponentOutput>(
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
  ? DeepJSXElement<Item>[]
  : T extends object
    ? { [K in keyof T]: DeepJSXElement<T[K]> }
    : T | JSX.Element;

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
    | ((output: O) => MaybePromise<ExecutableValue<O> | Primitive>)
    | ((output: O) => void)
    | ((output: O) => Promise<void>);
};

/**
 * A component that returns either:
 * - The output type O directly
 * - JSX that will resolve to type O
 * - A promise of either of the above
 */
export type GsxComponent<P, O> = (props: Args<P, O>) => MaybePromise<
  O | DeepJSXElement<O> | ExecutableValue<O>
> /*
 * Use branding to preserve output type information.
 * This allows direct access to the output type O while maintaining
 * compatibility with the more flexible JSX composition system.
 */ & {
  readonly __brand: "gsx-component";
  readonly __outputType: O;
  readonly __rawProps: P;
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

export type GsxStreamComponent<P> = <T extends P & { stream?: boolean }>(
  props: StreamArgs<T>,
) => MaybePromise<
  | DeepJSXElement<T extends { stream: true } ? Streamable : string>
  | ExecutableValue
>;

export interface Context<T> {
  readonly __type: "Context";
  readonly defaultValue: T;
  readonly symbol: symbol;
  Provider: GsxComponent<{ value: T }, ExecutionContext>;
}
