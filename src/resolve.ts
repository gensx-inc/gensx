import type {
  ComponentProps,
  ExecutableValue,
  Streamable,
  StreamComponent,
  WorkflowComponent,
} from "./types";

import { JSX } from "./jsx-runtime";
import { isInStreamingContext } from "./stream";
import { ExecutionContext, getCurrentContext } from "./context";

type ComponentType<P, O> = WorkflowComponent<P, O> | StreamComponent<P, O>;

// Helper to check if something is a JSX element
function isJSXElement<P, O>(
  element: unknown,
): element is JSX.Element & {
  type: ComponentType<P, O>;
  props: ComponentProps<P, O>;
} {
  const el = element as { type: ComponentType<P, O> };
  return (
    typeof element === "object" &&
    element !== null &&
    "type" in element &&
    "props" in element &&
    typeof el.type === "function" &&
    (("isWorkflowComponent" in el.type &&
      el.type.isWorkflowComponent === true) ||
      ("isStreamComponent" in el.type && el.type.isStreamComponent === true))
  );
}

// Helper to check if something is a streamable value
function isStreamable<T>(value: unknown): value is Streamable<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "stream" in value &&
    "value" in value &&
    typeof (value as Streamable<T>).stream === "function" &&
    value.value instanceof Promise
  );
}

/**
 * Deeply resolves any value, handling promises, arrays, objects, and JSX elements.
 * This is the core resolution logic used by both execute() and the JSX runtime.
 */
export async function resolveDeep<T>(value: unknown): Promise<T> {
  const context = getCurrentContext();
  console.log("resolveDeep entry:", {
    contextInfo: context.getContextInfo(),
    isInStreamingContext: isInStreamingContext(),
    type: value?.constructor?.name,
    isStreamable: isStreamable(value),
  });

  // Handle promises first
  if (value instanceof Promise) {
    const resolved = await value;
    return resolveDeep(resolved);
  }

  // Handle streamable values
  if (isStreamable(value)) {
    console.log("resolveDeep found streamable:", {
      inStreamingContext: isInStreamingContext(),
      hasStream: typeof value.stream === "function",
      contextInfo: context.getContextInfo(),
      value,
    });
    if (isInStreamingContext() || context.hadStreamingInChain()) {
      console.log("resolveDeep preserving streamable:", {
        reason: isInStreamingContext()
          ? "in streaming context"
          : "had streaming child",
        contextInfo: context.getContextInfo(),
      });
      return value as T;
    }
    // Outside streaming context, resolve the value and check if result is also streamable
    const finalValue = await value.value;
    console.log("resolveDeep resolved streamable value:", {
      contextInfo: context.getContextInfo(),
      isStreamable: isStreamable(finalValue),
      value: finalValue,
    });
    if (
      isStreamable(finalValue) &&
      (isInStreamingContext() || context.hadStreamingInChain())
    ) {
      return finalValue as T;
    }
    // Recursively resolve in case the value itself needs further resolution
    return resolveDeep(finalValue);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const resolvedArray = await Promise.all(
      value.map(item => resolveDeep(item)),
    );
    return resolvedArray as T;
  }

  // Handle JSX elements
  if (isJSXElement(value)) {
    const componentResult = await value.type(value.props);
    console.log("resolveDeep JSX result:", {
      isStreamable: isStreamable(componentResult),
      hasStream:
        componentResult &&
        typeof (componentResult as any).stream === "function",
      inStreamingContext: isInStreamingContext(),
      isStreamComponent:
        "isStreamComponent" in value.type &&
        value.type.isStreamComponent === true,
    });

    // If this is a Stream component and result is streamable, preserve it
    const isStreamComponent =
      "isStreamComponent" in value.type &&
      value.type.isStreamComponent === true;
    if (isStreamComponent && isStreamable(componentResult)) {
      return componentResult as T;
    }

    // If result is streamable and we're in streaming context, preserve it
    if (isStreamable(componentResult) && isInStreamingContext()) {
      return componentResult as T;
    }

    return resolveDeep(componentResult);
  }

  // Handle objects (but not null)
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value);
    const resolvedEntries = await Promise.all(
      entries.map(async ([key, val]) => [key, await resolveDeep(val)]),
    );
    return Object.fromEntries(resolvedEntries) as T;
  }

  // Base case: primitive value
  return value as T;
}

