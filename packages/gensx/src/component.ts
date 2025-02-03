import type {
  DeepJSXElement,
  GsxComponent,
  GsxStreamComponent,
  MaybePromise,
  Streamable,
} from "./types";

import { getCurrentContext } from "./context";
import { JSX } from "./jsx-runtime";
import { resolveDeep } from "./resolve";

export const STREAMING_PLACEHOLDER = "[streaming in progress]";

export interface ComponentOpts {
  secretProps?: string[]; // Property paths to mask in checkpoints
  secretOutputs?: boolean; // Whether to mask the output of the component
  name?: string; // Allows you to override the name of the component
}

// omit name from ComponentOpts
export type DefaultOpts = Omit<ComponentOpts, "name">;

export type WithComponentOpts<P> = P & {
  componentOpts?: ComponentOpts;
};

function replaceAsyncIterables(value: unknown): unknown {
  // Handle async iterables
  if (value && typeof value === "object" && Symbol.asyncIterator in value) {
    return "[stream]";
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => replaceAsyncIterables(item));
  }

  // Handle objects (but not null)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, replaceAsyncIterables(v)]),
    );
  }

  // Pass through everything else
  return value;
}

export function Component<P, O>(
  name: string,
  fn: (props: P) => MaybePromise<O | DeepJSXElement<O> | JSX.Element>,
  defaultOpts?: DefaultOpts,
): GsxComponent<WithComponentOpts<P>, O> {
  const GsxComponent: GsxComponent<WithComponentOpts<P>, O> = async props => {
    const context = getCurrentContext();
    const workflowContext = context.getWorkflowContext();
    const { checkpointManager } = workflowContext;

    // Merge component opts with unique secrets
    const mergedOpts = {
      ...defaultOpts,
      ...props.componentOpts,
      secretProps: Array.from(
        new Set([
          ...(defaultOpts?.secretProps ?? []),
          ...(props.componentOpts?.secretProps ?? []),
        ]),
      ),
      secretOutputs:
        defaultOpts?.secretOutputs ?? props.componentOpts?.secretOutputs,
    };

    // Create checkpoint node for this component execution
    const nodeId = checkpointManager.addNode(
      {
        componentName: props.componentOpts?.name ?? name,
        props: Object.fromEntries(
          Object.entries(props).filter(([key]) => key !== "children"),
        ),
        componentOpts: mergedOpts,
      },
      context.getCurrentNodeId(),
    );

    try {
      const result = await context.withNodeScope(nodeId, () => {
        const { componentOpts, ...componentProps } = props;
        return resolveDeep(fn(componentProps as P));
      });

      // Replace any streams with placeholders before checkpointing
      // TODO: https://github.com/gensx-inc/gensx/issues/220 - need to fork streams to capture outputs in checkpoints
      const checkpointValue = replaceAsyncIterables(result);
      checkpointManager.completeNode(nodeId, checkpointValue);

      return result;
    } catch (error) {
      // Record error in checkpoint
      if (error instanceof Error) {
        checkpointManager.addMetadata(nodeId, { error: error.message });
        checkpointManager.completeNode(nodeId, undefined);
      }
      throw error;
    }
  };

  if (name) {
    Object.defineProperty(GsxComponent, "name", {
      value: name,
    });
  }

  return GsxComponent;
}

export function StreamComponent<P>(
  name: string,
  fn: (props: P) => MaybePromise<Streamable | JSX.Element>,
  defaultOpts?: DefaultOpts,
): GsxStreamComponent<WithComponentOpts<P>> {
  const GsxStreamComponent: GsxStreamComponent<
    WithComponentOpts<P>
  > = async props => {
    const context = getCurrentContext();
    const workflowContext = context.getWorkflowContext();
    const { checkpointManager } = workflowContext;

    // Merge component opts with unique secrets
    const mergedOpts = {
      ...defaultOpts,
      ...props.componentOpts,
      secretProps: Array.from(
        new Set([
          ...(defaultOpts?.secretProps ?? []),
          ...(props.componentOpts?.secretProps ?? []),
        ]),
      ),
      secretOutputs:
        defaultOpts?.secretOutputs ?? props.componentOpts?.secretOutputs,
    };

    // Create checkpoint node for this component execution
    const nodeId = checkpointManager.addNode(
      {
        componentName: props.componentOpts?.name ?? name,
        props: Object.fromEntries(
          Object.entries(props).filter(([key]) => key !== "children"),
        ),
        componentOpts: mergedOpts,
      },
      context.getCurrentNodeId(),
    );

    try {
      const iterator: Streamable = await context.withNodeScope(nodeId, () => {
        const { componentOpts, ...componentProps } = props;
        return resolveDeep(fn(componentProps as P));
      });

      if (props.stream) {
        // Mark as streaming immediately
        checkpointManager.completeNode(nodeId, STREAMING_PLACEHOLDER);

        // Create a wrapper iterator that captures the output while streaming
        const wrappedIterator = async function* () {
          let accumulated = "";
          try {
            for await (const token of iterator) {
              accumulated += token;
              yield token;
            }
            // Update with final content if stream completes
            checkpointManager.updateNode(nodeId, {
              output: accumulated,
              metadata: { streamCompleted: true },
            });
          } catch (error) {
            if (error instanceof Error) {
              checkpointManager.updateNode(nodeId, {
                output: accumulated,
                metadata: {
                  error: error.message,
                  streamCompleted: false,
                },
              });
            }
            throw error;
          }
        };
        return wrappedIterator();
      }

      // Non-streaming case - accumulate all output then checkpoint
      let result = "";
      for await (const token of iterator) {
        result += token;
      }
      checkpointManager.completeNode(nodeId, result);
      return result;
    } catch (error) {
      // Record error in checkpoint
      if (error instanceof Error) {
        checkpointManager.addMetadata(nodeId, { error: error.message });
        checkpointManager.completeNode(nodeId, undefined);
      }
      throw error;
    }
  };

  if (name) {
    Object.defineProperty(GsxStreamComponent, "name", {
      value: name,
    });
  }

  return GsxStreamComponent;
}
