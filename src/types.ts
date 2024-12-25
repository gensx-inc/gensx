import { JSX } from "./jsx-runtime";

export type MaybePromise<T> = T | Promise<T>;

export type Element = JSX.Element;

export interface OutputProps {
  output?: string;
}

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

export type ComponentProps<P, O> = P &
  OutputProps & {
    children?: (output: O) => MaybePromise<ExecutableValue>;
  };
