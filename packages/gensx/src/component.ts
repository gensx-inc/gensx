import type {
  ComponentProps,
  MaybePromise,
  Streamable,
  StreamComponentProps,
  StreamingComponent,
  WorkflowComponent,
  WorkflowContext,
} from "./types";

import { withContext, getCurrentContext } from "./context";
import { JSX } from "./jsx-runtime";
import { resolveDeep } from "./resolve";

// TODO: We execute the children inside the component wrappers in order to execute the children within the correct context.
// This also requires that the Component/StreamComponent/ContextProvider wrappers return functions, instead of just the promises.
// It's not the cleanest thing, and we might be able to simplify this if we migrate to AsyncLocalStorage for context instead.

/**
 * This allows an element to return either a plain object or an object with JSX.Element children
 * This is useful for components that return a nested object structure, where each key can be a component
 * that returns a plain object or an object with JSX.Element children.
 *
 * For example:
 *
 * interface ComponentOutput {
 *   nested: {
 *     foo: string;
 *     bar: string;
 *   }[];
 * }
 *
 * interface ComponentProps {
 *   input: string;
 * }
 *
 * const Component = gsx.Component<ComponentProps, ComponentOutput>(
 *   ({ input }) => ({
 *     nested: [
 *       { foo: <Foo input={input} />, bar: <Bar input={input} /> },
 *       { foo: <Foo />, bar: <Bar /> },
 *     ],
 *   }),
 * );
 */
type DeepJSXElement<T> = T extends (infer Item)[]
  ? DeepJSXElement<Item>[]
  : T extends object
    ? { [K in keyof T]: DeepJSXElement<T[K]> }
    : T | JSX.Element;

export function Component<P, O>(
  fn: (
    props: P,
  ) => MaybePromise<
    | O
    | JSX.Element
    | JSX.Element[]
    | Record<string, JSX.Element>
    | DeepJSXElement<O>
    | undefined
  >,
): WorkflowComponent<P, O> {
  console.log(`[Component] Creating component wrapper for:`, fn.name);

  function GsxComponent(props: ComponentProps<P, O>): () => Promise<O> {
    return async () => {
      const context = getCurrentContext();
      const tracker = context.get("tracker");
      const elementName = context.get("elementName") as string | undefined;

      // Use elementName from context if available, fallback to function name
      const componentName = elementName || fn.name || "Anonymous";

      // Start tracking this component using its actual name
      const nodeId = tracker
        ? await tracker.addNode({
            componentName,
            props: Object.fromEntries(
              Object.entries(props).filter(([key]) => key !== "children"),
            ),
          })
        : undefined;

      console.log(`[Component] Added tracking node:`, {
        componentName,
        nodeId,
        parentNode: tracker?.currentNode?.id,
      });

      try {
        const result = await resolveDeep(fn(props));

        let finalResult: O;
        if (props.children) {
          finalResult = await withContext({}, () =>
            props.children?.(result as O),
          );
        } else {
          finalResult = result as O;
        }

        // Complete tracking
        if (nodeId) {
          await tracker?.completeNode(nodeId, finalResult);
          console.log(`[Component] Completed node:`, { nodeId, componentName });
        }

        return finalResult;
      } catch (error) {
        // Track errors too
        console.error(`[Component] Error in component:`, {
          componentName,
          nodeId,
          error,
        });
        if (nodeId && error instanceof Error) {
          await tracker?.addMetadata(nodeId, { error: error.message });
          await tracker?.completeNode(nodeId, undefined);
        }
        throw error;
      }
    };
  }

  if (fn.name) {
    Object.defineProperty(GsxComponent, "name", {
      value: `GsxComponent[${fn.name}]`,
    });
  }

  return GsxComponent as WorkflowComponent<P, O>;
}

export function StreamComponent<P>(
  fn: (props: P) => MaybePromise<Streamable | JSX.Element>, // It does not make sense to stream from more than one child element
): StreamingComponent<P, boolean> {
  function GsxStreamComponent<Stream extends boolean = false>(
    props: StreamComponentProps<P, Stream>,
  ): () => Promise<Stream extends true ? Streamable : string> {
    return async () => {
      const iterator: Streamable = await resolveDeep(fn(props));
      if (props.stream) {
        if (props.children) {
          return withContext({}, () =>
            props.children?.(iterator as unknown as Streamable & string),
          );
        }
        return iterator as Stream extends true ? Streamable : string;
      }

      let result = "";
      for await (const token of iterator) {
        result += token;
      }
      if (props.children) {
        return withContext({}, () =>
          props.children?.(result as unknown as Streamable & string),
        );
      }
      return result as Stream extends true ? Streamable : string;
    };
  }

  if (fn.name) {
    Object.defineProperty(GsxStreamComponent, "name", {
      value: `GsxStreamComponent[${fn.name}]`,
    });
  }

  const component = GsxStreamComponent;
  return component;
}

export function ContextProvider<P, C extends Partial<WorkflowContext>>(
  fn: (props: P) => MaybePromise<C>,
): WorkflowComponent<P, never> {
  function GsxContextProvider(
    props: ComponentProps<P, never>,
  ): () => Promise<never> {
    return async () => {
      const context = await fn(props);
      const children = props.children;
      if (!children) {
        console.warn("Provider has no children");
        return null as never;
      }
      return withContext(context, () => children(null as never));
    };
  }

  if (fn.name) {
    Object.defineProperty(GsxContextProvider, "name", {
      value: `GsxContextProvider[${fn.name}]`,
    });
  }

  const component = GsxContextProvider;
  return component;
}
