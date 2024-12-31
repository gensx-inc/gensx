import { Component, StreamComponent } from "./component";
import { withContext } from "./context";
import { execute } from "./resolve";

export * from "./component";
export * from "./context";
export * from "./jsx-runtime";
export * from "./types";

export const gsx = {
  Component,
  StreamComponent,
  withContext,
  execute,
};
