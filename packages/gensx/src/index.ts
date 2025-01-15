export { createContext, useContext } from "./context";
export { execute } from "./resolve";
export { Fragment, jsx, jsxs } from "./jsx-runtime";
export type { JSX } from "./jsx-runtime";
export { StreamComponent } from "./component";
export type {
  ComponentProps,
  Context,
  MaybePromise,
  Streamable,
  StreamComponentProps,
  Component,
} from "./types";

import { StreamComponent } from "./component";
import { createContext, useContext } from "./context";
import { execute } from "./resolve";
import * as types from "./types";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace gsx {
  export type Component<P, O> = types.Component<P, O>;
  export type ComponentProps<P, O> = types.ComponentProps<P, O>;
  export type StreamComponentProps<P> = types.StreamComponentProps<P>;
}

export const gsx = {
  StreamComponent,
  createContext,
  execute,
  useContext,
};
