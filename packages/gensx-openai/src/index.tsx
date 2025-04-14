import type { GSXToolAnySchema, GSXToolProps } from "@gensx/core";

import {
  ChatCompletion,
  ChatCompletionProps,
  GSXChatCompletion,
  GSXChatCompletionOutput,
  GSXChatCompletionProps,
  GSXChatCompletionResult,
} from "./gsx-completion.js";
import {
  OpenAIChatCompletion,
  OpenAIChatCompletionProps,
  OpenAIContext,
  OpenAIEmbedding,
  OpenAIProvider,
  OpenAIResponses,
  OpenAIResponsesProps,
} from "./openai.js";
import { GSXTool } from "./tools.js";

export {
  OpenAIProvider,
  GSXChatCompletion,
  GSXTool,
  OpenAIEmbedding,
  OpenAIChatCompletion,
  ChatCompletion,
  OpenAIContext,
  OpenAIResponses,
};

// Export the type of GSXChatCompletion itself
export type GSXChatCompletionType = typeof GSXChatCompletion;

export type {
  GSXChatCompletionProps,
  ChatCompletionProps,
  OpenAIChatCompletionProps,
  GSXChatCompletionOutput,
  GSXChatCompletionResult,
  GSXToolAnySchema,
  GSXToolProps,
  OpenAIResponsesProps,
};
