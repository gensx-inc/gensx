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
  OpenAIProvider,
} from "./openai.js";
import { GSXTool, GSXToolAnySchema } from "./tools.js";

export {
  OpenAIProvider,
  GSXChatCompletion,
  GSXTool,
  OpenAIChatCompletion,
  ChatCompletion,
  OpenAIContext,
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
};
