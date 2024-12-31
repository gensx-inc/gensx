import type {
  ComponentProps,
  MaybePromise,
  Streamable,
  StreamComponentProps,
  StreamingComponent,
  WorkflowComponent,
} from "./types";

import { withContext } from "./context";
import { JSX } from "./jsx-runtime";

export function Component<P, O>(
  fn: (props: P) => MaybePromise<O | JSX.Element | JSX.Element[]>,
): WorkflowComponent<P, O> {
  function GsxComponent(props: ComponentProps<P, O>): MaybePromise<O> {
    return Promise.resolve(fn(props)) as Promise<O>;
  }

  if (fn.name) {
    Object.defineProperty(GsxComponent, "name", {
      value: `GsxComponent[${fn.name}]`,
    });
  }

  // Mark as workflow component and JSX element type
  const component = GsxComponent as WorkflowComponent<P, O>;

  return component;
}

export function StreamComponent<P>(
  fn: (props: P) => MaybePromise<Streamable>,
): StreamingComponent<P, boolean> {
  function GsxStreamComponent<Stream extends boolean = false>(
    props: StreamComponentProps<P, Stream>,
  ): MaybePromise<Stream extends true ? Streamable : string> {
    return withContext({ streaming: props.stream ?? false }, async () => {
      const iterator = await Promise.resolve(fn(props));
      if (props.stream) {
        return iterator as Stream extends true ? Streamable : string;
      }
      let result = "";
      for await (const token of iterator) {
        result += token;
      }
      return result as Stream extends true ? Streamable : string;
    });
  }

  if (fn.name) {
    Object.defineProperty(GsxStreamComponent, "name", {
      value: `GsxStreamComponent[${fn.name}]`,
    });
  }

  // Mark as stream component
  const component = GsxStreamComponent as StreamingComponent<P, boolean>;
  component.__isStreamingGsxComponent = true;

  return component;
}
