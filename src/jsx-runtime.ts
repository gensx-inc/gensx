/* eslint-disable @typescript-eslint/no-namespace */
export namespace JSX {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type ElementType = (props: any) => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  // interface IntrinsicElements {}
  export type Element = Promise<unknown>;
  export interface ElementChildrenAttribute {
    children: (output: unknown) => JSX.Element | JSX.Element[];
  }
}

export type MaybePromise<T> = T | Promise<T>;

export const Fragment = (props: {
  children: JSX.Element[] | JSX.Element;
}): JSX.Element[] => {
  if (Array.isArray(props.children)) {
    return props.children;
  }

  return [props.children];
};

export const jsx = <
  TOutput,
  TProps extends Record<string, unknown> & {
    children?: (output: TOutput) => MaybePromise<JSX.Element | JSX.Element[]>;
  },
>(
  component: (props: TProps) => MaybePromise<TOutput>,
  props: TProps | null,
  children?: (output: TOutput) => MaybePromise<JSX.Element | JSX.Element[]>,
): Promise<TOutput | TOutput[]> => {
  if (!children && props?.children) {
    children = props.children;
  }
  return Promise.resolve(component(props ?? ({} as TProps))).then(result => {
    if (children) {
      // If its an array of elements, this is an edge case for a Fragment.
      if (Array.isArray(children)) {
        return Promise.all(children);
      }
      if (typeof children === "function") {
        // If the components child function returns an array of elements, we need to resolve them all
        const childrenResult = children(result);
        if (Array.isArray(childrenResult)) {
          return Promise.all(childrenResult);
        }
        return Promise.resolve(childrenResult);
      }

      // If its a single element, this is an edge case for a Fragment.
      return Promise.resolve(children);
    }
    return result;
  }) as Promise<TOutput | TOutput[]>;
};

export const jsxs = <
  TOutput,
  TProps extends Record<string, unknown> & {
    children?: (output: TOutput) => MaybePromise<JSX.Element | JSX.Element[]>;
  },
>(
  component: (props: TProps) => MaybePromise<TOutput>,
  props: TProps | null,
  children?: (output: TOutput) => MaybePromise<JSX.Element | JSX.Element[]>,
): Promise<TOutput | TOutput[]> => {
  return jsx(component, props, children);
};
