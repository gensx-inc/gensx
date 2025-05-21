import type {
  ComponentOpts,
  ComponentOpts as OriginalComponentOpts,
  DecoratorComponentOpts,
  DecoratorWorkflowOpts,
  MaybePromise,
  WorkflowOpts,
} from "./types.js";

import serializeErrorPkg from "@common.js/serialize-error";
const { serializeError } = serializeErrorPkg;

import { ExecutionContext, getCurrentContext, withContext } from "./context.js";

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
  ): (props: P) => MaybePromise<R> {
    // Only wrap class methods
    if (context && context.kind !== "method") {
      console.warn("Component decorator can only be applied to class methods.");
      return target;
    }

    return createComponent(target, decoratorOpts);
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
  ): (props: P) => MaybePromise<R> {
    // Only wrap class methods
    if (context && context.kind !== "method") {
      console.warn("Workflow decorator can only be applied to class methods.");
      return target;
    }

    return createWorkflow(target, decoratorOpts);
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

  const ComponentFn = async (
    props: P,
    runtimeOpts?: ComponentOpts,
  ): Promise<R> => {
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

    try {
      const result = await context.withCurrentNode(nodeId, () => {
        return target(props);
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
  Object.defineProperty(ComponentFn, "__gensxComponent", {
    value: true,
  });

  return ComponentFn;
}

export function createWorkflow<P extends object, R>(
  target: (props: P) => R,
  workflowOpts?: WorkflowOpts | string,
): (props: P) => MaybePromise<R> {
  // Use the overridden name from componentOpts if provided
  const configuredWorkflowName =
    typeof workflowOpts === "string"
      ? workflowOpts
      : (workflowOpts?.name ?? target.name);

  const WorkflowFn = async (props: P, runtimeOpts?: WorkflowOpts) => {
    const context = new ExecutionContext({});

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
      const result = await withContext(context, async () => {
        const result = await component(props, runtimeOpts);
        return result;
      });

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
