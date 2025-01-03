import type { Streamable } from "gensx";

import {
  Component,
  ContextProvider,
  getCurrentContext,
  StreamComponent,
} from "gensx";
import OpenAI from "openai";
import {
  ChatCompletionCreateParamsNonStreaming,
  type ChatCompletionMessageParam,
} from "openai/resources/chat";

declare module "gensx" {
  interface WorkflowContext {
    openai?: OpenAI;
  }
}

export interface OpenAIConfig {
  apiKey?: string;
  organization?: string;
}

export const OpenAIProvider = ContextProvider(
  ({ apiKey, organization }: OpenAIConfig) => {
    const openai = new OpenAI({
      apiKey,
      organization,
    });

    return { openai };
  },
);

interface BaseChatCompletionProps {
  messages: ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionProps extends BaseChatCompletionProps {
  responseFormat?: ChatCompletionCreateParamsNonStreaming["response_format"];
}

export const ChatCompletion = Component<ChatCompletionProps, string>(
  async ({
    messages,
    model = "gpt-3.5-turbo",
    temperature = 1,
    maxTokens,
    responseFormat,
  }) => {
    const context = getCurrentContext();
    const openai = context.get("openai");

    if (!openai) {
      throw new Error(
        "OpenAI client not found in context. Please wrap your component with OpenAIProvider.",
      );
    }

    const completion = await openai.chat.completions.create({
      messages,
      model,
      temperature,
      max_tokens: maxTokens,
      response_format: responseFormat,
    });

    return completion.choices[0]?.message?.content ?? "";
  },
);

export type ChatCompletionStreamProps = BaseChatCompletionProps;
export const ChatCompletionStream = StreamComponent(
  async ({
    messages,
    model = "gpt-3.5-turbo",
    temperature = 1,
    maxTokens,
  }: ChatCompletionStreamProps) => {
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
