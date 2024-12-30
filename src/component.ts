import type {
  ComponentProps,
  MaybePromise,
  Streamable,
  StreamComponent,
  StreamComponentProps,
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

export function StreamComponent<P, O>(
  fn: (props: P) => MaybePromise<Streamable<O>>,
): StreamComponent<P, O> {
  function GsxStreamComponent(
    props: StreamComponentProps<P, O>,
  ): MaybePromise<Streamable<O>> {
    return withContext({ streaming: props.stream ?? false }, async () =>
      Promise.resolve(fn(props)),
    );
  }

  if (fn.name) {
    Object.defineProperty(GsxStreamComponent, "name", {
      value: `GsxStreamComponent[${fn.name}]`,
    });
  }

  // Mark as stream component
  const component = GsxStreamComponent as StreamComponent<P, O>;
  component.isStreamComponent = true;

  return component;
}
