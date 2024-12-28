/* eslint-disable @typescript-eslint/no-namespace */
import type { Streamable } from "./types";

import { resolveDeep } from "./resolve";
import { isInStreamingContext } from "./stream";

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

      if (!hasChildFunction) {
        // When no function children, preserve the streamable in streaming context
        if (isInStreamingContext()) {
          return rawResult as Awaited<TOutput>;
        }
        // Outside streaming context, resolve the value
        return await rawResult.value;
      }

      if (isInStreamingContext()) {
        // In streaming context, pass the streamable to children function
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-function-type
        const childrenResult = await (children as Function)(rawResult);
        const resolvedResult = await resolveDeep(childrenResult);
        return resolvedResult as Awaited<TOutput>;
      } else {
        // Outside streaming context, resolve the value first
        const resolvedValue = await rawResult.value;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-function-type
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
    if (isStreamable<TOutput>(result) && isInStreamingContext()) {
      return result as Awaited<TOutput>;
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
