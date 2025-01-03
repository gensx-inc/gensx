import { JSX } from "./jsx-runtime";

export type MaybePromise<T> = T | Promise<T>;

export type Element = JSX.Element;

export interface OutputProps {
  output?: string;
}

export type Primitive = string | number | boolean | null | undefined;

// Base props type without children
type BaseProps<P> = P & OutputProps;

// Make components valid JSX elements
export type WorkflowComponent<P, O> = (
  props: ComponentProps<P, O>,
) => () => Promise<O>;

// Allow children function to return plain objects that will be executed
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
export type ExecutableValue =
  | Element
  | Element[]
  | Record<string, Element | any>;
/* eslint-enable @typescript-eslint/no-explicit-any */
/* eslint-enable @typescript-eslint/no-redundant-type-constituents */

// Component props as a type alias instead of interface
export type ComponentProps<P, O> = BaseProps<P> & {
  children?: (output: O) => MaybePromise<ExecutableValue | Primitive>;
};

export type Streamable = AsyncIterableIterator<string>;

// Stream component props as a type alias
export type StreamComponentProps<
  P,
  Stream extends boolean | undefined,
> = BaseProps<P> & {
  stream?: Stream;
  children?:
    | ((output: Streamable) => MaybePromise<ExecutableValue | Primitive>)
    | ((output: string) => MaybePromise<ExecutableValue | Primitive>)
    | ((
        output: string | Streamable,
      ) => MaybePromise<ExecutableValue | Primitive>);
};

export type StreamingComponent<P, Stream extends boolean | undefined> = (
  props: StreamComponentProps<P, Stream>,
) => () => Promise<Stream extends true ? Streamable : string>;

// Base workflow context that can be extended by other packages
export interface BaseWorkflowContext {
  streaming?: boolean;
  hadStreaming?: boolean;
  trace?: unknown;
  transaction?: unknown;
}

// Extensible workflow context
export interface WorkflowContext {
  streaming?: boolean;
  hadStreaming?: boolean;
  trace?: unknown;
  transaction?: unknown;
  [key: string]: unknown;
}
