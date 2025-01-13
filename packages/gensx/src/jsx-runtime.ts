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

export const Fragment = (props: {
  children: JSX.Element[] | JSX.Element;
}): JSX.Element[] => {
  console.log("Fragment", props.children, Array.isArray(props.children));
  if (Array.isArray(props.children)) {
    return props.children;
  }
  return [props.children];
};

export const jsx = <TOutput, TProps>(
  component: (props: ComponentProps<TProps, TOutput>) => MaybePromise<TOutput>,
  props: ComponentProps<TProps, TOutput> | null,
): (() => Promise<Awaited<TOutput> | Awaited<TOutput>[]>) => {
  // Return a promise that will be handled by execute()
  async function JsxWrapper(): Promise<Awaited<TOutput> | Awaited<TOutput>[]> {
    console.log(`component[${component.name}]`);
    const rawResult = await component(
      props ?? ({} as ComponentProps<TProps, TOutput>),
    );

    if (props?.children) {
      props.children.__gsxIsChild = true;
    }

    console.log(`rawResult[${component.name}]`, rawResult);
    const result = await resolveDeep(rawResult);
    console.log(`result[${component.name}]`, result, props?.children);

    if (props?.children && !props.children.__gsxChildExecuted) {
      props.children.__gsxChildExecuted = true;
      const childrenResult = await resolveDeep(props.children);
      console.log(`childrenResult[${component.name}]`, childrenResult);
      return childrenResult as Awaited<TOutput> | Awaited<TOutput>[];
    }

    console.log(`returning result[${component.name}]`, result);
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
