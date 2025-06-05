import * as gensx from "@gensx/core";

export const RespondToInputWorkflow = gensx.Workflow(
  "RespondToInputWorkflow",
  async ({ input }: { input: string }): Promise<string> => {
    return input.toUpperCase();
  },
);

if (require.main === module) {
  RespondToInputWorkflow({ input: "Hello, world!" })
    .then((result) => console.log(result))
    .catch(console.error);
}
