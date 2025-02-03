/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ExecutionContext, getCurrentContext, withContext } from "./context";
import { resolveDeep } from "./resolve";
import {
  Args,
  ExecutableValue,
  MaybePromise,
  Primitive,
  StreamArgs,
} from "./types";

// Symbol to identify JSX elements
const REACT_ELEMENT_TYPE = Symbol.for("react.element");

export namespace JSX {
  export type ElementType = Element;
  export type Element = (props: Args<any, unknown>) => MaybePromise<unknown>;
  export interface ElementChildrenAttribute {
    children: (
      output: unknown,
    ) => JSX.Element | JSX.Element[] | Record<string, JSX.Element>;
  }
}

interface JSXElement<T, P = any> {
  type: (props: P) => MaybePromise<T>;
  props: P;
  $$typeof: symbol;
}

/**
 * Execute a JSX element by running its component with props.
 * Returns the raw result without resolution to allow children to transform it.
 */
async function executeJsxElement<T, P = any>(
  element: JSXElement<T, P>,
): Promise<T> {
  // Check if it's a JSX element
  if (typeof element !== "object" || element.$$typeof !== REACT_ELEMENT_TYPE) {
    return element as T;
  }

  const Component = element.type;
  const props = element.props;

  return await Component(props);
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

(Fragment as any).__gsxFragment = true;

export const jsx = <TOutput, TProps>(
  component: (
    props: Args<TProps, TOutput> | StreamArgs<TProps>,
  ) => MaybePromise<TOutput>,
  props: Args<TProps, TOutput> | null,
): (() => Promise<Awaited<TOutput> | Awaited<TOutput>[]>) => {
  async function JsxWrapper(): Promise<Awaited<TOutput> | Awaited<TOutput>[]> {
    // Get the current execution context
    const context = getCurrentContext();
    const isExecuteChildScope = context.isExecuteChildScope;

    // Get raw result from component execution
    const rawResult = await executeJsxElement<
      TOutput,
      Args<TProps, TOutput> | StreamArgs<TProps>
    >({
      type: component,
      props: props ?? ({} as Args<TProps, TOutput> | StreamArgs<TProps>),
      $$typeof: REACT_ELEMENT_TYPE,
    });

    // Special case Fragment since it's just a container
    if ((component as any).__gsxFragment) {
      return await resolveDeep(rawResult);
    }

    // Handle execution context
    if (rawResult instanceof ExecutionContext) {
      return await withContext(rawResult, () => {
        if (props?.children && !isExecuteChildScope) {
          const childResult = resolveChildren(null as never, props.children);
          return resolveDeep(childResult);
        }
        return resolveDeep(null as never);
      });
    }

    // For normal components:
    // Only resolve children if we're not in an executeChild scope
    if (props?.children && !isExecuteChildScope) {
      const childResult = resolveChildren(rawResult as TOutput, props.children);
      return await resolveDeep(childResult);
    }

    return await resolveDeep(rawResult);
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
