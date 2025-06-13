import * as gensx from "@gensx/core";
import leftPad from "left-pad";

const RespondToInput = gensx.Workflow(
  "RespondToInput",
  ({ input }: { input: string }) => {
    return leftPad(input.toUpperCase(), 20, ">");
  },
);

export = RespondToInput;
