import { gsx } from "gensx";

import {
  GroqDeepSeekR1Completion,
  GroqDeepSeekR1CompletionOutput,
} from "./groq-deepseek-r1-distilled.js";

const result = await gsx.execute<GroqDeepSeekR1CompletionOutput>(
  <GroqDeepSeekR1Completion prompt="Write me a blog post about the future of AI." />,
);

console.log(result);
