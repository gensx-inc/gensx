/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */


import type {
  ComponentOpts,
  ComponentOpts as OriginalComponentOpts,
  DecoratorComponentOpts,
  WorkflowOpts,
} from "./types.js";

import serializeErrorPkg from "@common.js/serialize-error";
const { serializeError } = serializeErrorPkg;

import {
  ExecutionContext,
  getContextSnapshot,
  getCurrentContext,
  getCurrentNodeCheckpointManager,
  RunInContext,
  withContext,
} from "./context.js";
import { ProgressListener } from "./workflow-context.js";

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
    ...baseOpts,
    ...callTimeOpts,
    name,
    metadata: {
      ...baseOpts.metadata,
      ...callTimeOpts?.metadata,
    },
    secretProps: Array.from(
      new Set([
        ...(baseOpts.secretProps ?? []),
        ...(callTimeOpts?.secretProps ?? []),
      ]),
    ),
    secretOutputs: baseOpts.secretOutputs ?? callTimeOpts?.secretOutputs,
  };

  return merged;
}

export function Component<P extends object = {}, R = unknown>(
  name: string,
  target: (props: P) => R,
  componentOpts?: ComponentOpts,
): (props?: P, runtimeOpts?: ComponentOpts) => R {
  const ComponentFn = (
    props?: P,
    runtimeOpts?: ComponentOpts & { onComplete?: () => void },
  ): R => {
    const context = getCurrentContext();
    const workflowContext = context.getWorkflowContext();
    const { checkpointManager } = workflowContext;
    const currentNodeId = context.getCurrentNodeId();

    // Get resolved options for checkpointing, including name (runtime props > decorator > function name)
    const resolvedComponentOpts = getResolvedOpts(
      componentOpts,
      runtimeOpts,
      name,
    );
    const checkpointName = resolvedComponentOpts.name;

    if (!checkpointName) {
      throw new Error(
        "Internal error: Component checkpoint name could not be determined.",
      );
    }

    function onComplete() {
      workflowContext.progressListener({
        type: "component-end",
        componentName: checkpointName ?? "",
        componentId: nodeId,
      });
      resolvedComponentOpts.onComplete?.();
    }

    const nodeId = checkpointManager.addNode(
      {
        componentName: checkpointName,
        props: props
          ? Object.fromEntries(
              Object.entries(props).filter(
                ([key]) => key !== "children" && key !== "componentOpts",
              ),
            )
          : {},
        componentOpts: resolvedComponentOpts,
      },
      currentNodeId,
    );

    if (resolvedComponentOpts.metadata) {
      checkpointManager.addMetadata(nodeId, resolvedComponentOpts.metadata);
    }

    function handleResultValue(value: unknown, runInContext: RunInContext) {
      if (
        !Array.isArray(value) &&
        typeof value === "object" &&
        value != null &&
        resolvedComponentOpts.__streamingResultKey !== undefined &&
        (isAsyncIterable(
          (value as Record<string, unknown>)[
            resolvedComponentOpts.__streamingResultKey
          ],
        ) ||
          isReadableStream(
            (value as Record<string, unknown>)[
              resolvedComponentOpts.__streamingResultKey
            ],
          ))
      ) {
        const streamingResult = captureAsyncGenerator(
          (value as Record<string, unknown>)[
            resolvedComponentOpts.__streamingResultKey
          ] as AsyncIterable<unknown>,
          runInContext,
          {
            streamKey: resolvedComponentOpts.__streamingResultKey,
            aggregator: resolvedComponentOpts.aggregator,
            fullValue: value,
            onComplete,
          },
        );

        try {
          (value as Record<string, unknown>)[
            resolvedComponentOpts.__streamingResultKey
          ] = streamingResult;
        } catch {
          // Can't always set the streaming result key, so carry on.
        }

        return value;
      }

      if (isAsyncIterable(value) || isReadableStream(value)) {
        const streamingResult = captureAsyncGenerator(
          value as AsyncIterable<unknown>,
          runInContext,
          {
            aggregator: resolvedComponentOpts.aggregator,
            fullValue: value,
            onComplete,
          },
        );

        return streamingResult;
      }

      workflowContext.progressListener({
        type: "component-end",
        componentName: checkpointName ?? "",
        componentId: nodeId,
      });
      resolvedComponentOpts.onComplete?.();
      checkpointManager.completeNode(nodeId, value);
      return value;
    }

    try {
      let runInContext: RunInContext;
      workflowContext.progressListener({
        type: "component-start",
        componentName: checkpointName,
        componentId: nodeId,
      });
      const result = context.withCurrentNode(nodeId, () => {
        runInContext = getContextSnapshot();
        return target((props ?? {}) as P);
      });

      if (result instanceof Promise) {
        return result
          .then((value) => {
            return handleResultValue(value, runInContext);
          })
          .catch((error: unknown) => {
            if (error instanceof Error) {
              checkpointManager.addMetadata(nodeId, {
                error: serializeError(error),
              });
              checkpointManager.completeNode(nodeId, undefined);
              workflowContext.progressListener({
                type: "error",
                error: JSON.stringify(serializeError(error)),
              });
            }
            throw error;
          }) as R;
      }

      return handleResultValue(result, runInContext!) as R;
    } catch (error) {
      if (error instanceof Error) {
        checkpointManager.addMetadata(nodeId, {
          error: serializeError(error),
        });
        checkpointManager.completeNode(nodeId, undefined);
        workflowContext.progressListener({
          type: "error",
          error: JSON.stringify(serializeError(error)),
        });
      }
      throw error;
    }
  };

  Object.defineProperty(ComponentFn, "name", {
    value: name,
    configurable: true,
  });
  Object.defineProperty(ComponentFn, "__gensxComponent", {
    value: true,
  });

  return ComponentFn;
}

