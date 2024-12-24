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
export type ExecutableValue =
  | Element
  | Element[]
  | Record<string, Element | any>;

export type ComponentProps<P, O> = P &
  OutputProps & {
    children?: (output: O) => MaybePromise<ExecutableValue>;
  };
