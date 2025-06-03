import * as gensx from "@gensx/core";

console.log("Module type: CommonJS");

const Greeter = async ({ name }: { name: string }): Promise<string> => {
  return `Hello, ${name}! This message was generated using CommonJS + JSX.`;
};

export const CommonJSWorkflow = gensx.Workflow(
  "CommonJSWorkflow",
  async (): Promise<string[]> => {
    return [
      await Greeter({ name: "World" }),
      await Greeter({ name: "CommonJS" }),
    ];
  },
);

async function main() {
  console.log("Running workflow...");
  const results = await CommonJSWorkflow({});
  console.log("Results:", results);
  return results;
}

module.exports = main;
