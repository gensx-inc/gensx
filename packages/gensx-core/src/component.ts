import type {
  ComponentOpts as OriginalComponentOpts,
  DefaultOpts,
  GsxComponent,
  GsxStreamComponent,
  MaybePromise,
  Streamable,
} from "./types.js";

import serializeErrorPkg from "@common.js/serialize-error";
const { serializeError } = serializeErrorPkg;

import { getCurrentContext } from "./context.js";

export const STREAMING_PLACEHOLDER = "[streaming in progress]";

// Decorator-based Component Model

export interface DecoratorComponentOpts extends DefaultOpts {
  name?: string;
}

function getResolvedOpts(
  decoratorOpts?: DecoratorComponentOpts | string,
  callTimeOpts?: OriginalComponentOpts,
  functionName?: string,
): OriginalComponentOpts {
  const decoratorName =
    typeof decoratorOpts === "string" ? decoratorOpts : decoratorOpts?.name;

  // Prioritize names: callTimeOpts.name > decoratorName > functionName
  let name = callTimeOpts?.name ?? decoratorName ?? functionName;

  const baseOpts =
    typeof decoratorOpts === "string" ? {} : (decoratorOpts ?? {});

  const merged: OriginalComponentOpts = {
    ...callTimeOpts,
    ...baseOpts,
    name,
    metadata: {
      ...callTimeOpts?.metadata,
      ...baseOpts.metadata,
    },
    secretProps: Array.from(
      new Set([
        ...(callTimeOpts?.secretProps ?? []),
        ...(baseOpts.secretProps ?? []),
      ]),
    ),
    secretOutputs: baseOpts.secretOutputs ?? callTimeOpts?.secretOutputs,
  };

  return merged;
}

export function Component(decoratorOpts?: DecoratorComponentOpts | string) {
  return function <P extends object, R>(
    target: (props: P) => MaybePromise<R>,
    _context: ClassMethodDecoratorContext | ClassAccessorDecoratorContext,
  ): GsxComponent<P, R> {
    // Name for the function object itself (e.g., for display, stack traces)
    // Priority: decorator explicit name > target function's actual name.
    const componentFunctionObjectName =
      (typeof decoratorOpts === "string"
        ? decoratorOpts
        : decoratorOpts?.name) ?? target.name;
    if (!componentFunctionObjectName) {
      throw new Error(
        "Component name must be provided either via decorator options or by naming the function.",
      );
    }

    const ComponentFn = async (
      props: P & { componentOpts?: OriginalComponentOpts },
    ): Promise<R> => {
      const context = getCurrentContext();
      const workflowContext = context.getWorkflowContext();
      const { checkpointManager } = workflowContext;
      const currentNodeId = context.getCurrentNodeId();

      // Get resolved options for checkpointing, including name (runtime props > decorator > function name)
      const resolvedComponentOpts = getResolvedOpts(
        decoratorOpts,
        props.componentOpts,
        target.name,
      );
      const checkpointName = resolvedComponentOpts.name; // This should now be definitively set by getResolvedOpts

      if (!checkpointName) {
        // Should not happen if getResolvedOpts guarantees a name
        throw new Error(
          "Internal error: Component checkpoint name could not be determined.",
        );
      }

      const nodeId = checkpointManager.addNode(
        {
          componentName: checkpointName,
          props: Object.fromEntries(
            Object.entries(props).filter(
              ([key]) => key !== "children" && key !== "componentOpts",
            ),
          ),
          componentOpts: resolvedComponentOpts,
        },
        currentNodeId,
      );

      try {
        const result = await context.withCurrentNode(nodeId, async () => {
          const { componentOpts, ...componentProps } = props;
          return target(componentProps as P);
        });
        checkpointManager.completeNode(nodeId, result);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          checkpointManager.addMetadata(nodeId, {
            error: serializeError(error),
          });
          checkpointManager.completeNode(nodeId, undefined);
        }
        throw error;
      }
    };

    Object.defineProperty(ComponentFn, "name", {
      value: componentFunctionObjectName,
      configurable: true,
    });
    Object.defineProperty(ComponentFn, "__gsxFramework", {
      value: true,
      configurable: true,
    });

    type ComponentFunctionWithRun = typeof ComponentFn & {
      run: (
        runProps: P & { componentOpts?: OriginalComponentOpts },
      ) => Promise<R>;
    };

    (ComponentFn as ComponentFunctionWithRun).run = (
      runProps: P & { componentOpts?: OriginalComponentOpts },
    ): Promise<R> => {
      return ComponentFn(runProps);
    };

    return ComponentFn as unknown as GsxComponent<P, R>;
  };
}

