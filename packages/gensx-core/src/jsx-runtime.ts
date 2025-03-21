/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ExecutionContext, getCurrentContext, withContext } from "./context.js";
import { ComponentProps } from "./index.js";
import { resolveDeep } from "./resolve.js";
import {
  ComponentOpts,
  ExecutableValue,
  GsxComponent,
  GsxStreamComponent,
  MaybePromise,
  Primitive,
  Streamable,
} from "./types.js";

export namespace JSX {
  export type ElementType = Element;
  export type Element = (
    props: ComponentProps<any, unknown>,
  ) => MaybePromise<unknown>;
  export interface ElementChildrenAttribute {
    children: (
      output: unknown,
    ) => JSX.Element | JSX.Element[] | Record<string, JSX.Element>;
  }
}

export const Fragment = (props: { children?: JSX.Element[] | JSX.Element }) => {
  if (!props.children) {
    return [];
  }
  if (Array.isArray(props.children)) {
    return props.children;
  }
  return [props.children];
};

(Fragment as any).__gsxFragment = true;

function jsx<TOutput, TProps>(
  component: GsxComponent<TProps, TOutput>,
  fullProps: ComponentProps<TProps, TOutput> | null,
): () => Promise<Awaited<TOutput> | Awaited<TOutput>[]>;
function jsx<TOutput, TProps extends { stream?: boolean }>(
  component: GsxStreamComponent<TProps>,
  fullProps:
    | (TProps & {
        componentOpts?: ComponentOpts;
        children?: TProps extends { stream: true }
          ?
              | ((
                  output: Streamable,
                ) => MaybePromise<ExecutableValue | Primitive>)
              | ((output: Streamable) => void)
              | ((output: Streamable) => Promise<void>)
          :
              | ((output: string) => MaybePromise<ExecutableValue | Primitive>)
              | ((output: string) => void)
              | ((output: string) => Promise<void>);
      })
    | null,
): () => Promise<Awaited<TOutput> | Awaited<TOutput>[]>;
function jsx<TOutput, TProps extends { stream?: boolean }>(
  component: GsxComponent<TProps, TOutput> | GsxStreamComponent<TProps>,
  fullProps:
    | (TProps & {
        componentOpts?: ComponentOpts;
        children?:
          | ((output: TOutput) => MaybePromise<ExecutableValue<TOutput>>)
          | ((output: TOutput) => void)
          | ((output: TOutput) => Promise<void>);
      })
    | null,
): () => Promise<Awaited<TOutput> | Awaited<TOutput>[]> {
  // Only set name if children is a function and doesn't already have our naming pattern
  if (
    fullProps?.children &&
    typeof fullProps.children === "function" &&
    fullProps.children.name &&
    !fullProps.children.name.startsWith("Children[")
  ) {
    Object.defineProperty(fullProps.children, "name", {
      value: `Children[${component.name}]`,
    });
  }

  // Return a promise that will be handled by execute()
  async function JsxWrapper(): Promise<Awaited<TOutput> | Awaited<TOutput>[]> {
    const context = getCurrentContext();

    // For Fragment, we need to pass the children through
    if ((component as any).__gsxFragment) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await component(fullProps as any);
      return await resolveDeep(result);
    }

    // For regular components, we handle children separately
    const { children, ...props } =
      fullProps ??
      ({} as TProps & {
        componentOpts?: ComponentOpts;
        children?:
          | ((output: TOutput) => MaybePromise<ExecutableValue<TOutput>>)
          | ((output: TOutput) => void)
          | ((output: TOutput) => Promise<void>);
      });
    const rawResult = await component(props as TProps);
    const result = await resolveDeep(rawResult);

    if (children) {
      const workflowContext = context.getWorkflowContext();
      const root = workflowContext.checkpointManager.root;
      const parentNodeId = root?.id;

      if (result instanceof ExecutionContext) {
        // rename to make the code more readable
        const executionContext = result;

        // withContext handles wrapping internally
        return await withContext(executionContext, async () => {
          const childResult = await resolveChildren(null as never, children);
          const resolvedChildResult = resolveDeep(childResult);

          // Call onComplete for the ExecutionContext, if specified, after all the children are done.
          await executionContext.onComplete?.();

          return resolvedChildResult as Awaited<TOutput> | Awaited<TOutput>[];
        });
      } else if (parentNodeId) {
        // withCurrentNode handles wrapping internally
        return await context.withCurrentNode(parentNodeId, async () => {
          const awaitedResult = await result;
          const childResult = await resolveChildren(
            awaitedResult as TOutput,
            children,
          );
          return resolveDeep(childResult);
        });
      } else {
        // No context available, just execute children directly
        const awaitedResult = await result;
        const childResult = await resolveChildren(
          awaitedResult as TOutput,
          children,
        );
        return await resolveDeep(childResult);
      }
    }
    return result as Awaited<TOutput> | Awaited<TOutput>[];
  }

  if (component.name) {
    Object.defineProperty(JsxWrapper, "name", {
      value: `JsxWrapper[${component.name}]`,
    });
  }

  Object.defineProperty(JsxWrapper, "__gsxFramework", {
    value: true,
  });

  return JsxWrapper;
}

export { jsx as jsx };
export const jsxs = jsx;

function resolveChildren<O>(
  output: O,
  children:
    | JSX.Element
    | JSX.Element[]
    | ((output: O) => MaybePromise<ExecutableValue | Primitive>)
    | ((output: O) => void)
    | ((output: O) => Promise<void>),
): MaybePromise<unknown> {
  if (typeof children === "function") {
    return children(output);
  }
  if (Array.isArray(children)) {
    return Promise.all(children.map((child) => child(output)));
  }
  // Single element case
  return (children as JSX.Element)(output);
}
