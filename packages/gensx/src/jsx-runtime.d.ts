import { MaybePromise } from "./types";

export declare function jsx(
  component: (props: unknown) => MaybePromise<unknown>,
  props: object,
  elementName?: string,
): unknown;

export declare const jsxs: typeof jsx;

export declare const Fragment: (props: { children: unknown }) => unknown;
