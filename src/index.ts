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
  const execId = Math.random().toString(36).slice(2, 8);

  if (!element) {
    throw new Error("Cannot execute null or undefined element");
  }

  // Step 1: Detect the type
  const elementType =
    element instanceof Promise
      ? "Promise"
      : Array.isArray(element)
        ? "Array"
        : isJSXElement(element)
          ? "JSX"
          : typeof element;

  console.log(
    `\n[${execId}] 🎯 START executing value of type: ${elementType}`,
    isJSXElement(element) ? `(${element.type.name})` : "",
  );

  try {
    // Step 2: Handle promises first - await any promises we encounter
    if (element instanceof Promise) {
      console.log(`[${execId}] 🔄 START resolving promise...`);
      const resolved = await element;
      console.log(`[${execId}] ✅ Promise resolved to:`, resolved);
      // Recurse on the resolved value
      return execute(resolved as ExecutableValue);
    }

    // Step 3: Handle arrays - recurse on each element
    if (Array.isArray(element)) {
      console.log(`[${execId}] 📚 Processing array of ${element.length} items`);
      const results = await Promise.all(
        element.map(item => execute(item as ExecutableValue)),
      );
      console.log(`[${execId}] 📚 Array fully resolved:`, results);
      return results as unknown as T;
    }

    // Step 4: Handle JSX elements - execute them and recurse on the result
    if (isJSXElement(element)) {
      console.log(`[${execId}] ⚛️ Executing JSX element: ${element.type.name}`);
      const componentResult = await element.type(element.props);
      console.log(`[${execId}] ⚛️ Component returned:`, componentResult);

      // Recurse on the component's result
      const resolvedResult = await execute(componentResult as ExecutableValue);
      console.log(
        `[${execId}] ⚛️ Component result fully resolved:`,
        resolvedResult,
      );

      // Only after fully resolving do we handle children
      if (element.props.children) {
        console.log(
          `[${execId}] 👶 Executing children with fully resolved value`,
        );
        const childrenResult = await element.props.children(resolvedResult);
        // Recurse on the children's result
        return execute(childrenResult as ExecutableValue);
      }

      return resolvedResult as T;
    }

    // Step 3: Handle objects - recurse on all values
    if (typeof element === "object" && element !== null) {
      console.log(
        `[${execId}] 🔧 Processing object with keys:`,
        Object.keys(element),
      );
      const resolvedEntries = await Promise.all(
        Object.entries(element).map(async ([key, value]) => {
          const resolvedValue = await execute(value as ExecutableValue);
          return [key, resolvedValue];
        }),
      );
      const result = Object.fromEntries(resolvedEntries);
      console.log(`[${execId}] 🔧 Object fully resolved:`, result);
      return result as T;
    }

    // Step 5: Base case - primitive values
    console.log(`[${execId}] 📝 Reached primitive value:`, element);
    return element as T;
  } catch (error) {
    console.log(`[${execId}] ❌ Error during execution:`, error);
    throw error;
  }
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
