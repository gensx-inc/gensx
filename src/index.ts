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

import { Component } from "./component";
import { Element, ExecutableValue } from "./types";
import { execute } from "./resolve";

// Collect component props
export interface CollectProps {
  children: Element[];
}

// Export everything through gsx namespace
export const gsx = {
  Component,
  execute,
  Collect,
};

// Export Component and execute directly for use in type definitions
export { Component, execute };

// Also export types
export type { Element };

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
      const outputName = (child as any)?.props?.output;
      return executeWithName(child, outputName);
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
