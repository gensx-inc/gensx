/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type ElementType<T = unknown> = (props: any) => Promise<T>;
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements {}
    export type Element = Promise<unknown>;
    export interface ElementChildrenAttribute {
      children: (output: unknown) => MaybePromise<unknown>;
    }
  }
}

export type MaybePromise<T> = T | Promise<T>;

export type Child<T = unknown> = JSX.Element | ((output: T) => JSX.Element);
export type Children<T = unknown> = Child<T> | Child<T>[];

export const Fragment = (props: { children: Children }): Promise<unknown[]> => {
  if (Array.isArray(props.children)) {
    return Promise.all(
      props.children.map(child => {
        if (child instanceof Function) {
          return child(null);
        }
        return child;
      }),
    );
  }

  return Promise.all([props.children]);
};

// export interface Component<TOutput, TProps> {
//   type: (props: TProps) => MaybePromise<TOutput>;
//   props: TProps;
// }

export const jsx = <
  TOutput,
  TProps extends Record<string, unknown> & {
    children?: Children<TOutput>;
  },
>(
  component: (props: TProps) => MaybePromise<TOutput>,
  props: TProps | null,
  children?: Children<TOutput>,
): Promise<TOutput | TOutput[]> => {
  if (!children && props?.children) {
    children = props.children;
  }
  return Promise.resolve(component(props ?? ({} as TProps))).then(result => {
    if (children) {
      if (Array.isArray(children)) {
        return Promise.all(
          children.map(child => {
            if (child instanceof Function) {
              return child(result);
            }
            return child;
          }),
        ).then(result => {
          return result as TOutput[];
        });
      }
      if (children instanceof Function) {
        return children(result) as TOutput;
      }
      return children as TOutput;
    }
    return result as TOutput;
  });
};

export const jsxs = <
  TOutput,
  TProps extends Record<string, unknown> & {
    children?: Children<TOutput>;
  },
>(
  component: (props: TProps) => MaybePromise<TOutput>,
  props: TProps | null,
  children?: Children<TOutput>,
): Promise<TOutput | TOutput[]> => {
  return jsx(component, props, children);
};
