/* eslint-disable @typescript-eslint/no-namespace */
type Primitive = string | number | boolean | null | undefined; // TODO: Add array and object

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type ElementType = (props: any) => Primitive | Element<any, any>;
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements {}
    export type Element<TOutput, TInput> = Component<TOutput, TInput>;
    interface ElementChildrenAttribute {
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      handleOutput: {}; // specify what the name of the children prop is
    }
  }
}

export type MaybePromise<T> = T | Promise<T>;

export interface Component<TOutput, TProps> {
  type: (props: TProps) => MaybePromise<TOutput>;
  props: TProps;
}

export const jsx = <TOutput, TProps>(
  component: (props: TProps) => MaybePromise<TOutput>,
  props: TProps | null,
): JSX.Element<TOutput, TProps> => {
  return {
    type: component,
    props: props ?? ({} as TProps),
  };
};
