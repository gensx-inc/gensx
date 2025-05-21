import type {
  ComponentOpts as OriginalComponentOpts,
  DefaultOpts,
  MaybePromise,
} from "./types.js";

import serializeErrorPkg from "@common.js/serialize-error";
const { serializeError } = serializeErrorPkg;

import { ExecutionContext, getCurrentContext, withContext } from "./context.js";

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

export function Component(decoratorOpts?: DecoratorComponentOpts) {
  return function <P extends object, R>(
    target: (props: P) => MaybePromise<R>,
    _context?: ClassMethodDecoratorContext | ClassAccessorDecoratorContext,
  ): (props: P) => MaybePromise<R> {
    // Name for the function object itself (e.g., for display, stack traces)
    // Priority: decorator explicit name > target function's actual name.
    const componentFunctionObjectName = decoratorOpts?.name ?? target.name;
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
    Object.defineProperty(ComponentFn, "__gsxComponent", {
      value: true,
    });

    return ComponentFn;
  };
}

export function Workflow(
  decoratorOpts?: DecoratorComponentOpts & {
    printUrl?: boolean;
    metadata?: Record<string, unknown>;
  },
) {
  return function <P extends object, R>(
    target: (props: P) => MaybePromise<R>,
    _context?: ClassMethodDecoratorContext | ClassAccessorDecoratorContext,
  ): (props: P) => MaybePromise<R> {
    const WorkflowFn = async (props: P) => {
      const context = new ExecutionContext({});

      const workflowContext = context.getWorkflowContext();
      workflowContext.checkpointManager.setPrintUrl(
        decoratorOpts?.printUrl ?? false,
      );
      // Use the overridden name from componentOpts if provided
      const workflowName = decoratorOpts?.name ?? target.name;
      workflowContext.checkpointManager.setWorkflowName(workflowName);

      const result = await withContext(context, async () => {
        const result = await Component(decoratorOpts)(target)(props);
        return result;
      });

      const rootId = workflowContext.checkpointManager.root?.id;
      if (rootId) {
        if (decoratorOpts?.metadata) {
          workflowContext.checkpointManager.addMetadata(
            rootId,
            decoratorOpts.metadata,
          );
        }
      } else {
        console.warn(
          "No root checkpoint found for workflow after execution",
          workflowName,
        );
      }
      await workflowContext.checkpointManager.waitForPendingUpdates();

      return result;
    };

    Object.defineProperty(WorkflowFn, "name", {
      value: target.name,
      configurable: true,
    });
    Object.defineProperty(WorkflowFn, "__gsxWorkflow", {
      value: true,
    });

    return WorkflowFn;
  };
}
