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
import {
  Element,
  ExecutableValue,
  WorkflowComponent,
  ComponentProps,
} from "./types";
import { JSX } from "./jsx-runtime";

// Collect component props
export interface CollectProps {
  children: Element[];
}

// Helper to check if something is a JSX element
function isJSXElement<P, O>(
  element: unknown,
): element is JSX.Element & {
  type: WorkflowComponent<P, O>;
  props: ComponentProps<P, O>;
} {
  return (
    typeof element === "object" &&
    element !== null &&
    "type" in element &&
    "props" in element &&
    typeof (element as any).type === "function" &&
    (element as any).type.isWorkflowComponent
  );
}

// Execute JSX elements and handle promise resolution
export async function execute<T>(element: ExecutableValue): Promise<T> {
  if (!element) {
    throw new Error("Cannot execute null or undefined element");
  }

  // Handle JSX elements
  if (isJSXElement(element)) {
    const result = await element.type(element.props);
    return result as unknown as T;
  }

  // Handle arrays
  if (Array.isArray(element)) {
    const results = await Promise.all(
      element.map((e: ExecutableValue) => execute(e)),
    );
    return results as unknown as T;
  }

  // Handle promises
  if (element instanceof Promise) {
    const resolved = await element;
    return execute(resolved as ExecutableValue);
  }

  // Handle objects (recursively execute JSX elements)
  if (typeof element === "object" && element !== null) {
    const result: Record<string, unknown> = {};
    const entries = Object.entries(element as Record<string, unknown>);
    const values = await Promise.all(
      entries.map(([_, value]) => execute(value as ExecutableValue)),
    );
    entries.forEach(([key], i) => {
      result[key] = values[i];
    });
    return result as T;
  }

  // Handle regular values
  return element as T;
}

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

// Export everything through gsx namespace
export const gsx = {
  Component,
  execute,
  Collect,
};

// Export Component directly for use in type definitions
export { Component };

// Also export types
export type { Element };
