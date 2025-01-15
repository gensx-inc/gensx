import type { MaybePromise, Streamable, StreamComponent } from "./types";

import { JSX } from "./jsx-runtime";
import { resolveDeep } from "./resolve";

export function StreamComponent<P>(
  fn: (props: P) => MaybePromise<Streamable | JSX.Element>,
): StreamComponent<P> {
  const GsxStreamComponent: StreamComponent<P> = async props => {
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

  if (fn.name) {
    Object.defineProperty(GsxStreamComponent, "name", {
      value: `GsxStreamComponent[${fn.name}]`,
    });
  }

  const component = GsxStreamComponent;
  return component;
}
