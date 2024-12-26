import { gsx } from "@/index";
import { createLLMService } from "@/llm";

const llm = createLLMService({
  model: "gpt-4",
  temperature: 0.7,
});

interface ChatCompletionProps {
  prompt: string;
}

export const ChatCompletion = gsx.StreamComponent<ChatCompletionProps, string>(
  async ({ prompt }) => {
    // Use the LLM service's streaming API
    const result = await llm.completeStream(prompt);

    return {
      stream: result.stream,
      value: result.value,
    };
  },
);
