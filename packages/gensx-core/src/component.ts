/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import type {
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

// Define interfaces including the .props method
interface GsxComponentWithProps<P, O> extends GsxComponent<P, O> {
  props: (boundProps: Partial<P>) => GsxComponentWithProps<P, O>;
  // run is already part of GsxComponent
}

interface GsxStreamComponentWithProps<P> extends GsxStreamComponent<P> {
  props: (
    boundProps: Partial<P>,
  ) => GsxStreamComponentWithProps<P & { stream?: boolean }>;
  // run is already part of GsxStreamComponent
}

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

    const mergedOpts: ComponentOpts & { providers?: JSX.Element[] } = {
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
  (GsxComponentFn as GsxComponentWithProps<P, O>).props = (
    newBoundProps: Partial<P>,
  ): GsxComponentWithProps<P, O> => {
    const BoundComponentFn = async (
      runtimeProps: P & { componentOpts?: ComponentOpts },
    ) => {
      return GsxComponentFn(runtimeProps, newBoundProps);
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
    (BoundComponentFn as GsxComponentWithProps<P, O>).run = (
      runProps: P & { componentOpts?: ComponentOpts },
    ): Promise<O> => {
      const finalProps = { ...newBoundProps, ...runProps };
      // Cast BoundComponentFn to any for jsx call
      return jsx(BoundComponentFn, finalProps)() as Promise<O>;
    };

    // Define the .props method for the *new* bound component (chaining)
    (BoundComponentFn as GsxComponentWithProps<P, O>).props = (
      furtherBoundProps: Partial<P>,
    ): GsxComponentWithProps<P, O> => {
      const combinedBoundProps = { ...newBoundProps, ...furtherBoundProps };
      // Call the original .props method using cast
      return (GsxComponentFn as GsxComponentWithProps<P, O>).props(
        combinedBoundProps,
      );
    };

    // Brand the new component - return as the extended type
    return BoundComponentFn as unknown as GsxComponentWithProps<P, O>;
  };

  // --- Original GsxComponentFn setup ---
  (GsxComponentFn as GsxComponentWithProps<P, O>).run = (
    runProps: P & { componentOpts?: ComponentOpts },
  ): Promise<O> => {
    // Cast GsxComponentFn to any for jsx call
    return jsx(GsxComponentFn, runProps)() as Promise<O>;
  };
  if (name) {
    Object.defineProperty(GsxComponentFn, "name", { value: name });
  }
  Object.defineProperty(GsxComponentFn, "__gsxFramework", { value: true });
  // Return the function cast to the extended type initially
  return GsxComponentFn as unknown as GsxComponentWithProps<P, O>;
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

    const mergedOpts: ComponentOpts & { providers?: JSX.Element[] } = {
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
  (GsxStreamComponentFn as GsxStreamComponentWithProps<P>).props = (
    newBoundProps: Partial<P>,
  ): GsxStreamComponentWithProps<P & { stream?: boolean }> => {
    const BoundStreamComponentFn = async (
      runtimeProps: P & { stream?: boolean; componentOpts?: ComponentOpts },
    ) => {
      return GsxStreamComponentFn(runtimeProps, newBoundProps);
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
    (BoundStreamComponentFn as GsxStreamComponentWithProps<P>).run = <
      T extends P & { stream?: boolean; componentOpts?: ComponentOpts },
    >(
      runProps: T,
    ): Promise<T extends { stream: true } ? Streamable : string> => {
      const finalProps = { ...newBoundProps, ...runProps };
      // Cast BoundStreamComponentFn to any for jsx call
      return jsx(BoundStreamComponentFn, finalProps)() as Promise<
        T extends { stream: true } ? Streamable : string
      >;
    };

    // Define the .props method for the *new* bound component (chaining)
    (BoundStreamComponentFn as GsxStreamComponentWithProps<P>).props = (
      furtherBoundProps: Partial<P>,
    ): GsxStreamComponentWithProps<P & { stream?: boolean }> => {
      const combinedBoundProps = { ...newBoundProps, ...furtherBoundProps };
      // Call original .props method using cast
      return (GsxStreamComponentFn as GsxStreamComponentWithProps<P>).props(
        combinedBoundProps,
      );
    };

    // Brand the new component - return as the extended type
    return BoundStreamComponentFn as unknown as GsxStreamComponentWithProps<
      P & { stream?: boolean }
    >;
  };

  // --- Original GsxStreamComponentFn setup ---
  (GsxStreamComponentFn as GsxStreamComponentWithProps<P>).run = <
    T extends P & { stream?: boolean; componentOpts?: ComponentOpts },
  >(
    runProps: T,
  ): Promise<T extends { stream: true } ? Streamable : string> => {
    // Cast GsxStreamComponentFn to any for jsx call
    return jsx(GsxStreamComponentFn, runProps)() as Promise<
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
  // Return the function cast to the extended type initially
  return GsxStreamComponentFn as unknown as GsxStreamComponentWithProps<
    P & { stream?: boolean }
  >;
}
