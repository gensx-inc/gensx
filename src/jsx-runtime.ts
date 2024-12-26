/* eslint-disable @typescript-eslint/no-namespace */
import { resolveDeep } from "./resolve";
import { isInStreamingContext } from "./stream";
import type { Streamable } from "./types";

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
    // Execute component
    const rawResult = await component(props ?? ({} as TProps));

    // If this is a streaming result, handle it specially
    if (isStreamable<TOutput>(rawResult)) {
      if (!children) {
        // When no children, return the value to be resolved later
        return rawResult.value as Promise<Awaited<TOutput>>;
      }
      if (isInStreamingContext()) {
        // In streaming context, pass the streamable to children and return their result
        // No need to await the value here - the stream completion is sufficient
        const childrenResult = await children(rawResult);
        const resolvedResult = await resolveDeep(childrenResult);
        return resolvedResult as Awaited<TOutput>;
      } else {
        // Outside streaming context, resolve the value first
        const resolvedValue = await rawResult.value;
        const childrenResult = await children(resolvedValue as TOutput);
        const resolvedResult = await resolveDeep(childrenResult);
        return resolvedResult as Awaited<TOutput>;
      }
    }

    // For non-streaming results, resolve deeply
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
      const resolvedResult = await resolveDeep(childrenResult);
      return resolvedResult as Awaited<TOutput>;
    }

    // Handle single child (Fragment edge case)
    const resolvedResult = await resolveDeep(children);
    return resolvedResult as Awaited<TOutput>;
  })();
};

export const jsxs = jsx;
