import { GroqDeepSeekR1Completion } from "./workflows.js";

const result = await GroqDeepSeekR1Completion({
  prompt: "Write me a blog post about the future of AI.",
});

console.log("\n🧠 === THINKING PROCESS === 🧠\n");
console.log(result.thinking);
console.log("\n🚀 === FINAL OUTPUT === 🚀\n");
console.log(result.completion);
