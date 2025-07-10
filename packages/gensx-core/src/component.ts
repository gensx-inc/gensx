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

import { ExecutionNode, STREAMING_PLACEHOLDER } from "./checkpoint-types.js";
import {
  ExecutionContext,
  getContextSnapshot,
  getCurrentContext,
  getCurrentNodeCheckpointManager,
  RunInContext,
  withContext,
} from "./context.js";
import { generateNodeId } from "./utils/nodeId.js";
import { InputRequest, WorkflowExecutionContext } from "./workflow-context.js";
import { WorkflowMessageListener } from "./workflow-state.js";

export { STREAMING_PLACEHOLDER };

// Helper function to extract path from enhanced ID format: "path:contentHash:callIndex"
function extractPathFromId(nodeId: string): string {
  if (nodeId.includes(":")) {
    return nodeId.split(":")[0] ?? "";
  }
  // Fallback for legacy IDs - return the ID as-is
  return nodeId;
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
    const parentNode = context.getCurrentNode();

    // Get resolved options for checkpointing, including name (runtime props > decorator > function name)
    const resolvedComponentOpts = getResolvedOpts(
      componentOpts,
      runtimeOpts,
      name,
    );
    const componentName = resolvedComponentOpts.name;

    if (!componentName) {
      throw new Error(
        "Internal error: Component name could not be determined.",
      );
    }

    // Enhanced ID generation: Calculate parent path and call index
    const parentPath = parentNode?.id ? extractPathFromId(parentNode.id) : "";

    // Use call counter from checkpoint manager for unique callIndex
    const callIndex = checkpointManager.getNextCallIndex(
      parentPath,
      componentName,
      props as Record<string, unknown>,
      resolvedComponentOpts.idPropsKeys,
    );

    // Generate the node ID
    const nodeId = generateNodeId(
      componentName,
      props as Record<string, unknown>,
      resolvedComponentOpts.idPropsKeys,
      parentPath,
      callIndex,
    );

    // Check checkpoint for existing result
    const cachedResult = checkpointManager.getNodeFromCheckpoint(nodeId);
    if (cachedResult.found && cachedResult.node.completed) {
      const { node } = cachedResult;
      console.debug(`[Replay] Using cached result for ${name} (${nodeId})`);

      // Add the cached subtree to the new checkpoint being built
      checkpointManager.addCachedSubtreeToCheckpoint(node, parentNode);

      return deserializeResult<R>(node.output);
    }

    function onComplete() {
      workflowContext.sendWorkflowMessage({
        type: "component-end",
        componentName: componentName ?? "",
        componentId: nodeId,
      });
      resolvedComponentOpts.onComplete?.();
    }

    const node = checkpointManager.addNode(
      {
        id: nodeId,
        componentName: componentName,
        props: props as Record<string, unknown>,
        componentOpts: resolvedComponentOpts,
      },
      parentNode,
      {
        // Do not update the checkpoint if we are adding an existing node that has not finished yet.
        // This prevents "resetting" the checkpoint and rebuilding it on the server side (causing the visualization to reset when we do human in the loop or input requests).
        skipCheckpointUpdate: cachedResult.found,
      },
    );

    if (resolvedComponentOpts.metadata) {
      checkpointManager.addMetadata(node, resolvedComponentOpts.metadata);
    }

    function handleResultValue(
      value: unknown,
      runInContext: RunInContext,
      wrapInPromise: boolean,
    ) {
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
            wrapInPromise,
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
            wrapInPromise,
          },
        );

        return streamingResult;
      }

      onComplete();
      checkpointManager.completeNode(node, value, {
        wrapInPromise,
      });
      return value;
    }

    try {
      // TODO: Don't emit this when rerunning the workflow with a partial checkpoint.
      let runInContext: RunInContext;
      workflowContext.sendWorkflowMessage({
        type: "component-start",
        componentName: componentName,
        componentId: nodeId,
      });
      const result = context.withCurrentNode(node, () => {
        runInContext = getContextSnapshot();
        return target((props ?? {}) as P);
      });

      if (result instanceof Promise) {
        return result
          .then((value) => handleResultValue(value, runInContext, true))
          .catch((error: unknown) => {
            handleError(node, error, workflowContext, true);
            throw error;
          }) as R;
      }

      return handleResultValue(result, runInContext!, false) as R;
    } catch (error) {
      handleError(node, error, workflowContext, false);
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

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function deserializeResult<R>(result: unknown): R {
  if (!result) {
    return result as R;
  }

  if (
    typeof result === "object" &&
    "__gensxSerialized" in result &&
    result.__gensxSerialized &&
    "type" in result &&
    typeof result.type === "string" &&
    "value" in result
  ) {
    console.info("deserializing result", { type: result.type });
    switch (result.type) {
      case "async-iterator":
      case "readable-stream":
        const stream = new ReadableStream({
          start(controller) {
            if (Array.isArray(result.value)) {
              for (const item of result.value) {
                console.info("enqueueing item", { item });
                controller.enqueue(item);
              }
            } else {
              controller.enqueue(result.value);
            }
            controller.close();
          },
        }) as R;
        Object.defineProperty(stream, "__gensxDeserializedStream", {
          value: true,
        });
        return stream;
      case "promise":
        return Promise.resolve(deserializeResult(result.value)) as R;
      default:
        console.warn("[GenSX] Unknown serialized result type: ", result.type);
        return deserializeResult(result.value);
    }
  }

  if (Array.isArray(result)) {
    return result.map(deserializeResult) as R;
  }

  if (typeof result === "object" && !ArrayBuffer.isView(result)) {
    return Object.fromEntries(
      Object.entries(result).map(([key, value]) => [
        key,
        deserializeResult(value),
      ]),
    ) as R;
  }

  return result as R;
}

function handleError(
  node: ExecutionNode,
  error: unknown,
  workflowContext: WorkflowExecutionContext,
  wrapInPromise: boolean,
) {
  const serializedError = serializeError(error);
  workflowContext.checkpointManager.addMetadata(node, {
    error: serializedError,
  });
  workflowContext.checkpointManager.completeNode(node, undefined, {
    wrapInPromise,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(error as any).__gensxErrorEventEmitted) {
    workflowContext.sendWorkflowMessage({
      type: "error",
      error: JSON.stringify(serializedError),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error as any).__gensxErrorEventEmitted = true;
  }
}

type WorkflowRuntimeOpts = WorkflowOpts & {
  workflowExecutionId?: string;
  messageListener?: WorkflowMessageListener;
  checkpoint?: ExecutionNode;
  printUrl?: boolean;
  onRequestInput?: (request: InputRequest) => Promise<void>;
  onRestoreCheckpoint?: (
    node: ExecutionNode,
    feedback: unknown,
  ) => Promise<void>;
  /**
   * Optional reference to capture the pending updates promise, that ensures that all traces are sent to the server after completion.
   * If provided, the workflow will set this reference to the promise
   * that resolves when all checkpoint updates are complete.
   * If not provided, the workflow will wait for pending updates before returning.
   *
   * @example
   * ```typescript
   * const pendingUpdatesRef = { value: undefined };
   * const result = await workflow(props, { pendingUpdatesRef });
   * // result is available immediately
   * await pendingUpdatesRef.value; // wait for checkpoint updates
   * ```
   */
  pendingUpdatesRef?: { value?: Promise<void> };
};

export function Workflow<P extends object = {}, R = unknown>(
  name: string,
  target: (props: P) => R,
  workflowOpts?: WorkflowOpts,
): (props?: P, runtimeOpts?: WorkflowRuntimeOpts) => Promise<Awaited<R>> {
  const WorkflowFn = async (
    props?: P,
    runtimeOpts?: WorkflowRuntimeOpts,
  ): Promise<Awaited<R>> => {
    const context = new ExecutionContext({}, undefined, {
      messageListener: runtimeOpts?.messageListener,
      onRequestInput: runtimeOpts?.onRequestInput,
      onRestoreCheckpoint: runtimeOpts?.onRestoreCheckpoint,
      checkpoint: runtimeOpts?.checkpoint,
    });
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
      // TODO: Don't emit this when rerunning the workflow
      workflowContext.sendWorkflowMessage({
        type: "start",
        workflowExecutionId: runtimeOpts?.workflowExecutionId,
        workflowName,
      });

      const result = await withContext(context, () =>
        component(props, {
          ...runtimeOpts,
          onComplete: () => {
            workflowContext.sendWorkflowMessage({
              type: "end",
            });
          },
        }),
      );

      const root = workflowContext.checkpointManager.root;
      if (root) {
        if (workflowOpts?.metadata) {
          workflowContext.checkpointManager.addMetadata(
            root,
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
      if (runtimeOpts?.pendingUpdatesRef) {
        runtimeOpts.pendingUpdatesRef.value =
          workflowContext.checkpointManager.waitForPendingUpdates();
      } else {
        await workflowContext.checkpointManager.waitForPendingUpdates();
      }
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
    wrapInPromise,
  }: {
    streamKey?: string;
    aggregator?: (chunks: unknown[]) => unknown;
    fullValue: unknown;
    onComplete: () => void;
    wrapInPromise: boolean;
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
      wrapInPromise,
    });
  }
  const iterator = iterable[Symbol.asyncIterator]();
  const wrappedIterator = captureAsyncIterator(iterator, runInContext, {
    streamKey,
    aggregator,
    fullValue,
    onComplete,
    wrapInPromise,
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
    wrapInPromise,
  }: {
    streamKey?: string;
    aggregator: (chunks: unknown[]) => unknown;
    fullValue: unknown;
    onComplete: () => void;
    wrapInPromise: boolean;
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
                completeNode(
                  {
                    ...(fullValue as Record<string, unknown>),
                    [streamKey]: {
                      __gensxSerialized: true,
                      type: "readable-stream",
                      value: aggregatedValue,
                    },
                  },
                  { wrapInPromise },
                );
              } else {
                completeNode(
                  {
                    __gensxSerialized: true,
                    type: "readable-stream",
                    value: aggregatedValue,
                  },
                  { wrapInPromise },
                );
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
                const value = {
                  ...(fullValue as Record<string, unknown>),
                  [streamKey]: {
                    __gensxSerialized: true,
                    type: "readable-stream",
                    value: aggregatedValue,
                  },
                };
                updateNode({
                  output: wrapInPromise
                    ? {
                        __gensxSerialized: true,
                        type: "promise",
                        value,
                      }
                    : value,
                });
              } else {
                const value = {
                  __gensxSerialized: true,
                  type: "readable-stream",
                  value: aggregatedValue,
                };
                updateNode({
                  output: wrapInPromise
                    ? {
                        __gensxSerialized: true,
                        type: "promise",
                        value,
                      }
                    : value,
                });
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
          completeNode(
            {
              ...(fullValue as Record<string, unknown>),
              [streamKey]: {
                __gensxSerialized: true,
                type: "readable-stream",
                value: aggregatedValue,
              },
            },
            { wrapInPromise },
          );
        } else {
          completeNode(
            {
              __gensxSerialized: true,
              type: "readable-stream",
              value: aggregatedValue,
            },
            { wrapInPromise },
          );
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
          completeNode(
            {
              __gensxSerialized: true,
              type: "readable-stream",
              value: aggregator(chunks),
            },
            { wrapInPromise },
          );
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
    wrapInPromise,
  }: {
    streamKey?: string;
    aggregator: (chunks: unknown[]) => unknown;
    fullValue: unknown;
    onComplete: () => void;
    wrapInPromise: boolean;
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
        console.info("got async iterator value", { value, done });
        if (done) {
          const { completeNode } = getCurrentNodeCheckpointManager();
          const aggregatedValue = aggregator(chunks);
          if (streamKey) {
            completeNode(
              {
                ...(fullValue as Record<string, unknown>),
                [streamKey]: {
                  __gensxSerialized: true,
                  type: "async-iterator",
                  value: aggregatedValue,
                },
              },
              { wrapInPromise },
            );
          } else {
            completeNode(
              {
                __gensxSerialized: true,
                type: "async-iterator",
                value: aggregatedValue,
              },
              { wrapInPromise },
            );
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
            const value = {
              ...(fullValue as Record<string, unknown>),
              [streamKey]: {
                __gensxSerialized: true,
                type: "async-iterator",
                value: aggregatedValue,
              },
            };
            updateNode({
              output: wrapInPromise
                ? {
                    __gensxSerialized: true,
                    type: "promise",
                    value,
                  }
                : value,
            });
          } else {
            const value = {
              __gensxSerialized: true,
              type: "async-iterator",
              value: aggregatedValue,
            };
            updateNode({
              output: wrapInPromise
                ? {
                    __gensxSerialized: true,
                    type: "promise",
                    value,
                  }
                : value,
            });
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
    const { completeNode, addMetadata, node } =
      getCurrentNodeCheckpointManager();
    console.info("completing node due to error at stream end", {
      node,
      streamKey,
    });
    addMetadata({ error: serializeError(e) });
    const aggregatedValue = aggregator(chunks);
    if (streamKey) {
      completeNode(
        {
          ...(fullValue as Record<string, unknown>),
          [streamKey]: {
            __gensxSerialized: true,
            type: "async-iterator",
            value: aggregatedValue,
          },
        },
        { wrapInPromise },
      );
    } else {
      completeNode(
        {
          __gensxSerialized: true,
          type: "async-iterator",
          value: aggregatedValue,
        },
        { wrapInPromise },
      );
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
