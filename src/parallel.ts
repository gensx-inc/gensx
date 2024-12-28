import type { Element } from "./types";

import { getCurrentContext } from "./context";
import { execute } from "./resolve";

export async function Parallel<T>(props: {
  children: Element[] | Element;
}): Promise<T[]> {
  const children = Array.isArray(props.children)
    ? props.children
    : [props.children];
  const parentContext = getCurrentContext();

  // Execute each child in parallel with its own forked context
  const results = await Promise.all(
    children.map(async child => {
      const forkedContext = parentContext.fork();
      return execute<T>(child, forkedContext);
    }),
  );

  return results;
}
