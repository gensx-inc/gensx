import { JSX } from "./jsx-runtime";

export type MaybePromise<T> = T | Promise<T>;

export type Element = JSX.Element;

export interface OutputProps {
  output?: string;
}

// Base props type without children
type BaseProps<P> = P & OutputProps;

// Make components valid JSX elements
export interface WorkflowComponent<P, O> extends JSX.ElementType {
  (props: ComponentProps<P, O>): MaybePromise<O>;
  isWorkflowComponent?: true;
}

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
  children?: (output: O) => MaybePromise<ExecutableValue>;
};

export interface Streamable<T> {
  value: Promise<T>;
  stream: () => AsyncIterator<T>;
}

// Stream component props as a type alias
export type StreamComponentProps<P, O> = BaseProps<P> & {
  stream?: boolean;
  children?: (output: Streamable<O>) => MaybePromise<ExecutableValue>;
};

export interface StreamComponent<P, O> extends JSX.ElementType {
  (props: StreamComponentProps<P, O>): MaybePromise<Streamable<O>>;
  isStreamComponent?: true;
}
