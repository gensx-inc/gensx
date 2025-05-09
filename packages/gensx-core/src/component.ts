/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  BoundGsxComponent,
  BoundGsxStreamComponent,
  ComponentOpts,
  DeepJSXElement,
  DefaultOpts,
  ExecutableValue,
  GsxComponent,
  GsxStreamComponent,
  MaybePromise,
  Streamable,
} from "./types.js";

import serializeErrorPkg from "@common.js/serialize-error";
const { serializeError } = serializeErrorPkg;

import { ExecutionContext, getCurrentContext, withContext } from "./context.js";
import { JSX, jsx } from "./jsx-runtime.js";
import { resolveDeep } from "./resolve.js";

export const STREAMING_PLACEHOLDER = "[streaming in progress]";

export function Component<P extends object & { length?: never }, O>(
  name: string,
  fn: (props: P) => MaybePromise<O | DeepJSXElement<O> | JSX.Element>,
  defaultOpts?: DefaultOpts,
): GsxComponent<P, O> {
  const GsxComponentFn = async (
    runtimeProps: P & { componentOpts?: ComponentOpts },
    boundProps?: Partial<P>,
  ) => {
    if (
      typeof runtimeProps !== "object" ||
      Array.isArray(runtimeProps) ||
      runtimeProps === null
    ) {
      throw new Error(`Component ${name} received non-object props.`);
    }

    const { componentOpts: runtimeComponentOpts, ...restRuntimeProps } =
      runtimeProps;
    const props = { ...boundProps, ...restRuntimeProps } as P;

    const context = getCurrentContext();
    const workflowContext = context.getWorkflowContext();
    const { checkpointManager } = workflowContext;
    const parentNodeId = context.getCurrentNodeId();

    const mergedOpts: ComponentOpts = {
      ...defaultOpts,
      ...runtimeComponentOpts,
      metadata: {
        ...defaultOpts?.metadata,
        ...runtimeComponentOpts?.metadata,
      },
      secretProps: Array.from(
        new Set([
          ...(defaultOpts?.secretProps ?? []),
          ...(runtimeComponentOpts?.secretProps ?? []),
        ]),
      ),
      secretOutputs:
        defaultOpts?.secretOutputs ?? runtimeComponentOpts?.secretOutputs,
      providers: [
        ...(defaultOpts?.providers ?? []),
        ...(runtimeComponentOpts?.providers ?? []),
      ],
    };

    let currentExecutionContext = context;
    let nodeId: string | undefined = undefined;

    try {
      const providers = mergedOpts.providers;
      if (providers && providers.length > 0) {
        for (const providerElement of providers) {
          let nextExecutionContext: ExecutionContext;
          if (typeof providerElement === "function") {
            const jsxElement = providerElement as (
              props: Record<string, unknown>,
            ) => Promise<unknown>;
            nextExecutionContext = await withContext(
              currentExecutionContext,
              async (): Promise<ExecutionContext> => {
                const result = await jsxElement({});
                if (result instanceof ExecutionContext) {
                  return result;
                } else {
                  const errorMsg = `JSX Provider element did not resolve to an ExecutionContext. Resolved value: ${JSON.stringify(result)}`;
                  console.error(errorMsg);
                  throw new Error(errorMsg);
                }
              },
            );
          } else {
            console.warn("Invalid provider type encountered:", providerElement);
            nextExecutionContext = currentExecutionContext;
          }
          currentExecutionContext = nextExecutionContext;
        }
      }

      nodeId = checkpointManager.addNode(
        {
          componentName: runtimeComponentOpts?.name ?? name,
          props: Object.fromEntries(
            Object.entries(props).filter(([key]) => key !== "children"),
          ),
          componentOpts: mergedOpts,
        },
        parentNodeId,
      );

      const result = await currentExecutionContext.withCurrentNode(
        nodeId,
        async () => {
          const fnResult = await fn(props);
          return resolveDeep<O | DeepJSXElement<O> | ExecutableValue<O>>(
            fnResult,
          );
        },
      );

      checkpointManager.completeNode(nodeId, result);
      return result;
    } catch (error) {
      if (nodeId && error instanceof Error) {
        checkpointManager.addMetadata(nodeId, { error: serializeError(error) });
        checkpointManager.completeNode(nodeId, undefined);
      } else if (!nodeId && error instanceof Error) {
        console.error(
          `Error in component ${name} before node creation:`,
          error,
        );
      }
      throw error;
    }
  };

  // --- Add .props() method --- GsxComponentFn
  (GsxComponentFn as GsxComponent<P, O>).props = (
    newBoundProps: Partial<P>,
  ): BoundGsxComponent<P, O> => {
    const BoundComponentFn = async (runtimeProps: {
      componentOpts?: ComponentOpts;
    }) => {
      return GsxComponentFn(runtimeProps as any, newBoundProps);
    };

    Object.defineProperty(BoundComponentFn, "name", {
      value: name,
      configurable: true,
    });
    Object.defineProperty(BoundComponentFn, "__gsxFramework", {
      value: true,
      configurable: true,
    });
    // Define the .run method for the bound component
    (BoundComponentFn as unknown as BoundGsxComponent<P, O>).run = (
      runProps?: Omit<P, keyof P> & { componentOpts?: ComponentOpts },
    ): Promise<O> => {
      const finalProps = { ...newBoundProps, ...(runProps ?? {}) };
      return jsx(
        BoundComponentFn as any,
        finalProps as P & { componentOpts?: ComponentOpts },
      )() as Promise<O>;
    };

    // Define the .props method for the *new* bound component (chaining)
    (BoundComponentFn as unknown as BoundGsxComponent<P, O>).props = (
      furtherBoundProps: Partial<P>,
    ): BoundGsxComponent<P, O> => {
      const combinedBoundProps = { ...newBoundProps, ...furtherBoundProps };
      return (GsxComponentFn as GsxComponent<P, O>).props(combinedBoundProps);
    };

    // Copy necessary internal properties (may need refinement based on Omit behavior)
    (BoundComponentFn as any).__brand = "gensx-component";
    (BoundComponentFn as any).__outputType = (
      GsxComponentFn as any
    ).__outputType;
    (BoundComponentFn as any).__rawProps = (GsxComponentFn as any).__rawProps;

    return BoundComponentFn as unknown as BoundGsxComponent<P, O>;
  };

  // --- Original GsxComponentFn setup ---
  (GsxComponentFn as GsxComponent<P, O>).run = (
    runProps: P & { componentOpts?: ComponentOpts },
  ): Promise<O> => {
    return jsx(GsxComponentFn as any, runProps)() as Promise<O>;
  };
  if (name) {
    Object.defineProperty(GsxComponentFn, "name", { value: name });
  }
  Object.defineProperty(GsxComponentFn, "__gsxFramework", { value: true });
  return GsxComponentFn as unknown as GsxComponent<P, O>;
}

