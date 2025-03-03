import { chefAgentWorkflow } from "./chef.js";

async function main() {
  const result = await chefAgentWorkflow.run(
    {
      meal: "I would love a tasty pizza. I'm in the mood for a classic margherita.",
    },
    { printUrl: true },
  );
  console.log(result);
}

void main();
