/* eslint-disable @typescript-eslint/no-namespace */
import { resolveDeep } from "./resolve";

export namespace JSX {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type ElementType = (props: any) => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  // interface IntrinsicElements {}
  export type Element = Promise<unknown>;
  export interface ElementChildrenAttribute {
    children: (output: unknown) => JSX.Element | JSX.Element[];
  }
}

export type MaybePromise<T> = T | Promise<T>;

export const Fragment = (props: {
  children: JSX.Element[] | JSX.Element;
}): JSX.Element[] => {
  if (Array.isArray(props.children)) {
    return props.children;
  }
  return [props.children];
};

export const jsx = <
  TOutput,
  TProps extends Record<string, unknown> & {
    children?: (output: TOutput) => MaybePromise<JSX.Element | JSX.Element[]>;
  },
>(
  component: (props: TProps) => MaybePromise<TOutput>,
  props: TProps | null,
  children?: (output: TOutput) => MaybePromise<JSX.Element | JSX.Element[]>,
): Promise<Awaited<TOutput> | Awaited<TOutput>[]> => {
  if (!children && props?.children) {
    children = props.children;
  }

  // Return a promise that will be handled by execute()
  return (async (): Promise<Awaited<TOutput> | Awaited<TOutput>[]> => {
    // Execute component and deeply resolve its result
    const rawResult = await component(props ?? ({} as TProps));
    const result = (await resolveDeep(rawResult)) as TOutput;

    // If there are no children, return the resolved result
    if (!children) {
      return result as Awaited<TOutput>;
    }

    // Handle array of children (Fragment edge case)
    if (Array.isArray(children)) {
      const resolvedChildren = await Promise.all(
        children.map(child => resolveDeep(child)),
      );
      return resolvedChildren as Awaited<TOutput>[];
    }

    // Handle child function
    if (typeof children === "function") {
      const childrenResult = await children(result);
      return resolveDeep(childrenResult) as Awaited<TOutput>;
    }

    // Handle single child (Fragment edge case)
    return resolveDeep(children) as Awaited<TOutput>;
  })();
};

export const jsxs = <
  TOutput,
  TProps extends Record<string, unknown> & {
    children?: (output: TOutput) => MaybePromise<JSX.Element | JSX.Element[]>;
  },
>(
  component: (props: TProps) => MaybePromise<TOutput>,
  props: TProps | null,
  children?: (output: TOutput) => MaybePromise<JSX.Element | JSX.Element[]>,
): Promise<TOutput | TOutput[]> => {
  return jsx(component, props, children);
};
