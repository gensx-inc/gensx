/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import type { Streamable } from "./types";

import { resolveDeep } from "./resolve";

export namespace JSX {
  export type ElementType = (props: any) => Promise<unknown>;
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

// Helper to check if something is a streamable result
function isStreamable<T>(value: unknown): value is Streamable<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "stream" in value &&
    "value" in value &&
    typeof (value as Streamable<T>).stream === "function" &&
    value.value instanceof Promise
  );
}

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

    // If this is a streaming result, handle it specially
    if (isStreamable<TOutput>(rawResult)) {
      const hasChildFunction = typeof children === "function";
      const isStreamingComponent =
        "isStreamComponent" in component &&
        component.isStreamComponent === true;
      const shouldStream = isStreamingComponent && (props?.stream ?? false);

      if (!hasChildFunction) {
        // When no function children, preserve the streamable if explicitly streaming
        if (shouldStream) {
          return rawResult as Awaited<TOutput>;
        }
        // Not streaming, resolve the value
        return await rawResult.value;
      }

      if (shouldStream) {
        // Pass the streamable to children function
        const childrenResult = await (children as Function)(rawResult);
        const resolvedResult = await resolveDeep(childrenResult);
        return resolvedResult as Awaited<TOutput>;
      } else {
        // Not streaming, resolve the value first
        const resolvedValue = await rawResult.value;
        const childrenResult = await (children as Function)(
          resolvedValue as TOutput,
        );
        const resolvedResult = await resolveDeep(childrenResult);
        return resolvedResult as Awaited<TOutput>;
      }
    }

    // For non-streaming results, resolve deeply but preserve streamables
    const result = await resolveDeep(rawResult);

    // Check again after deep resolution in case we got a streamable
    if (isStreamable<TOutput>(result)) {
      const isStreamingComponent =
        "isStreamComponent" in component &&
        component.isStreamComponent === true;
      const shouldStream = isStreamingComponent && (props?.stream ?? false);
      if (shouldStream) {
        return result as Awaited<TOutput>;
      }
      // Not streaming, resolve the value
      return await result.value;
    }

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
