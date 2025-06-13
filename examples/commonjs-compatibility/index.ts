import * as gensx from "@gensx/core";
import leftPad from "left-pad";

const RespondToInput = gensx.Workflow(
  "RespondToInput",
  ({ input }: { input: string }) => {
    return leftPad(input.toUpperCase(), 10, "!");
  },
);

// Main function to run examples
export async function main() {
  const result = await RespondToInput({ input: "Hello, world!" });
  console.log(result);
}

main().catch(console.error);
