import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";
import { ChatCompletionCreateParams } from "openai/resources/chat/completions.mjs";

type PerplexityCompletionOutput = string;

export const PerplexityCompletion = gsx.Component<
  ChatCompletionCreateParams,
  PerplexityCompletionOutput
>("PerplexityCompletion", async (params) => {
  return (
    <OpenAIProvider
      apiKey={process.env.PERPLEXITY_API_KEY}
      baseURL="https://api.perplexity.ai"
    >
      <ChatCompletion
        {...(params as ChatCompletionCreateParams)}
        stream={false}
      />
    </OpenAIProvider>
  );
});
