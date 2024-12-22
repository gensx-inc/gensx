import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
  retryDelay?: number;
}

class LLMError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

export function createLLMService(config: LLMConfig) {
  const {
    model = "gpt-4",
    temperature = 0.7,
    maxTokens,
    maxRetries = 3,
    retryDelay = 1000,
  } = config;

  async function chat(messages: ChatMessage[]): Promise<string> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new LLMError("No content in response");
        }

        return content;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on invalid requests
        if (error instanceof OpenAI.APIError && error.status === 400) {
          throw new LLMError("Invalid request to OpenAI", error);
        }

        // Last attempt failed
        if (attempt === maxRetries - 1) {
          throw new LLMError(
            `Failed to get completion after ${maxRetries} attempts`,
            lastError,
          );
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    // This should never happen due to the loop above
    throw new LLMError("Unexpected end of chat function");
  }

  async function complete(prompt: string): Promise<string> {
    return chat([{ role: "user", content: prompt }]);
  }

  return {
    chat,
    complete,
  };
}

// Example usage:
// const llm = createLLMService({
//   model: "gpt-4",
//   temperature: 0.7,
//   maxRetries: 3,
// });
//
// const response = await llm.chat([
//   { role: "system", content: "You are a helpful assistant." },
//   { role: "user", content: "Hello!" }
// ]);
