/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Streamable } from "gensx";

import { gsx } from "gensx";
import OpenAI, { ClientOptions } from "openai";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";
import { Stream } from "openai/streaming";

import { GSXCompletion } from "./gsx-completion.js";
import { GSXTool } from "./new-completion.js";

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
  {
    secretProps: ["apiKey"],
  },
);

// Base props type from OpenAI
type TextCompletionProps = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream?: boolean;
  tools?: GSXTool<any>[];
};

export const TextCompletion = gsx.StreamComponent<TextCompletionProps>(
  "TextCompletion",
  async (props) => {
    if (props.stream) {
      const stream = await gsx.execute<Stream<ChatCompletionChunk>>(
        <GSXCompletion {...props} stream={true} />,
      );

      // Transform Stream<ChatCompletionChunk> into AsyncIterableIterator<string>
      const generateTokens = async function* () {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        }
      };

      return generateTokens();
    } else {
      const response = await gsx.execute<ChatCompletionOutput>(
        <GSXCompletion {...props} stream={false} />,
      );
      const content = response.choices[0]?.message?.content ?? "";

      // Use sync iterator for non-streaming case, matching ChatCompletion's behavior
      function* generateTokens() {
        yield content;
      }

      return generateTokens();
    }
  },
);

// Create a component for chat completions
export const ChatCompletion = gsx.StreamComponent<ChatCompletionCreateParams>(
  "ChatCompletion",
  async (props) => {
    const context = gsx.useContext(OpenAIContext);

    if (!context.client) {
      throw new Error(
        "OpenAI client not found in context. Please wrap your component with OpenAIProvider.",
      );
    }

    if (props.stream) {
      const stream = await context.client.chat.completions.create(props);

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
      const response = await context.client.chat.completions.create(props);
      const content = response.choices[0]?.message?.content ?? "";

      function* generateTokens() {
        yield content;
      }

      return generateTokens();
    }
  },
);

export { GSXCompletion } from "./gsx-completion.js";
export { GSXTool, GSXStructuredOutput } from "./new-completion.js";
