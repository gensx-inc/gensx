import * as gensx from "@gensx/core";
import { streamText, wrapVercelAIModel } from "@gensx/vercel-ai";
import {
  ModelMessage,
  ToolSet,
  wrapLanguageModel,
  TextPart,
  ToolCallPart,
  ToolResultPart,
  smoothStream,
  stepCountIs,
  AssistantContent,
} from "ai";

import { LanguageModelV2, SharedV2ProviderMetadata } from "@ai-sdk/provider";

interface ReasoningPart {
  type: "reasoning";
  text: string;
}

interface AgentProps {
  messages: ModelMessage[];
  tools: ToolSet;
  model: LanguageModelV2;
  maxSteps?: number;
  providerOptions?: SharedV2ProviderMetadata;
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
    const allMessages: ModelMessage[] = [];

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
              content: result.content as AssistantContent,
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
      stopWhen: stepCountIs(maxSteps),
      model: wrappedLanguageModel,
      tools,
      providerOptions,
      temperature: 0,
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
            accumulatedText += chunk.text;
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
          case "reasoning-delta":
            accumulatedReasoning += chunk.text;
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
            let parsedArgs = chunk.input;
            if (typeof chunk.input === "string") {
              try {
                parsedArgs = JSON.parse(chunk.input);
              } catch {
                console.warn("Failed to parse tool args:", chunk.input);
                parsedArgs = chunk.input;
              }
            }
            contentParts.push({
              type: "tool-call",
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              input: parsedArgs,
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
              nextMessage.content.push(chunk as ToolResultPart);
            } else {
              allMessages.splice(toolCallMessageIndex + 1, 0, {
                role: "tool",
                content: [chunk as ToolResultPart],
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
