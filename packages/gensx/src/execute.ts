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

// Overload for BrandedGsxComponent
export function workflow<P, O>(
  _name: string,
  component: GsxComponent<P, O>,
): { run: (props: P) => Promise<O> };

// Overload for GsxStreamComponent
export function workflow<P extends { stream?: boolean }>(
  _name: string,
  component: GsxStreamComponent<P>,
): { run: <T extends P>(props: T) => RunResult<T> };

// Implementation
export function workflow<P extends { stream?: boolean }, O>(
  _name: string,
  component: GsxComponent<P, O> | GsxStreamComponent<P>,
): {
  run: (props: P) => Promise<O | Streamable | string>;
} {
  return {
    run: async props => {
      const context = new ExecutionContext({});
      const result = await withContext(context, async () => {
        const componentResult = await component(props);
        const resolved = await resolveDeep<O | Streamable | string>(
          componentResult,
        );
        return resolved;
      });
      return result;
    },
  };
}
