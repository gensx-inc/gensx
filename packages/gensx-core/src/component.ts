/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { setTimeout } from "timers/promises";

import type {
  ComponentOpts,
  ComponentOpts as OriginalComponentOpts,
  DecoratorComponentOpts,
  DecoratorWorkflowOpts, WorkflowOpts
} from "./types.js";

import serializeErrorPkg from "@common.js/serialize-error";
const { serializeError } = serializeErrorPkg;


import { ExecutionContext, getContextSnapshot, getCurrentContext, getCurrentNodeCheckpointManager, RunInContext, withContext } from "./context.js";

export const STREAMING_PLACEHOLDER = "[streaming in progress]";

// Decorator-based Component Model

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

export function Component(decoratorOpts?: DecoratorComponentOpts) {
  return function <P extends object, R>(
    target: (props: P) => R,
    context?:
      | ClassMethodDecoratorContext
      | ClassAccessorDecoratorContext
      | ClassFieldDecoratorContext
      | ClassDecoratorContext,
  ): (props: P) => R extends Promise<infer U> ? U : R {
    // Only wrap class methods
    if (context && context.kind !== "method") {
      console.warn("Component decorator can only be applied to class methods.");
      return target as (props: P) => R extends Promise<infer U> ? U : R;
    }

    return createComponent(target, decoratorOpts) as (props: P) => R extends Promise<infer U> ? U : R;
  };
}

export function Workflow(decoratorOpts?: DecoratorWorkflowOpts) {
  return function <P extends object, R>(
    target: (props: P) => R,
    context?:
      | ClassMethodDecoratorContext
      | ClassAccessorDecoratorContext
      | ClassDecoratorContext
      | ClassFieldDecoratorContext,
  ): (props: P) => R extends Promise<infer U> ? U : R {
    // Only wrap class methods
    if (context && context.kind !== "method") {
      console.warn("Workflow decorator can only be applied to class methods.");
      return target as (props: P) => R extends Promise<infer U> ? U : R;
    }

    return createWorkflow(target, decoratorOpts) as (props: P) => R extends Promise<infer U> ? U : R;
  };
}

