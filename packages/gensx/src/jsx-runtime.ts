/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { resolveDeep } from "./resolve";
import { MaybePromise } from "./types";

export namespace JSX {
  export type ElementType = (props: any) => Promise<unknown>;
  export type Element = Promise<unknown>;
  export interface ElementChildrenAttribute {
    children: (output: unknown) => JSX.Element | JSX.Element[];
  }
}

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
    children?:
      | ((output: TOutput) => MaybePromise<JSX.Element | JSX.Element[]>)
      | JSX.Element
      | JSX.Element[];
  },
>(
  component: (props: TProps) => MaybePromise<TOutput>,
  props: TProps | null,
  children?:
    | ((output: TOutput) => MaybePromise<JSX.Element | JSX.Element[]>)
    | JSX.Element
    | JSX.Element[],
): Promise<Awaited<TOutput> | Awaited<TOutput>[]> => {
  if (!children && props?.children) {
    children = props.children;
  }

  // Return a promise that will be handled by execute()
  return (async (): Promise<Awaited<TOutput> | Awaited<TOutput>[]> => {
    // Execute component
    const rawResult = await component(props ?? ({} as TProps));

    // For non-streaming results, resolve deeply but preserve streamables
    const result = await resolveDeep(rawResult);

    // If there are no function children, return the resolved result
    if (typeof children !== "function") {
      return result as Awaited<TOutput>;
    }

    // Handle child function
    const childrenResult = await children(result as TOutput);
    const resolvedResult = await resolveDeep(childrenResult);
    return resolvedResult as Awaited<TOutput>;
  })();
};

export const jsxs = jsx;
