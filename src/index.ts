/**
# Requirements

1. Type safety with mininal boilerplate from the user
2. Fork/join patterns (Collect).
3. Users always deal with plain types, and we handle promise resolution under the hood
4. Components are purely functional, and don't have the be aware of how they are used.
5. Keep track of inputs and outputs of each workflow step so that we can:
   1. Cache the outputs
   2. Render the workflow as a graph in some sort of UI that enables debugging, seeing inputs, outputs, etc.
6. Dynamic children composition pattern - outputs of a component made available as a lambda within it's children
7. Support parallel execution of steps (either dynamic via something liek a collector, or static via a few explicitly defined siblings)
 */

import { Component, StreamComponent } from "./component";
import { execute } from "./resolve";
import { Stream } from "./stream";
import { Element, ExecutableValue, Streamable } from "./types";

// Collect component props
export interface CollectProps {
  children: Element[];
}

// Export everything through gsx namespace
export const gsx = {
  Component,
  StreamComponent,
  execute,
  Collect,
  Stream,
};

// Export Component and execute directly for use in type definitions
export { Component, execute, Stream, StreamComponent };

// Also export types
export type { Element, ExecutableValue, Streamable };

// Collect component for parallel execution with named outputs
export async function Collect<T extends Record<string, unknown>>(
  props: CollectProps,
): Promise<T> {
  const children = Array.isArray(props.children)
    ? props.children
    : [props.children];

  // Execute all children in parallel
  const results = await Promise.all(
    children.map(child => {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      /* eslint-disable @typescript-eslint/no-explicit-any */
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      /* eslint-disable @typescript-eslint/no-unsafe-argument */
      const outputName = (child as any)?.props?.output;
      return executeWithName(child, outputName);
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      /* eslint-enable @typescript-eslint/no-explicit-any */
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */
      /* eslint-enable @typescript-eslint/no-unsafe-argument */
    }),
  );

  // Combine results into an object
  const output = {} as Record<string, unknown> as T;
  for (const [name, value] of results) {
    if (name) {
      (output as Record<string, unknown>)[name] = value;
    }
  }

  return output;
}

// Execute with output name tracking
async function executeWithName<T>(
  element: Element,
  outputName?: string,
): Promise<[string | undefined, T]> {
  const result = await execute<T>(element as ExecutableValue);
  return [outputName, result];
}
