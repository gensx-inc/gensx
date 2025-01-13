/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { resolveDeep } from "./resolve";
import { ComponentProps, MaybePromise } from "./types";

export namespace JSX {
  export type ElementType = (props: any) => Element;
  export type Element = () => Promise<unknown>;
  export interface ElementChildrenAttribute {
    children: (
      output: unknown,
    ) => JSX.Element | JSX.Element[] | Record<string, JSX.Element>;
  }
}

export const Fragment = async (props: {
  children?: JSX.Element[] | JSX.Element;
}) => {
  if (!props.children) {
    return [];
  }
  if (Array.isArray(props.children)) {
    return resolveDeep(props.children);
  }
  const result = await resolveDeep([props.children]);
  return result;
};

export const jsx = <TOutput, TProps>(
  component: (props: ComponentProps<TProps, TOutput>) => MaybePromise<TOutput>,
  props: ComponentProps<TProps, TOutput> | null,
): (() => Promise<Awaited<TOutput> | Awaited<TOutput>[]>) => {
  // Return a promise that will be handled by execute()
  async function JsxWrapper(): Promise<Awaited<TOutput> | Awaited<TOutput>[]> {
    const rawResult = await component(
      props ?? ({} as ComponentProps<TProps, TOutput>),
    );

    if (props?.children) {
      props.children.__gsxIsChild = true;
    }

    const result = await resolveDeep(rawResult);
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