export function Workflow<P extends object = {}, R = unknown>(
  name: string,
  target: (props: P) => R,
  workflowOpts?: WorkflowOpts,
): (
  props?: P,
  runtimeOpts?: WorkflowOpts & {
    workflowExecutionId?: string;
    progressListener?: ProgressListener;
  },
) => Promise<Awaited<R>> {
  const WorkflowFn = async (
    props?: P,
    runtimeOpts?: WorkflowOpts & {
      workflowExecutionId?: string;
      progressListener?: ProgressListener;
    },
  ): Promise<Awaited<R>> => {
    const context = new ExecutionContext(
      {},
      undefined,
      runtimeOpts?.progressListener,
    );
    await context.init();

    const resolvedOpts = {
      ...(typeof workflowOpts === "string" ? {} : workflowOpts),
      ...runtimeOpts,
      metadata: {
        ...workflowOpts?.metadata,
        ...runtimeOpts?.metadata,
      },
    };

    const workflowContext = context.getWorkflowContext();
    workflowContext.checkpointManager.setPrintUrl(
      resolvedOpts.printUrl ?? false,
    );

    const workflowName = name;
    if (!workflowName) {
      throw new Error(
        "Workflow name must be provided either via options or by naming the function.",
      );
    }

    workflowContext.checkpointManager.setWorkflowName(workflowName);

    const component = Component<P, R>(name, target);

    try {
      workflowContext.progressListener({
        type: "start",
        workflowExecutionId: runtimeOpts?.workflowExecutionId,
        workflowName,
      });

      const result = await withContext(context, () =>
        component(props, {
          ...runtimeOpts,
          onComplete: () => {
            workflowContext.progressListener({
              type: "end",
            });
          },
        }),
      );

      const rootId = workflowContext.checkpointManager.root?.id;
      if (rootId) {
        if (workflowOpts?.metadata) {
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
    value: name,
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
  {
    streamKey,
    aggregator,
    fullValue,
    onComplete,
  }: {
    streamKey?: string;
    aggregator?: (chunks: unknown[]) => unknown;
    fullValue: unknown;
    onComplete: () => void;
  },
) {
  aggregator ??= (chunks: unknown[]) => {
    // Assume if the first chunk is a string, we're streaming text
    if (typeof chunks[0] === "string") {
      return chunks.join("");
    }
    return chunks;
  };

  if (isReadableStream(iterable)) {
    return captureReadableStream(iterable, runInContext, {
      streamKey,
      aggregator,
      fullValue,
      onComplete,
    });
  }
  const iterator = iterable[Symbol.asyncIterator]();
  const wrappedIterator = captureAsyncIterator(iterator, runInContext, {
    streamKey,
    aggregator,
    fullValue,
    onComplete,
  });
  iterable[Symbol.asyncIterator] = () => wrappedIterator;
  return iterable;
}

function captureReadableStream(
  stream: ReadableStream<unknown>,
  runInContext: (fn: (...args: unknown[]) => unknown) => unknown,
  {
    streamKey,
    aggregator,
    fullValue,
    onComplete,
  }: {
    streamKey?: string;
    aggregator: (chunks: unknown[]) => unknown;
    fullValue: unknown;
    onComplete: () => void;
  },
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
                completeNode({
                  ...(fullValue as Record<string, unknown>),
                  [streamKey]: aggregatedValue,
                });
              } else {
                completeNode(aggregatedValue);
              }
              onComplete();
              controller.close();
              return;
            }
            chunks.push(result.value);
            // Only update the node every 200ms to avoid hammering the server
            if (performance.now() - lastUpdateNodeCall > 200) {
              const { updateNode } = getCurrentNodeCheckpointManager();
              const aggregatedValue = aggregator(chunks);
              if (streamKey) {
                updateNode({
                  output: {
                    ...(fullValue as Record<string, unknown>),
                    [streamKey]: aggregatedValue,
                  },
                });
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
          completeNode({
            ...(fullValue as Record<string, unknown>),
            [streamKey]: aggregatedValue,
          });
        } else {
          completeNode(aggregatedValue);
        }
        throw e;
      }
    },
    cancel(reason) {
      runInContext(() => {
        if (!done) {
          const { completeNode, addMetadata } =
            getCurrentNodeCheckpointManager();
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
  {
    streamKey,
    aggregator,
    fullValue,
    onComplete,
  }: {
    streamKey?: string;
    aggregator: (chunks: unknown[]) => unknown;
    fullValue: unknown;
    onComplete: () => void;
  },
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
            completeNode({
              ...(fullValue as Record<string, unknown>),
              [streamKey]: aggregatedValue,
            });
          } else {
            completeNode(aggregatedValue);
          }
          isDone = true;
          onComplete();
          return;
        }
        chunks.push(value);
        // Only update the node every 200ms to avoid hammering the server
        if (performance.now() - lastUpdateNodeCall > 200) {
          const { updateNode } = getCurrentNodeCheckpointManager();
          const aggregatedValue = aggregator(chunks);
          if (streamKey) {
            updateNode({
              output: {
                ...(fullValue as Record<string, unknown>),
                [streamKey]: aggregatedValue,
              },
            });
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
      completeNode({
        ...(fullValue as Record<string, unknown>),
        [streamKey]: aggregatedValue,
      });
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
