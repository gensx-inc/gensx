import { gsx } from "gensx";
import OpenAI, { ClientOptions } from "openai";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { Stream } from "openai/streaming";

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

// Base types for OpenAI chat completion
export type OpenAIChatCompletionProps =
  | (Omit<ChatCompletionCreateParamsNonStreaming, "tools"> & {
      tools?: ChatCompletionTool[];
    })
  | (Omit<ChatCompletionCreateParamsStreaming, "tools"> & {
      tools?: ChatCompletionTool[];
    });

export type OpenAIChatCompletionOutput =
  | ChatCompletionOutput
  | Stream<ChatCompletionChunk>; // OpenAI chat completion component that directly calls the API

export const OpenAIChatCompletion = gsx.Component<
  OpenAIChatCompletionProps,
  OpenAIChatCompletionOutput
>("OpenAIChatCompletion", async (props) => {
  const context = gsx.useContext(OpenAIContext);
  if (!context.client) {
    throw new Error(
      "OpenAI client not found in context. Please wrap your component with OpenAIProvider.",
    );
  }

  return context.client.chat.completions.create(props);
});
