import * as gensx from "@gensx/core";

const RespondToInput = gensx.Component<{ input: string }, string>(
  "RespondToInput",
  ({ input }) => {
    return input.toUpperCase();
  },
);

const workflow = gensx.Workflow("RespondToInputWorkflow", RespondToInput);

// Main function to run examples
async function main() {
  const result = await workflow.run({ input: "Hello, world!" });
  console.log(result);
}

main().catch(console.error);
