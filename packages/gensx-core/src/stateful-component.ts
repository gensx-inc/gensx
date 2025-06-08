import type { ComponentOpts } from "./types.js";

import { executeComponentBase } from "./component.js";
import { StateManager } from "./state.js";

/**
 * Result type for stateful components
 */
export interface StatefulComponentResult<Output, State> {
  output: Promise<Output>;
  state: StateManager<State>;
}

export function StatefulComponent<S, P extends object = {}, R = unknown>(
  name: string,
  target: (props: P) => StatefulComponentResult<R, S>,
  componentOpts?: ComponentOpts,
): (
  props?: P,
  runtimeOpts?: ComponentOpts,
) => StatefulComponentResult<Awaited<R>, S> {
  const StatefulComponentFn = (
    props?: P,
    runtimeOpts?: ComponentOpts & { onComplete?: () => void },
  ): StatefulComponentResult<Awaited<R>, S> => {
    // Call the target function to get the result
    const result = target((props ?? {}) as P);

    // Execute the component using the existing infrastructure
    const componentResult = executeComponentBase(
      name,
      // Create a wrapper function that returns the output
      (_props: P) => result.output,
      componentOpts,
      props,
      runtimeOpts,
      {
        createState: false, // Component manages its own state
        handleResult: (value: unknown) => value,
      },
    );

    // Handle both sync and async results for the output
    let outputPromise: Promise<Awaited<R>>;
    if (componentResult instanceof Promise) {
      outputPromise = componentResult as Promise<Awaited<R>>;
    } else {
      outputPromise = Promise.resolve(componentResult as Awaited<R>);
    }

    return {
      output: outputPromise,
      state: result.state,
    };
  };

  Object.defineProperty(StatefulComponentFn, "name", {
    value: name,
    configurable: true,
  });
  Object.defineProperty(StatefulComponentFn, "__gensxStatefulComponent", {
    value: true,
  });

  return StatefulComponentFn;
}

/**
 * Type guard to check if a function is a stateful component
 */
export function isStatefulComponent(
  fn: unknown,
): fn is (props: unknown) => StatefulComponentResult<unknown, unknown> {
  return (
    typeof fn === "function" &&
    "__gensxStatefulComponent" in fn &&
    fn.__gensxStatefulComponent === true
  );
}
