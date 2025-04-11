import { Anthropic, ClientOptions } from "@anthropic-ai/sdk";
import {
  Message,
  MessageCreateParamsNonStreaming,
  MessageCreateParamsStreaming,
  RawMessageStreamEvent,
  Tool,
} from "@anthropic-ai/sdk/resources/messages";
import { Stream } from "@anthropic-ai/sdk/streaming";
import * as gensx from "@gensx/core";

// Create a context for Anthropic
export const AnthropicContext = gensx.createContext<{
  client?: Anthropic;
}>({});

export const AnthropicProvider = gensx.Component<ClientOptions, never>(
  "AnthropicProvider",
  (args) => {
    const client = new Anthropic(args);
    return <AnthropicContext.Provider value={{ client }} />;
  },
  {
    secretProps: ["apiKey"],
  },
);

// Base types for Anthropic chat completion
export type AnthropicChatCompletionProps =
  | (Omit<MessageCreateParamsNonStreaming, "tools"> & {
      tools?: Tool[];
    })
  | (Omit<MessageCreateParamsStreaming, "tools"> & {
      tools?: Tool[];
    });

export type AnthropicChatCompletionOutput =
  | Message
  | Stream<RawMessageStreamEvent>;

export const AnthropicChatCompletion = gensx.Component<
  AnthropicChatCompletionProps,
  AnthropicChatCompletionOutput
>("AnthropicChatCompletion", (props) => {
  const context = gensx.useContext(AnthropicContext);
  if (!context.client) {
    throw new Error(
      "Anthropic client not found in context. Please wrap your component with AnthropicProvider.",
    );
  }

  return context.client.messages.create(props);
});
