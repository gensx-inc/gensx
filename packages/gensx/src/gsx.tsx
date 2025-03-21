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
  export type Args<P extends object & { length?: never }, O> = gensx.Args<P, O>;
  export type StreamArgs<P extends object & { length?: never }> =
    gensx.StreamArgs<P>;
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
