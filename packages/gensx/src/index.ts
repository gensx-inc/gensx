export { createContext, useContext } from "./context.js";
export { execute, Workflow } from "./execute.js";
export { Fragment, jsx, jsxs } from "./jsx-runtime.js";
export type { JSX } from "./jsx-runtime.js";
export { StreamComponent, Component } from "./component.js";
export type { ComponentOpts } from "./component.js";
export { array } from "./array.js";
export type {
  Args,
  Context,
  MaybePromise,
  Streamable,
  StreamArgs,
  GsxStreamComponent,
  GsxComponent,
  GSXToolParams,
  GSXToolAnySchema,
} from "./types.js";
export type { GsxArray } from "./array.js";

import { array } from "./array.js";
import { Component, StreamComponent } from "./component.js";
import { createContext, useContext } from "./context.js";
import { execute, Workflow } from "./execute.js";
import * as types from "./types.js";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace gsx {
  export type Args<P, O> = types.Args<P, O>;
  export type StreamArgs<P> = types.StreamArgs<P>;
}

export const gsx = {
  StreamComponent,
  Component,
  createContext,
  execute,
  Workflow,
  useContext,
  array,
};
