import {
  array,
  Component,
  createContext,
  execute,
  StreamComponent,
  useContext,
  Workflow,
} from "@gensx/core";
import * as gensx from "@gensx/core";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace gsx {
  export type Args<P, O> = gensx.Args<P, O>;
  export type StreamArgs<P> = gensx.StreamArgs<P>;
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
