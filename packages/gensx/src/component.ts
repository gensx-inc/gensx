import type {
  DeepJSXElement,
  GsxComponent,
  GsxStreamComponent,
  MaybePromise,
  Streamable,
} from "./types";

import { JSX } from "./jsx-runtime";
import { resolveDeep } from "./resolve";

export function Component<P, O>(
  fn: (props: P) => MaybePromise<O | DeepJSXElement<O> | JSX.Element>,
  opts: { name?: string },
): GsxComponent<P, O> {
  const GsxComponent: GsxComponent<P, O> = async props => {
    return await resolveDeep(fn(props));
  };

  if (opts.name) {
    Object.defineProperty(GsxComponent, "name", {
      value: opts.name,
    });
  }

  return GsxComponent;
}

export function StreamComponent<P>(
  fn: (props: P) => MaybePromise<Streamable | JSX.Element>,
  opts?: { name?: string },
): GsxStreamComponent<P> {
  const GsxStreamComponent: GsxStreamComponent<P> = async props => {
    const iterator: Streamable = await resolveDeep(fn(props));
    if (props.stream) {
      return iterator;
    }

    let result = "";
    for await (const token of iterator) {
      result += token;
    }
    return result;
  };

  if (opts?.name) {
    Object.defineProperty(GsxStreamComponent, "name", {
      value: opts.name,
    });
  }

  const component = GsxStreamComponent;
  return component;
}
