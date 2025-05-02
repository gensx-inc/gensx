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

// Define a type for any Gsx Component Function (bound or unbound)
export type ProviderComponentFunction =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | GsxComponent<any, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | BoundGsxComponent<any, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | GsxStreamComponent<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | BoundGsxStreamComponent<any>;

// Type for the providers array - Allow JSX Elements or Component Functions
export type ProviderElementOrConfig = JSX.Element | ProviderComponentFunction;

export interface ComponentOpts {
  secretProps?: string[]; // Property paths to mask in checkpoints
  secretOutputs?: boolean; // Whether to mask the output of the component
  name?: string; // Allows you to override the name of the component
  metadata?: Record<string, unknown>; // Metadata to attach to the component
  providers?: ProviderElementOrConfig[]; // Accept JSX Elements or Component Functions
  options?: {};
}

// omit name from ComponentOpts
export type DefaultOpts = Omit<ComponentOpts, "name"> & {
  providers?: ProviderElementOrConfig[]; // Accept JSX Elements or Component Functions
};

export type ComponentProps<P, O> = P & {
  componentOpts?: ComponentOpts;
  children?:
    | ((output: O) => MaybePromise<ExecutableValue<O>>)
    | ((output: O) => void)
    | ((output: O) => Promise<void>);
};

/** Base GsxComponent Definition (without .props) */
export type BaseGsxComponent<P, O> = ((
  props: ComponentProps<P, O>,
) => MaybePromise<
  O extends (infer Item)[]
    ? DeepJSXElement<O> | GsxArray<Item> | Item[] | (Item | Element)[]
    : O | DeepJSXElement<O> | ExecutableValue<O>
>) & {
  readonly __brand: "gensx-component";
  readonly __outputType: O;
  readonly __rawProps: P;
  run: (props: P & { componentOpts?: ComponentOpts }) => MaybePromise<O>;
};

/** Component Returned by .props() - relaxed .run signature */
export interface BoundGsxComponent<P, O>
  extends Omit<BaseGsxComponent<P, O>, "run" | "props"> {
  // Allow calling run with only componentOpts or nothing if all required P are bound
  run: (
    props?: /* Use Omit to remove P keys */ Omit<P, keyof P> & {
      componentOpts?: ComponentOpts;
    },
  ) => MaybePromise<O>;
  // Props on bound component returns another bound component
  props: (boundProps: Partial<P>) => BoundGsxComponent<P, O>;
  // Re-add necessary internal properties if Omit removed them
  readonly __brand: "gensx-component";
  readonly __outputType: O;
  readonly __rawProps: P;
}

/** The full component type including the initial .props method */
export interface GsxComponent<P, O> extends BaseGsxComponent<P, O> {
  props: (boundProps: Partial<P>) => BoundGsxComponent<P, O>;
}

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

/** Base GsxStreamComponent Definition (without .props) */
export type BaseGsxStreamComponent<P> = (<T extends P & { stream?: boolean }>(
  props: StreamComponentProps<
    // This is necessary to disallow extra props. Because of the extends statement above,
    // typescript would allow props that have all the necessary keys, but also have extra keys.
    // We want to prevent that, as it can be surprising for the developer.
    // This hack is not necessary for the Component type because we don't use extends in the same way.
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

/** Stream Component Returned by .props() - relaxed .run signature */
export interface BoundGsxStreamComponent<P>
  extends Omit<BaseGsxStreamComponent<P>, "run" | "props"> {
  // Allow calling run with only componentOpts/stream or nothing if all required P are bound
  run: <
    T extends /* Use Omit to remove P keys */ Omit<P, keyof P> & {
      stream?: boolean;
      componentOpts?: ComponentOpts;
    },
  >(
    props: T,
  ) => MaybePromise<T extends { stream: true } ? Streamable : string>;
  // Props on bound component returns another bound component
  props: (
    boundProps: Partial<P>,
  ) => BoundGsxStreamComponent<P & { stream?: boolean }>;
  // Re-add necessary internal properties if Omit removed them
  readonly __brand: "gensx-stream-component";
  readonly __outputType: Streamable;
  readonly __rawProps: P;
}

/** The full stream component type including the initial .props method */
export interface GsxStreamComponent<P> extends BaseGsxStreamComponent<P> {
  props: (
    boundProps: Partial<P>,
  ) => BoundGsxStreamComponent<P & { stream?: boolean }>;
}

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