export function StreamComponent(
  decoratorOpts?: DecoratorComponentOpts | string,
) {
  return function <P extends object>(
    target: (props: P & { stream?: boolean }) => MaybePromise<Streamable>,
    _context: ClassMethodDecoratorContext | ClassAccessorDecoratorContext,
  ): GsxStreamComponent<P & { stream?: boolean }> {
    const componentFunctionObjectName =
      (typeof decoratorOpts === "string"
        ? decoratorOpts
        : decoratorOpts?.name) ?? target.name;
    if (!componentFunctionObjectName) {
      throw new Error(
        "StreamComponent name must be provided either via decorator options or by naming the function.",
      );
    }

    const StreamComponentFn = async (
      props: P & { stream?: boolean; componentOpts?: OriginalComponentOpts },
    ): Promise<Streamable | string> => {
      const context = getCurrentContext();
      const workflowContext = context.getWorkflowContext();
      const { checkpointManager } = workflowContext;
      const currentNodeId = context.getCurrentNodeId();

      const resolvedComponentOpts = getResolvedOpts(
        decoratorOpts,
        props.componentOpts,
        target.name,
      );
      const checkpointName = resolvedComponentOpts.name;

      if (!checkpointName) {
        // Should not happen
        throw new Error(
          "Internal error: StreamComponent checkpoint name could not be determined.",
        );
      }

      const nodeId = checkpointManager.addNode(
        {
          componentName: checkpointName,
          props: Object.fromEntries(
            Object.entries(props).filter(
              ([key]) =>
                key !== "children" &&
                key !== "componentOpts" &&
                key !== "stream",
            ),
          ),
          componentOpts: resolvedComponentOpts,
        },
        currentNodeId,
      );

      try {
        const iterator = await context.withCurrentNode(nodeId, async () => {
          const { componentOpts, ...componentProps } = props;
          return target(componentProps as P & { stream?: boolean });
        });

        if (props.stream) {
          checkpointManager.completeNode(nodeId, STREAMING_PLACEHOLDER);
          const wrappedIterator = async function* () {
            let accumulated = "";
            try {
              for await (const token of iterator) {
                accumulated += String(token);
                yield token;
              }
              checkpointManager.updateNode(nodeId, {
                output: accumulated,
                metadata: { streamCompleted: true },
              });
            } catch (error) {
              if (error instanceof Error) {
                checkpointManager.updateNode(nodeId, {
                  output: accumulated,
                  metadata: {
                    error: serializeError(error),
                    streamCompleted: false,
                  },
                });
              }
              throw error;
            }
          };
          return wrappedIterator();
        } else {
          let result = "";
          for await (const token of iterator) {
            result += String(token);
          }
          checkpointManager.completeNode(nodeId, result);
          return result;
        }
      } catch (error) {
        if (error instanceof Error) {
          checkpointManager.addMetadata(nodeId, {
            error: serializeError(error),
          });
          checkpointManager.completeNode(nodeId, undefined);
        }
        throw error;
      }
    };

    Object.defineProperty(StreamComponentFn, "name", {
      value: componentFunctionObjectName,
      configurable: true,
    });
    Object.defineProperty(StreamComponentFn, "__gsxFramework", {
      value: true,
      configurable: true,
    });
    Object.defineProperty(StreamComponentFn, "__gsxStreamComponent", {
      value: true,
      configurable: true,
    });

    type StreamComponentFunctionWithRun = typeof StreamComponentFn & {
      run: <
        T extends P & {
          stream?: boolean;
          componentOpts?: OriginalComponentOpts;
        },
      >(
        runProps: T,
      ) => Promise<T extends { stream: true } ? Streamable : string>;
    };

    (StreamComponentFn as StreamComponentFunctionWithRun).run = <
      T extends P & { stream?: boolean; componentOpts?: OriginalComponentOpts },
    >(
      runProps: T,
    ): Promise<T extends { stream: true } ? Streamable : string> => {
      return StreamComponentFn(runProps) as Promise<
        T extends { stream: true } ? Streamable : string
      >;
    };

    return StreamComponentFn as unknown as GsxStreamComponent<
      P & { stream?: boolean }
    >;
  };
}

export function Workflow(decoratorOpts?: DecoratorComponentOpts | string) {
  return Component(decoratorOpts);
}
