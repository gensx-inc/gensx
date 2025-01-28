import { gsx } from "gensx";

import {
  DeepSeekR1Completion,
  DeepSeekR1CompletionOutput,
} from "./deepseek-r1.js";

const result = await gsx.execute<DeepSeekR1CompletionOutput>(
  <DeepSeekR1Completion prompt="Write me a blog post about the future of AI." />,
);

console.log(result);
