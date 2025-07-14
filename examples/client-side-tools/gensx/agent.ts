import * as gensx from "@gensx/core";
import { streamText, wrapVercelAIModel } from "@gensx/vercel-ai";
import {
  CoreMessage,
  ToolSet,
  wrapLanguageModel,
  TextPart,
  ToolCallPart,
  LanguageModelV1,
  ToolResultPart,
  smoothStream,
} from "ai";

import { type LanguageModelV1ProviderMetadata } from "@ai-sdk/provider";

interface ReasoningPart {
  type: "reasoning";
  text: string;
}

interface AgentProps {
  messages: CoreMessage[];
  tools: ToolSet;
  model: LanguageModelV1;
  maxSteps?: number;
  providerOptions?: LanguageModelV1ProviderMetadata;
}

export const Agent = gensx.Component(
  "Agent",
  async ({
    messages,
    tools,
    model,
    maxSteps = 50,
    providerOptions,
  }: AgentProps) => {
    // Track all messages including responses
    const allMessages: CoreMessage[] = [];

    const publishMessages = () => {
      gensx.publishObject("messages", {
        messages: JSON.parse(JSON.stringify(allMessages)),
      });
    };

    const wrappedLanguageModel = wrapLanguageModel({
      model: wrapVercelAIModel(model),
      middleware: [
        {
          wrapGenerate: async ({ doGenerate }) => {
            const result = await doGenerate();

            // Add assistant response to messages
            allMessages.push({
              role: "assistant",
              content: result.text ?? "",
            });

            publishMessages();

            return result;
          },
        },
      ],
    });

    // Filter out reasoning messages before passing to streamText
    const filteredMessages = messages.map((message) => {
      if (message.role === "assistant" && Array.isArray(message.content)) {
        // Filter out reasoning parts from assistant messages
        const filteredContent = message.content.filter(
          (part) => !("type" in part && part.type === "reasoning"),
        );
        return {
          ...message,
          content:
            filteredContent.length > 0 ? filteredContent : message.content,
        };
      }
      return message;
    });

    // State for streaming
    let response = "";
    let accumulatedText = "";
    let accumulatedReasoning = "";
    const contentParts: Array<TextPart | ToolCallPart | ReasoningPart> = [];
    let assistantMessageIndex: number | null = null;

    const result = streamText({
      messages: filteredMessages,
      maxSteps,
      model: wrappedLanguageModel,
      tools,
      providerOptions,
      toolCallStreaming: true,
      experimental_transform: smoothStream(),
      onChunk: ({ chunk: streamChunk }) => {
        const chunk = streamChunk as typeof streamChunk | ToolResultPart;
        if (assistantMessageIndex === null) {
          // Add initial assistant message
          assistantMessageIndex = allMessages.length;
          allMessages.push({
            role: "assistant",
            content: [],
          });
        }
        switch (chunk.type) {
          case "text-delta":
            accumulatedText += chunk.textDelta;
            // Update or add text part
            const existingTextPartIndex = contentParts.findIndex(
              (part) => part.type === "text",
            );
            if (existingTextPartIndex >= 0) {
              const textPart = contentParts[existingTextPartIndex];
              if (textPart.type === "text") {
                textPart.text = accumulatedText;
              }
            } else {
              contentParts.push({
                type: "text",
                text: accumulatedText,
              });
            }
            allMessages[assistantMessageIndex].content = [...contentParts];
            publishMessages();
            break;
          case "reasoning":
            accumulatedReasoning += chunk.textDelta;
            // Update or add reasoning part
            const existingReasoningPartIndex = contentParts.findIndex(
              (part) => part.type === "reasoning",
            );
            if (existingReasoningPartIndex >= 0) {
              const reasoningPart = contentParts[existingReasoningPartIndex];
              if (reasoningPart.type === "reasoning") {
                reasoningPart.text = accumulatedReasoning;
              }
            } else {
              contentParts.push({
                type: "reasoning",
                text: accumulatedReasoning,
              });
            }
            allMessages[assistantMessageIndex].content = [...contentParts];
            publishMessages();
            break;
          case "tool-call":
            // Add tool call part - ensure args is an object, not a string
            let parsedArgs = chunk.args;
            if (typeof chunk.args === "string") {
              try {
                parsedArgs = JSON.parse(chunk.args);
              } catch {
                console.warn("Failed to parse tool args:", chunk.args);
                parsedArgs = chunk.args;
              }
            }
            contentParts.push({
              type: "tool-call",
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              args: parsedArgs,
            });
            allMessages[assistantMessageIndex].content = [...contentParts];
            publishMessages();
            break;
          case "tool-result":
            // if this is already in the messages, skip
            if (
              messages.find(
                (message) =>
                  Array.isArray(message.content) &&
                  message.content.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (part: any) =>
                      (part.type === "tool-result" ||
                        part.type === "tool_result") &&
                      part.toolCallId === chunk.toolCallId,
                  ),
              ) ||
              allMessages.find(
                (message) =>
                  Array.isArray(message.content) &&
                  message.content.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (part: any) =>
                      (part.type === "tool-result" ||
                        part.type === "tool_result") &&
                      part.toolCallId === chunk.toolCallId,
                  ),
              )
            ) {
              break;
            }

            // Find the tool call that matches this id, and add the result in a 'tool' message immediately after it
            const toolCallMessageIndex = allMessages.findIndex(
              (message) =>
                message.role === "assistant" &&
                Array.isArray(message.content) &&
                message.content.find(
                  (part) =>
                    part.type === "tool-call" &&
                    part.toolCallId === chunk.toolCallId,
                ),
            );
            if (toolCallMessageIndex === -1) {
              console.warn("Got tool result for unknown tool call", {
                chunk,
              });
              break;
            }
            // Check if the message already has a tool message after it
            const nextMessage = allMessages[toolCallMessageIndex + 1];
            if (nextMessage?.role === "tool") {
              nextMessage.content.push(chunk);
            } else {
              allMessages.splice(toolCallMessageIndex + 1, 0, {
                role: "tool",
                content: [chunk],
              });
            }
            publishMessages();
            break;
          default:
            // console.debug("Unhandled chunk type", { chunk });
            break;
        }
      },
      onStepFinish: () => {
        // Finalize the current assistant message and prepare for the next one
        assistantMessageIndex = null;
        accumulatedText = "";
        accumulatedReasoning = "";
        contentParts.length = 0;
      },
      onError: (error) => {
        throw new Error("Error in Agent", { cause: error });
      },
      onFinish: () => {
        // Final publish when stream is complete
        publishMessages();
      },
    });

    for await (const chunk of result.textStream) {
      response += chunk;
    }

    return { response, messages: allMessages };
  },
  { idPropsKeys: ["messages"] },
);
