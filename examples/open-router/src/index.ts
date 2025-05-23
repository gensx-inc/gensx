import { OpenRouterCompletion } from "./workflows.js";

const result = await OpenRouterCompletion({
  userInput: "Write a short story about a cat that can fly.",
});

console.log("\n🚀 === AI RESPONSE === 🚀\n");
console.log(result.response);
