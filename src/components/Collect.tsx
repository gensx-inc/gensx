import { ComponentChild } from "preact";

import { executeJsxWorkflow } from "../execute";

export interface CollectProps<T> {
  children: (ComponentChild | Promise<T>)[];
}

export function Collect<T>(
  props: CollectProps<T>,
): Promise<T[]> & { __output: T[] } {
  const promise = Promise.all(
    props.children.map(child =>
      child instanceof Promise ? child : executeJsxWorkflow<T>(child),
    ),
  );
  return Object.assign(promise, { __output: [] as T[] });
}
