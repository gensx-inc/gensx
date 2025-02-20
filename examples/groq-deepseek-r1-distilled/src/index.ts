import { gsx } from "gensx";

import { GroqDeepSeekR1Completion } from "./groq-deepseek-r1-distilled.js";

const result = await gsx
  .Workflow("GroqDeepSeekR1Example", GroqDeepSeekR1Completion)
  .run({
    prompt: "Write me a blog post about the future of AI.",
  });

console.log(result);
