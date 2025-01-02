import type {
  ComponentProps,
  MaybePromise,
  Streamable,
  StreamComponentProps,
  StreamingComponent,
  WorkflowComponent,
  WorkflowContext,
} from "./types";

import { withContext } from "./context";
import { JSX } from "./jsx-runtime";
import { resolveDeep } from "./resolve";

export function Component<P, O>(
  fn: (
    props: P,
  ) => MaybePromise<
    O | JSX.Element | JSX.Element[] | Record<string, JSX.Element>
  >,
): WorkflowComponent<P, O> {
  async function GsxComponent(props: ComponentProps<P, O>): Promise<unknown> {
    const result = await resolveDeep(fn(props));

    let finalResult: unknown;
    if (props.children) {
      finalResult = await withContext({}, () => props.children?.(result as O));
    } else {
      finalResult = result;
    }
    return finalResult;
  }

  if (fn.name) {
    Object.defineProperty(GsxComponent, "name", {
      value: `GsxComponent[${fn.name}]`,
    });
  }

  const component = GsxComponent as WorkflowComponent<P, O>;
  return component;
}

export function StreamComponent<P>(
  fn: (
    props: P,
  ) => MaybePromise<Streamable | AsyncGenerator<string> | Generator<string>>,
): StreamingComponent<P, boolean> {
  function GsxStreamComponent<Stream extends boolean = false>(
    props: StreamComponentProps<P, Stream>,
  ): Promise<Stream extends true ? Streamable : string> {
    return withContext({ streaming: props.stream ?? false }, async () => {
      const iterator: Streamable = await resolveDeep(fn(props));
      if (props.stream) {
        if (props.children) {
          return withContext({}, () =>
            props.children?.(
              iterator as Stream extends true ? Streamable : string,
            ),
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
          props.children?.(result as Stream extends true ? Streamable : string),
        );
      }
      return result as Stream extends true ? Streamable : string;
    });
  }

  if (fn.name) {
    Object.defineProperty(GsxStreamComponent, "name", {
      value: `GsxStreamComponent[${fn.name}]`,
    });
  }

  const component = GsxStreamComponent as StreamingComponent<P, boolean>;
  return component;
}

export function ContextProvider<P, C extends Partial<WorkflowContext>>(
  fn: (props: P) => MaybePromise<C>,
): WorkflowComponent<P, never> {
  async function GsxContextProvider(
    props: ComponentProps<P, never>,
  ): Promise<unknown> {
    const context = await fn(props);
    const children = props.children;
    if (!children) {
      console.warn("Provider has no children");
      return null;
    }
    return withContext(context, () => children(null as never));
  }

  if (fn.name) {
    Object.defineProperty(GsxContextProvider, "name", {
      value: `GsxContextProvider[${fn.name}]`,
    });
  }

  const component = GsxContextProvider as WorkflowComponent<P, never>;
  return component;
}
