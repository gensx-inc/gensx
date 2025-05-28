import * as gensx from "@gensx/core";
import { OpenAI } from "@gensx/openai";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY environment variable is not set");
}

const openai = new OpenAI({
  apiKey,
  baseURL: "https://openrouter.ai/api/v1",
});

export interface OpenRouterCompletionProps {
  userInput: string;
}

export interface OpenRouterCompletionOutput {
  response: string;
}

export const OpenRouterCompletion = gensx.Workflow(
  "OpenRouterCompletion",
  async ({
    userInput,
  }: OpenRouterCompletionProps): Promise<OpenRouterCompletionOutput> => {
    const response = await openai.chat.completions.create({
      model: "anthropic/claude-3.7-sonnet",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Respond to the user's input.",
        },
        { role: "user", content: userInput },
      ],
      stream: false,
    });

    return {
      response: response.choices[0].message.content ?? "",
    };
  },
);
