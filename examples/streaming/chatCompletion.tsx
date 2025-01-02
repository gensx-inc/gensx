import { gsx } from "gensx";

import { createLLMService } from "./llm.js";

const llm = createLLMService({
  model: "gpt-4",
  temperature: 0.7,
});

interface ChatCompletionProps {
  prompt: string;
}

export const ChatCompletion = gsx.StreamComponent<ChatCompletionProps>(
  async ({ prompt }) => {
    // Use the LLM service's streaming API
    const result = await llm.completeStream(prompt);

    return result.stream();
  },
);