/**
 * Executes a JSX element or any other value, ensuring all promises and nested values are resolved.
 * This is the main entry point for executing workflow components.
 */
export async function execute<T>(
  element: ExecutableValue,
  context?: ExecutionContext,
): Promise<T> {
  if (element === null || element === undefined) {
    throw new Error("Cannot execute null or undefined element");
  }

  // Use provided context or current context
  const executionContext = context || getCurrentContext();
  const wasInStreamingContext = isInStreamingContext();
  console.log("Execute entry:", {
    contextInfo: executionContext.getContextInfo(),
    wasInStreaming: wasInStreamingContext,
    isJSX: isJSXElement(element),
    isStreamable: isStreamable(element),
  });

  try {
    // Handle JSX elements specially to support children functions
    if (isJSXElement(element)) {
      console.log("execute JSX - streaming context:", {
        current: isInStreamingContext(),
        wasInStreaming: wasInStreamingContext,
      });
      const componentResult = await element.type(element.props);

      // If this is a Stream component or we're in a streaming context chain, preserve streamable results
      if (
        isStreamable(componentResult) &&
        (wasInStreamingContext || executionContext.hasStreamingInChain())
      ) {
        console.log("execute preserving streamable from context chain:", {
          hasStream: typeof componentResult.stream === "function",
          wasInStreaming: wasInStreamingContext,
          inChain: executionContext.hasStreamingInChain(),
        });
        return componentResult as unknown as T;
      }

      // Handle non-streaming cases
      if (element.props.children) {
        const resolvedResult = await resolveDeep(componentResult);
        const childrenResult = await element.props.children(resolvedResult);
        // eslint-disable-next-line @typescript-eslint/return-await
        return execute(childrenResult as ExecutableValue, executionContext);
      }

      // No children, resolve the result
      // eslint-disable-next-line @typescript-eslint/return-await
      return resolveDeep(componentResult);
    }

    // For all other cases, use the shared resolver
    if (
      isStreamable(element) &&
      (wasInStreamingContext || executionContext.hasStreamingInChain())
    ) {
      // Preserve streamables in streaming context chain
      console.log("execute preserving top-level streamable:", {
        hasStream: typeof element.stream === "function",
        wasInStreaming: wasInStreamingContext,
        inChain: executionContext.hasStreamingInChain(),
        contextInfo: executionContext.getContextInfo(),
      });
      return element as T;
    }

    const result = await resolveDeep(element);
    console.log("execute after resolveDeep:", {
      contextInfo: executionContext.getContextInfo(),
      wasInStreaming: wasInStreamingContext,
      isStreamable: isStreamable(result),
      hasStream: result && typeof (result as any).stream === "function",
    });

    if (
      isStreamable(result) &&
      (wasInStreamingContext || executionContext.hasStreamingInChain())
    ) {
      console.log("execute preserving streamable after resolution:", {
        hasStream: typeof result.stream === "function",
        wasInStreaming: wasInStreamingContext,
        inChain: executionContext.hasStreamingInChain(),
        contextInfo: executionContext.getContextInfo(),
      });
      return result as T;
    }

    console.log("execute final result:", {
      isStreamable: isStreamable(result),
      hasStream: result && typeof (result as any).stream === "function",
      wasInStreaming: wasInStreamingContext,
      inChain: executionContext.hasStreamingInChain(),
      contextInfo: executionContext.getContextInfo(),
      result,
    });
    // eslint-disable-next-line @typescript-eslint/return-await
    return result as T;
  } finally {
    // Context cleanup handled by withContext
  }
}
