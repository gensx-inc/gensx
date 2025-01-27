import type { Streamable } from "gensx";

import { gsx, GsxTool } from "gensx";
import OpenAI, { ClientOptions } from "openai";
import { zodFunction } from "openai/helpers/zod";
import {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionTool,
} from "openai/resources/index.mjs";
import { Stream } from "openai/streaming";
import { z } from "zod";

// Create a context for OpenAI
export const OpenAIContext = gsx.createContext<{
  client?: OpenAI;
}>({});

export const OpenAIProvider = gsx.Component<ClientOptions, never>(
  "OpenAIProvider",
  (args) => {
    const client = new OpenAI(args);
    return <OpenAIContext.Provider value={{ client }} />;
  },
);

type ChatCompletionProps = ChatCompletionCreateParams & {
  gsxTools: GsxTool<z.ZodType, unknown>[];
  gsxExecuteTools: boolean;
};

// Create a component for chat completions
export const ChatCompletion = gsx.StreamComponent<ChatCompletionProps>(
  "ChatCompletion",
  async (props) => {
    const context = gsx.useContext(OpenAIContext);

    if (!context.client) {
      throw new Error(
        "OpenAI client not found in context. Please wrap your component with OpenAIProvider.",
      );
    }

    // Convert GenSX tools to OpenAI tools
    const openAITools: ChatCompletionTool[] | undefined = props.gsxTools.map(
      (tool): ChatCompletionTool => {
        const { name, description, parameters } = tool.toJSON();
        return zodFunction({
          name,
          parameters,
          description,
        });
      },
    );

    if (props.stream) {
      // Remove gsx related props and send the rest to OpenAI
      const { gsxTools, gsxExecuteTools, ...otherProps } = props;
      const stream = await context.client.chat.completions.create({
        ...otherProps,
        tools: openAITools,
      });

      async function* generateTokens(): AsyncGenerator<
        string,
        void,
        undefined
      > {
        for await (const chunk of stream as Stream<ChatCompletionChunk>) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        }
      }

      const streamable: Streamable = generateTokens();
      return streamable;
    } else {
      // Remove gsx related props and send the rest to OpenAI
      const { gsxTools, gsxExecuteTools, ...otherProps } = props;
      const response = await context.client.chat.completions.create({
        ...otherProps,
        tools: openAITools,
      });
      const content = response.choices[0]?.message?.content ?? "";

      function* generateTokens() {
        yield content;
      }

      return generateTokens();
    }
  },
);
