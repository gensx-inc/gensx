import * as gensx from "@gensx/core";

import { GroqDeepSeekR1Completion } from "./groq-deepseek-r1-distilled.js";

const result = await gensx
  .Workflow("GroqDeepSeekR1Example", GroqDeepSeekR1Completion)
  .run({
    prompt: "Write me a blog post about the future of AI.",
  });

console.log(result);
