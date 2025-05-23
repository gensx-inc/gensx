import * as gensx from "@gensx/core";
import { ClientOptions, OpenAI } from "openai";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import {
  CreateEmbeddingResponse,
  EmbeddingCreateParams,
} from "openai/resources/embeddings.mjs";
import {
  Response,
  ResponseCreateParamsNonStreaming,
  ResponseCreateParamsStreaming,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";
import { Stream } from "openai/streaming";

// Create a context for OpenAI
export const OpenAIContext = gensx.createContext<{
  client: OpenAI | undefined;
}>({ client: process.env.OPENAI_API_KEY ? new OpenAI() : undefined });

export const OpenAIProvider = gensx.Component<ClientOptions, never>(
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

export const OpenAIChatCompletion = gensx.Component<
  OpenAIChatCompletionProps,
  OpenAIChatCompletionOutput
>("OpenAIChatCompletion", async (props) => {
  const context = gensx.useContext(OpenAIContext);

  if (!context.client) {
    throw new Error(
      "OpenAI client not found, do you need to wrap your component in an OpenAIProvider?",
    );
  }

  return context.client.chat.completions.create(props);
});

export type OpenAIResponsesProps =
  | ResponseCreateParamsStreaming
  | ResponseCreateParamsNonStreaming;

export type OpenAIResponsesOutput<
  P extends OpenAIResponsesProps = OpenAIResponsesProps,
> = P extends { stream: true } ? Stream<ResponseStreamEvent> : Response;

export const OpenAIResponses = gensx.Component<
  OpenAIResponsesProps,
  OpenAIResponsesOutput
>("OpenAIResponses", async (props) => {
  const context = gensx.useContext(OpenAIContext);

  if (!context.client) {
    throw new Error(
      "OpenAI client not found, do you need to wrap your component in an OpenAIProvider?",
    );
  }

  return context.client.responses.create(props);
});

export const OpenAIEmbedding = gensx.Component<
  EmbeddingCreateParams,
  CreateEmbeddingResponse
>("OpenAIEmbedding", (props) => {
  const context = gensx.useContext(OpenAIContext);

  if (!context.client) {
    throw new Error(
      "OpenAI client not found, do you need to wrap your component in an OpenAIProvider?",
    );
  }
  return context.client.embeddings.create(props);
});
