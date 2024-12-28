/* eslint-disable @typescript-eslint/no-namespace */
import type { Streamable } from "./types";

import { resolveDeep } from "./resolve";
import { isInStreamingContext } from "./stream";
import { getCurrentContext } from "./context";

export namespace JSX {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type ElementType = (props: any) => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
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
    const parentContext = getCurrentContext();
    console.log("jsx runtime - component entry:", {
      componentName: component.name,
      isStreamComponent:
        "isStreamComponent" in component &&
        component.isStreamComponent === true,
      parentContext: parentContext.getContextInfo(),
      inStreamingContext: isInStreamingContext(),
    });

    // Execute component
    const rawResult = await component(props ?? ({} as TProps));
    const currentContext = getCurrentContext();
    console.log("jsx runtime - after execution:", {
      componentName: component.name,
      contextBeforeExecution: parentContext.getContextInfo(),
      contextAfterExecution: currentContext.getContextInfo(),
      hadStreamingChild: currentContext !== parentContext,
      isStreamable: isStreamable(rawResult),
    });

    // If this is a streaming result, handle it specially
    if (isStreamable<TOutput>(rawResult)) {
      const hasChildFunction = typeof children === "function";

      if (!hasChildFunction) {
        // When no function children, preserve the streamable if we're in a streaming context
        // or if we had a streaming child
        const shouldPreserveStream =
          isInStreamingContext() || currentContext.hadStreamingInChain();
        if (shouldPreserveStream) {
          console.log("jsx runtime - preserving streamable:", {
            reason: isInStreamingContext()
              ? "in streaming context"
              : "had streaming child",
            contextInfo: currentContext.getContextInfo(),
            parentContextInfo: parentContext.getContextInfo(),
          });
          return rawResult as Awaited<TOutput>;
        }
        // Outside streaming context, resolve the value
        console.log("jsx runtime - resolving streamable:", {
          reason: "outside streaming context",
          contextInfo: currentContext.getContextInfo(),
          parentContextInfo: parentContext.getContextInfo(),
        });
        return await rawResult.value;
      }

      if (isInStreamingContext() || currentContext.hadStreamingInChain()) {
        // In streaming context or had streaming child, pass the streamable to children function
        console.log(
          "jsx runtime - passing streamable to children in streaming context",
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-function-type
        const childrenResult = await (children as Function)(rawResult);
        const resolvedResult = await resolveDeep(childrenResult);
        return resolvedResult as Awaited<TOutput>;
      } else {
        // Outside streaming context, resolve the value first
        console.log(
          "jsx runtime - resolving value for children outside streaming context",
        );
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
    if (isStreamable<TOutput>(result)) {
      console.log("jsx runtime - checking streamable after deep resolution:", {
        inStreamingContext: isInStreamingContext(),
        hasStream: typeof result.stream === "function",
        result,
      });
      if (isInStreamingContext()) {
        return result as Awaited<TOutput>;
      }
      // Outside streaming context, resolve the value
      return (await result.value) as Awaited<TOutput>;
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
