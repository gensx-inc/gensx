import type { ComponentOpts } from "./types.js";

import { executeComponentBase } from "./component.js";
import { createStateManager, StateManager } from "./state.js";

/**
 * Result type for stateful components
 */
export interface StatefulComponentResult<Output, State> {
  output: Promise<Output>;
  state: StateManager<State>;
}

export function StatefulComponent<S, P extends object = {}, R = unknown>(
  name: string,
  initialState: S,
  target: (props: P, state: StateManager<S>) => R,
  componentOpts?: ComponentOpts,
): (
  props?: P,
  runtimeOpts?: ComponentOpts,
) => StatefulComponentResult<Awaited<R>, S> {
  const StatefulComponentFn = (
    props?: P,
    runtimeOpts?: ComponentOpts & { onComplete?: () => void },
  ): StatefulComponentResult<Awaited<R>, S> => {
    // We need to get the state manager created in executeComponentBase
    // Since we can't modify executeComponentBase easily, let's create our own state
    const state = createStateManager(
      `${name}-${Date.now()}-${Math.random()}`,
      initialState,
    );

    const result = executeComponentBase(
      name,
      // Wrap the target to use our pre-created state
      (props: P, _: StateManager<S>) => target(props, state),
      componentOpts,
      props,
      runtimeOpts,
      {
        createState: true,
        initialState,
        handleResult: (value: unknown) => value, // No need to capture state here
      },
    );

    // Handle both sync and async results
    if (result instanceof Promise) {
      return {
        output: result as Promise<Awaited<R>>,
        state,
      };
    } else {
      return {
        output: Promise.resolve(result as Awaited<R>),
        state,
      };
    }
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

/**
 * Creates a StateManager for component-level state management.
 * This is a convenience function that provides proper typing.
 */
export function componentState<T>(
  _name: string,
  initialState: T,
): StateManager<T> {
  const uniqueName = `component-${Date.now()}-${Math.random()}`;
  return createStateManager(uniqueName, initialState);
}
