export { Component, StreamComponent } from "./component";
export { createContext, useContext } from "./context";
export { execute } from "./resolve";
export { Fragment, jsx, jsxs } from "./jsx-runtime";
export type { JSX } from "./jsx-runtime";
export type {
  ComponentProps,
  Context,
  MaybePromise,
  Streamable,
  StreamComponentProps,
  StreamingComponent,
  WorkflowComponent,
} from "./types";

import { Component, StreamComponent } from "./component";
import { createContext, useContext } from "./context";
import { execute } from "./resolve";

export const gsx = {
  Component,
  StreamComponent,
  createContext,
  execute,
  useContext,
};
