/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ExecutionContext, withContext } from "./context";
import { resolveDeep } from "./resolve";
import {
  ComponentProps,
  ExecutableValue,
  MaybePromise,
  Primitive,
} from "./types";

export namespace JSX {
  export type ElementType = (props: any) => Element;
  export type Element = () => Promise<unknown>;
  export interface ElementChildrenAttribute {
    children: (
      output: unknown,
    ) => JSX.Element | JSX.Element[] | Record<string, JSX.Element>;
  }
}

export const Fragment = (props: { children?: JSX.Element[] | JSX.Element }) => {
  if (!props.children) {
    return [];
  }
  if (Array.isArray(props.children)) {
    return props.children;
  }
  return [props.children];
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
(Fragment as any).__gsxFragment = true;

export const jsx = <TOutput, TProps>(
  component: (props: ComponentProps<TProps, TOutput>) => MaybePromise<TOutput>,
  props: ComponentProps<TProps, TOutput> | null,
): (() => Promise<Awaited<TOutput> | Awaited<TOutput>[]>) => {
  // Return a promise that will be handled by execute()
  async function JsxWrapper(): Promise<Awaited<TOutput> | Awaited<TOutput>[]> {
    const rawResult = await component(
      props ?? ({} as ComponentProps<TProps, TOutput>),
    );

    const result = await resolveDeep(rawResult);

    // Need to special case Fragment, because it's children are actually executed in the resolveDeep above
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (props?.children && !(component as any).__gsxFragment) {
      if (result instanceof ExecutionContext) {
        return await withContext(result, () => {
          if (props.children) {
            return resolveDeep(resolveChildren(null as never, props.children));
          }
          return null as never;
        });
      } else {
        return await resolveDeep(
          resolveChildren(result as TOutput, props.children),
        );
      }
    }
    return result as Awaited<TOutput> | Awaited<TOutput>[];
  }

  if (component.name) {
    Object.defineProperty(JsxWrapper, "name", {
      value: `JsxWrapper[${component.name}]`,
    });
  }

  return JsxWrapper;
};

export const jsxs = jsx;

function resolveChildren<O>(
  output: O,
  children:
    | JSX.Element
    | JSX.Element[]
    | ((output: O) => MaybePromise<ExecutableValue | Primitive>)
    // support child functions that do not return anything, but maybe do some other side effect
    | ((output: O) => void)
    | ((output: O) => Promise<void>),
) {
  if (children instanceof Function) {
    return children(output);
  }
  if (Array.isArray(children)) {
    return resolveDeep(children);
  }
  return children;
}
