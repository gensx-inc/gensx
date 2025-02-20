import { ExecutionContext, getCurrentContext, withContext } from "./context";
import { resolveDeep } from "./resolve";
import {
  ExecutableValue,
  GsxComponent,
  GsxStreamComponent,
  Streamable,
} from "./types";

/**
 * Executes a JSX element or any other value, ensuring all promises and nested values are resolved.
 * This is the main entry point for executing workflow components.
 */

export async function execute<T>(element: ExecutableValue): Promise<T> {
  const context = getCurrentContext().getWorkflowContext();
  const result = (await resolveDeep(element)) as T;
  context.checkpointManager.write();
  return result;
}

type RunResult<P> = P extends { stream: true }
  ? Promise<Streamable>
  : Promise<string>;

// Overload for GsxComponent
export function Workflow<P, O>(
  name: string,
  component: GsxComponent<P, O>,
  opts?: {
    metadata?: Record<string, unknown>;
  },
): { run: (props: P) => Promise<O> };

// Overload for GsxStreamComponent
export function Workflow<P extends { stream?: boolean }>(
  name: string,
  component: GsxStreamComponent<P>,
  opts?: {
    metadata?: Record<string, unknown>;
  },
): { run: <T extends P>(props: T) => RunResult<T> };
export function Workflow<P extends { stream?: boolean }, O>(
  name: string,
  component: GsxComponent<P, O> | GsxStreamComponent<P>,
  opts?: {
    printUrl?: boolean;
    metadata?: Record<string, unknown>;
  },
): {
  run: (props: P) => Promise<O | Streamable | string>;
} {
  return {
    run: async (props) => {
      const context = new ExecutionContext({});

      const workflowContext = context.getWorkflowContext();
      workflowContext.checkpointManager.setPrintUrl(opts?.printUrl ?? false);
      workflowContext.checkpointManager.setWorkflowName(name);

      const result = await withContext(context, async () => {
        const componentResult = await component(props);
        const resolved = await resolveDeep<O | Streamable | string>(
          componentResult,
        );
        return resolved;
      });

      const rootId = workflowContext.checkpointManager.root?.id;
      if (rootId) {
        workflowContext.checkpointManager.addMetadata(
          rootId,
          opts?.metadata ?? {},
        );
      } else {
        console.warn(
          "No root checkpoint found for workflow after execution",
          name,
        );
      }
      await workflowContext.checkpointManager.waitForPendingUpdates();

      return result;
    },
  };
}
