/* eslint-disable @typescript-eslint/no-namespace */
// type Primitive = string | number | boolean | null | undefined; // TODO: Add array and object

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type ElementType = (props: any) => Promise<string>;
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements {}
    export type Element = Promise<string>;
    export interface ElementChildrenAttribute {
      children: (output: string) => MaybePromise<string>;
    }
  }
}

export type MaybePromise<T> = T | Promise<T>;

// export interface Component<TOutput, TProps> {
//   type: (props: TProps) => MaybePromise<TOutput>;
//   props: TProps;
// }

export const jsx = <
  TProps extends Record<string, unknown> & {
    children?: (output: string) => MaybePromise<string>;
  },
>(
  component: (props: TProps) => MaybePromise<string>,
  props: TProps | null,
  children?:
    | ((output: string) => MaybePromise<string>)
    | ((output: string) => MaybePromise<string>)[],
): Promise<string> => {
  console.log("jsx", { component, props, children });
  if (!children && props?.children) {
    children = props.children;
  }
  return Promise.resolve(component(props ?? ({} as TProps))).then(result => {
    console.log("jsx result", { result, children });
    if (children) {
      if (Array.isArray(children)) {
        console.log("jsx children is array", { children });
        return Promise.all(
          children.map(child => {
            if (child instanceof Function) {
              return child(result);
            }
            return child;
          }),
        ).then(result => {
          console.log("jsx children is array result", { result });
          return result.join("\n");
        });
      }
      return children(result);
    }
    return result;
  });
};