export function StreamComponent<P extends object & { length?: never }>(
  name: string,
  fn: (
    props: P & { stream?: boolean },
  ) => MaybePromise<Streamable | JSX.Element>,
  defaultOpts?: DefaultOpts,
): GsxStreamComponent<P & { stream?: boolean }> {
  const GsxStreamComponentFn = async (
    runtimeProps: P & { stream?: boolean; componentOpts?: ComponentOpts },
    boundProps?: Partial<P>,
  ) => {
    if (
      typeof runtimeProps !== "object" ||
      Array.isArray(runtimeProps) ||
      runtimeProps === null
    ) {
      throw new Error(`Component ${name} received non-object props.`);
    }

    const {
      stream,
      componentOpts: runtimeComponentOpts,
      ...restRuntimeProps
    } = runtimeProps;
    const { stream: _boundStream, ...restBoundProps } = (boundProps ??
      {}) as P & { stream?: boolean };
    const props = { ...restBoundProps, ...restRuntimeProps, stream } as P & {
      stream?: boolean;
    };

    const context = getCurrentContext();
    const workflowContext = context.getWorkflowContext();
    const { checkpointManager } = workflowContext;
    const parentNodeId = context.getCurrentNodeId();

    const mergedOpts: ComponentOpts = {
      ...defaultOpts,
      ...runtimeComponentOpts,
      metadata: {
        ...defaultOpts?.metadata,
        ...runtimeComponentOpts?.metadata,
      },
      secretProps: Array.from(
        new Set([
          ...(defaultOpts?.secretProps ?? []),
          ...(runtimeComponentOpts?.secretProps ?? []),
        ]),
      ),
      secretOutputs:
        defaultOpts?.secretOutputs ?? runtimeComponentOpts?.secretOutputs,
      providers: [
        ...(defaultOpts?.providers ?? []),
        ...(runtimeComponentOpts?.providers ?? []),
      ],
    };

    let currentExecutionContext = context;
    let nodeId: string | undefined = undefined;

    try {
      const providers = mergedOpts.providers;
      if (providers && providers.length > 0) {
        for (const providerElement of providers) {
          let nextExecutionContext: ExecutionContext;
          if (typeof providerElement === "function") {
            const jsxElement = providerElement as (
              props: Record<string, unknown>,
            ) => Promise<unknown>;
            nextExecutionContext = await withContext(
              currentExecutionContext,
              async (): Promise<ExecutionContext> => {
                const result = await jsxElement({});
                if (result instanceof ExecutionContext) {
                  return result;
                } else {
                  const errorMsg = `JSX Provider element did not resolve to an ExecutionContext. Resolved value: ${JSON.stringify(result)}`;
                  console.error(errorMsg);
                  throw new Error(errorMsg);
                }
              },
            );
          } else {
            console.warn("Invalid provider type encountered:", providerElement);
            nextExecutionContext = currentExecutionContext;
          }
          currentExecutionContext = nextExecutionContext;
        }
      }

      nodeId = checkpointManager.addNode(
        {
          componentName: runtimeComponentOpts?.name ?? name,
          props: Object.fromEntries(
            Object.entries(props).filter(
              ([key]) => key !== "children" && key !== "stream",
            ),
          ),
          componentOpts: mergedOpts,
        },
        parentNodeId,
      );

      const iterator: Streamable =
        await currentExecutionContext.withCurrentNode(nodeId, () => {
          return resolveDeep(fn(props));
        });

      if (props.stream) {
        checkpointManager.completeNode(nodeId, STREAMING_PLACEHOLDER);
        const wrappedIterator = async function* () {
          let accumulated = "";
          try {
            for await (const token of iterator) {
              accumulated += token;
              yield token;
            }
            if (nodeId) {
              checkpointManager.updateNode(nodeId, {
                output: accumulated,
                metadata: { streamCompleted: true },
              });
            }
          } catch (streamError) {
            if (streamError instanceof Error) {
              if (nodeId) {
                checkpointManager.updateNode(nodeId, {
                  output: accumulated,
                  metadata: {
                    error: streamError.message,
                    streamCompleted: false,
                  },
                });
              } else {
                console.error(
                  "Stream error occurred but nodeId was undefined.",
                  streamError,
                );
              }
            }
            throw streamError;
          }
        };
        return wrappedIterator();
      }

      let result = "";
      for await (const token of iterator) {
        result += token;
      }
      checkpointManager.completeNode(nodeId, result);
      return result;
    } catch (error) {
      if (nodeId && error instanceof Error) {
        checkpointManager.addMetadata(nodeId, { error: serializeError(error) });
        checkpointManager.completeNode(nodeId, undefined);
      } else if (!nodeId && error instanceof Error) {
        console.error(
          `Error in stream component ${name} before node creation:`,
          error,
        );
      }
      throw error;
    }
  };

  // --- Add .props() method --- GsxStreamComponentFn
  (GsxStreamComponentFn as GsxStreamComponent<P>).props = (
    newBoundProps: Partial<P>,
  ): BoundGsxStreamComponent<P & { stream?: boolean }> => {
    const BoundStreamComponentFn = async (runtimeProps: {
      stream?: boolean;
      componentOpts?: ComponentOpts;
    }) => {
      return GsxStreamComponentFn(runtimeProps as any, newBoundProps);
    };

    Object.defineProperty(BoundStreamComponentFn, "name", {
      value: name,
      configurable: true,
    });
    Object.defineProperty(BoundStreamComponentFn, "__gsxFramework", {
      value: true,
      configurable: true,
    });
    Object.defineProperty(BoundStreamComponentFn, "__gsxStreamComponent", {
      value: true,
      configurable: true,
    });

    // Define the .run method for the bound stream component
    (BoundStreamComponentFn as unknown as BoundGsxStreamComponent<P>).run = <
      T extends Omit<P, keyof P> & {
        stream?: boolean;
        componentOpts?: ComponentOpts;
      },
    >(
      runProps: T,
    ): Promise<T extends { stream: true } ? Streamable : string> => {
      const finalProps = { ...newBoundProps, ...runProps };
      return jsx(
        BoundStreamComponentFn as any,
        finalProps as unknown as P & {
          stream?: boolean;
          componentOpts?: ComponentOpts;
        },
      )() as Promise<T extends { stream: true } ? Streamable : string>;
    };

    // Define the .props method for the *new* bound component (chaining)
    (BoundStreamComponentFn as unknown as BoundGsxStreamComponent<P>).props = (
      furtherBoundProps: Partial<P>,
    ): BoundGsxStreamComponent<P & { stream?: boolean }> => {
      const combinedBoundProps = { ...newBoundProps, ...furtherBoundProps };
      return (GsxStreamComponentFn as GsxStreamComponent<P>).props(
        combinedBoundProps,
      );
    };

    // Copy necessary internal properties (may need refinement based on Omit behavior)
    (BoundStreamComponentFn as any).__brand = "gensx-stream-component";
    (BoundStreamComponentFn as any).__outputType = (
      GsxStreamComponentFn as any
    ).__outputType;
    (BoundStreamComponentFn as any).__rawProps = (
      GsxStreamComponentFn as any
    ).__rawProps;

    return BoundStreamComponentFn as unknown as BoundGsxStreamComponent<
      P & { stream?: boolean }
    >;
  };

  // --- Original GsxStreamComponentFn setup ---
  (GsxStreamComponentFn as GsxStreamComponent<P>).run = <
    T extends P & { stream?: boolean; componentOpts?: ComponentOpts },
  >(
    runProps: T,
  ): Promise<T extends { stream: true } ? Streamable : string> => {
    return jsx(GsxStreamComponentFn as any, runProps)() as Promise<
      T extends { stream: true } ? Streamable : string
    >;
  };

  if (name) {
    Object.defineProperty(GsxStreamComponentFn, "name", { value: name });
  }
  Object.defineProperty(GsxStreamComponentFn, "__gsxFramework", {
    value: true,
  });
  Object.defineProperty(GsxStreamComponentFn, "__gsxStreamComponent", {
    value: true,
  });
  return GsxStreamComponentFn as unknown as GsxStreamComponent<
    P & { stream?: boolean }
  >;
}
