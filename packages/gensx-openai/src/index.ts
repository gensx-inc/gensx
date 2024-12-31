import type { ExecutableValue, Streamable } from "gensx";

import {
  Component,
  getCurrentContext,
  StreamComponent,
  withContext,
} from "gensx";
import OpenAI from "openai";
import { type ChatCompletionMessageParam } from "openai/resources/chat";

declare module "gensx" {
  interface WorkflowContext {
    openai?: OpenAI;
  }
}

export interface OpenAIConfig {
  apiKey: string;
  organization?: string;
}

export const OpenAIProvider = Component(
  async ({
    apiKey,
    organization,
    children,
  }: OpenAIConfig & { children: () => Promise<ExecutableValue> }) => {
    const openai = new OpenAI({
      apiKey,
      organization,
    });

    return await withContext({ openai }, children);
  },
);

export interface ChatCompletionProps {
  messages: ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export const ChatCompletion = StreamComponent(
  async ({
    messages,
    model = "gpt-3.5-turbo",
    temperature = 1,
    maxTokens,
  }: ChatCompletionProps) => {
    const context = getCurrentContext();
    const openai = context.get("openai");

    if (!openai) {
      throw new Error(
        "OpenAI client not found in context. Please wrap your component with OpenAIProvider.",
      );
    }

    const stream = await openai.chat.completions.create({
      messages,
      model,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    async function* generateTokens(): AsyncGenerator<string, void, undefined> {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    }

    const streamable: Streamable = generateTokens();

    return streamable;
  },
);
