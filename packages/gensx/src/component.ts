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

export function Component<P, O>(
  name: string,
  fn: (props: P) => MaybePromise<O | DeepJSXElement<O> | JSX.Element>,
): GsxComponent<P, O> {
  const GsxComponent: GsxComponent<P, O> = async props => {
    const context = getCurrentContext();
    const workflowContext = context.getWorkflowContext();
    const { checkpointManager } = workflowContext;

    // Create checkpoint node for this component execution
    // only async due to dynamic import, but otherwise non-blocking
    const nodeId = await checkpointManager.addNode(
      {
        componentName: name,
        props: Object.fromEntries(
          Object.entries(props).filter(([key]) => key !== "children"),
        ),
      },
      context.getCurrentNodeId(),
    );

    try {
      const result = await context.withCurrentNode(nodeId, () =>
        resolveDeep(fn(props)),
      );

      // Complete the checkpoint node with the result
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
    Object.defineProperty(GsxComponent, "name", {
      value: name,
    });
  }

  return GsxComponent;
}

export function StreamComponent<P>(
  name: string,
  fn: (props: P) => MaybePromise<Streamable | JSX.Element>,
): GsxStreamComponent<P> {
  const GsxStreamComponent: GsxStreamComponent<P> = async props => {
    const context = getCurrentContext();
    const workflowContext = context.getWorkflowContext();
    const { checkpointManager } = workflowContext;

    // Create checkpoint node for this component execution
    const nodeId = await checkpointManager.addNode(
      {
        componentName: name,
        props: Object.fromEntries(
          Object.entries(props).filter(([key]) => key !== "children"),
        ),
      },
      context.getCurrentNodeId(),
    );

    try {
      const iterator: Streamable = await context.withCurrentNode(nodeId, () =>
        resolveDeep(fn(props)),
      );

      if (props.stream) {
        // Create a wrapper iterator that captures the output while streaming
        const wrappedIterator = async function* () {
          let accumulated = "";
          try {
            for await (const token of iterator) {
              accumulated += token;
              yield token;
            }
            // Complete the checkpoint with accumulated output
            checkpointManager.completeNode(nodeId, accumulated);
          } catch (error) {
            if (error instanceof Error) {
              checkpointManager.addMetadata(nodeId, { error: error.message });
              checkpointManager.completeNode(nodeId, accumulated);
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

  const component = GsxStreamComponent;
  return component;
}