export function createComponent<P extends object, R>(
  target: (props: P) => R,
  componentOpts?: ComponentOpts | string,
) {
  // Name for the function object itself (e.g., for display, stack traces)
  // Priority: decorator explicit name > target function's actual name.
  const componentFunctionObjectName =
    typeof componentOpts === "string"
      ? componentOpts
      : (componentOpts?.name ?? target.name);
  if (!componentFunctionObjectName) {
    throw new Error(
      "Component name must be provided either via options or by naming the function.",
    );
  }

  const ComponentFn = (
    props: P,
    runtimeOpts?: ComponentOpts,
  ): R => {
    const context = getCurrentContext();
    const workflowContext = context.getWorkflowContext();
    const { checkpointManager } = workflowContext;
    const currentNodeId = context.getCurrentNodeId();

    // Get resolved options for checkpointing, including name (runtime props > decorator > function name)
    const resolvedComponentOpts = getResolvedOpts(
      componentOpts,
      runtimeOpts,
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

    if (resolvedComponentOpts.metadata) {
      checkpointManager.addMetadata(nodeId, resolvedComponentOpts.metadata);
    }

    function handleResultValue(value: unknown, runInContext: RunInContext) {
      if (!Array.isArray(value) &&
        typeof value === "object" &&
        value != null &&
        resolvedComponentOpts.__streamingResultKey !== undefined &&
        (isAsyncIterable(
          (value as Record<string, unknown>)[resolvedComponentOpts.__streamingResultKey]
        ) || isReadableStream(
          (value as Record<string, unknown>)[resolvedComponentOpts.__streamingResultKey]
        ))) {
        const streamingResult = captureAsyncGenerator(
          (value as Record<string, unknown>)[resolvedComponentOpts.__streamingResultKey] as AsyncIterable<unknown>,
          runInContext,
          { streamKey: resolvedComponentOpts.__streamingResultKey, aggregator: resolvedComponentOpts.aggregator, fullValue: value },
        );

        (value as Record<string, unknown>)[resolvedComponentOpts.__streamingResultKey] = streamingResult;
        return value;
      }

      if (isAsyncIterable(value) || isReadableStream(value)) {
        const streamingResult = captureAsyncGenerator(
          value as AsyncIterable<unknown>,
          runInContext,
          { aggregator: resolvedComponentOpts.aggregator, fullValue: value },
        );

        return streamingResult;
      }

      checkpointManager.completeNode(nodeId, value);
      return value;
    }


    try {
      let runInContext: RunInContext;
      const result = context.withCurrentNode(nodeId, () => {
        runInContext = getContextSnapshot();
        return target(props);
      });

      if (result instanceof Promise) {
        return result.then((value) => {
          return handleResultValue(value, runInContext);
        }) as R;
      }

      return handleResultValue(result, runInContext!) as R;
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
  Object.defineProperty(ComponentFn, "__gensxComponent", {
    value: true,
  });

  return ComponentFn;
}

export function createWorkflow<P extends object, R>(
  target: (props: P) => R,
  workflowOpts?: WorkflowOpts | string,
): (props: P) => Promise<Awaited<R>> {
  // Use the overridden name from componentOpts if provided
  const configuredWorkflowName =
    typeof workflowOpts === "string"
      ? workflowOpts
      : (workflowOpts?.name ?? target.name);

  const WorkflowFn = async (props: P, runtimeOpts?: WorkflowOpts): Promise<Awaited<R>> => {
    const context = new ExecutionContext({});
    await context.init();

    const defaultPrintUrl = !Boolean(process.env.CI);

    const workflowContext = context.getWorkflowContext();
    workflowContext.checkpointManager.setPrintUrl(
      (runtimeOpts?.printUrl ?? typeof workflowOpts === "string")
        ? defaultPrintUrl
        : (workflowOpts?.printUrl ?? defaultPrintUrl),
    );

    const workflowName = runtimeOpts?.name ?? configuredWorkflowName;
    if (!workflowName) {
      throw new Error(
        "Workflow name must be provided either via options or by naming the function.",
      );
    }

    workflowContext.checkpointManager.setWorkflowName(workflowName);

    const component = createComponent(target);

    try {
      const result = await withContext(context, () => component(props, runtimeOpts));

      const rootId = workflowContext.checkpointManager.root?.id;
      if (rootId) {
        if (typeof workflowOpts !== "string" && workflowOpts?.metadata) {
          workflowContext.checkpointManager.addMetadata(
            rootId,
            workflowOpts.metadata,
          );
        }
      } else {
        console.warn(
          "No root checkpoint found for workflow after execution",
          workflowName,
        );
      }

      return result;
    } finally {
      await workflowContext.checkpointManager.waitForPendingUpdates();
    }
  };

  Object.defineProperty(WorkflowFn, "name", {
    value: configuredWorkflowName,
    configurable: true,
  });
  Object.defineProperty(WorkflowFn, "__gensxWorkflow", {
    value: true,
  });

  return WorkflowFn;
}

function captureAsyncGenerator(
  iterable: AsyncIterable<unknown>,
  runInContext: RunInContext,
  { streamKey, aggregator, fullValue }: { streamKey?: string, aggregator?: (chunks: unknown[]) => unknown, fullValue: unknown },
) {
  aggregator ??= (chunks: unknown[]) => {
    // Assume if the first chunk is a string, we're streaming text
    if (typeof chunks[0] === "string") {
      return chunks.join("");
    }
    return chunks;
  }

  if (isReadableStream(iterable)) {
    return captureReadableStream(iterable, runInContext, { streamKey, aggregator, fullValue });
  }
  const iterator = iterable[Symbol.asyncIterator]();
  const wrappedIterator = captureAsyncIterator(iterator, runInContext, { streamKey, aggregator, fullValue });
  iterable[Symbol.asyncIterator] = () => wrappedIterator;
  return iterable;
}

function captureReadableStream(
  stream: ReadableStream<unknown>,
  runInContext: (fn: (...args: unknown[]) => unknown) => unknown,
  { streamKey, aggregator, fullValue }: { streamKey?: string, aggregator: (chunks: unknown[]) => unknown, fullValue: unknown },
) {
  const reader = stream.getReader();
  let done = false;
  const chunks: unknown[] = [];

  let lastUpdateNodeCall = performance.now();
  const capturedStream = new ReadableStream({
    async start(controller) {
      try {

        while (!done) {
          await runInContext(async () => {
            const result = await reader.read();
            if (result.done) {
              done = true;
              const { completeNode } = getCurrentNodeCheckpointManager();
              const aggregatedValue = aggregator(chunks);
              if (streamKey) {
                (fullValue as Record<string, unknown>)[streamKey] = aggregatedValue;
                completeNode(fullValue);
              } else {
                completeNode(aggregatedValue);
              }
              controller.close();
              return;
            }
            chunks.push(result.value);
            // Only update the node every 200ms to avoid hammering the server
            if (performance.now() - lastUpdateNodeCall > 200) {
              await setTimeout(1000);
              const { updateNode } = getCurrentNodeCheckpointManager();
              const aggregatedValue = aggregator(chunks);
              if (streamKey) {
                (fullValue as Record<string, unknown>)[streamKey] = aggregatedValue;
                updateNode({ output: fullValue });
              } else {
                updateNode({ output: aggregatedValue });
              }
              lastUpdateNodeCall = performance.now();
            }
            controller.enqueue(result.value as ArrayBufferView);
          });
        }
      } catch (e) {
        const { completeNode, addMetadata } = getCurrentNodeCheckpointManager();
        addMetadata({ error: serializeError(e) });
        const aggregatedValue = aggregator(chunks);
        if (streamKey) {
          (fullValue as Record<string, unknown>)[streamKey] = aggregatedValue;
          completeNode(fullValue);
        } else {
          completeNode(aggregatedValue);
        }
        throw e;
      }
    },
    cancel(reason) {
      runInContext(() => {
        if (!done) {
          const { completeNode, addMetadata } = getCurrentNodeCheckpointManager();
          addMetadata({ cancelled: true });
          completeNode(aggregator(chunks));
        }
        return reader.cancel(reason);
      });
    },
  });

  return capturedStream;
}

async function* captureAsyncIterator(
  iterator: AsyncIterator<unknown, unknown, undefined>,
  runInContext: RunInContext,
  { streamKey, aggregator, fullValue }: { streamKey?: string, aggregator: (chunks: unknown[]) => unknown, fullValue: unknown },
) {
  const chunks: unknown[] = [];

  let lastUpdateNodeCall = performance.now();
  try {
    let isDone = false;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (!isDone) {
      const value = await runInContext(async () => {
        const { value, done } = await iterator.next();
        if (done) {
          const { completeNode } = getCurrentNodeCheckpointManager();
          const aggregatedValue = aggregator(chunks);
          if (streamKey) {
            (fullValue as Record<string, unknown>)[streamKey] = aggregatedValue;
            completeNode(fullValue);
          } else {
            completeNode(aggregatedValue);
          }
          isDone = true;
          return;
        }
        chunks.push(value);
        // Only update the node every 200ms to avoid hammering the server
        if (performance.now() - lastUpdateNodeCall > 200) {
          const { updateNode } = getCurrentNodeCheckpointManager();
          const aggregatedValue = aggregator(chunks);
          if (streamKey) {
            (fullValue as Record<string, unknown>)[streamKey] = aggregatedValue;
            updateNode({ output: fullValue });
          } else {
            updateNode({ output: aggregatedValue });
          }
          lastUpdateNodeCall = performance.now();
        }
        return value;
      });

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (isDone) {
        break;
      }

      yield value;
    }
  } catch (e) {
    const { completeNode, addMetadata } = getCurrentNodeCheckpointManager();
    addMetadata({ error: serializeError(e) });
    const aggregatedValue = aggregator(chunks);
    if (streamKey) {
      (fullValue as Record<string, unknown>)[streamKey] = aggregatedValue;
      completeNode(fullValue);
    } else {
      completeNode(aggregatedValue);
    }
    throw e;
  }
}

export const isReadableStream = (x: unknown): x is ReadableStream =>
  x != null &&
  typeof x === "object" &&
  "getReader" in x &&
  typeof x.getReader === "function";

export const isAsyncIterable = (x: unknown): x is AsyncIterable<unknown> =>
  x != null &&
  typeof x === "object" &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeof (x as any)[Symbol.asyncIterator] === "function";
