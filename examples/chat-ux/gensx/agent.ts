import { SharedV2ProviderMetadata, LanguageModelV2 } from "@ai-sdk/provider";
import * as gensx from "@gensx/core";
import { streamText } from "@gensx/vercel-ai";
import {
  ModelMessage,
  ToolSet,
  wrapLanguageModel,
  TextPart,
  ToolCallPart,
  stepCountIs,
  AssistantContent,
} from "ai";

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
      model: model,
      middleware: [
        {
          wrapGenerate: async ({ doGenerate }) => {
            const result = await doGenerate();
            console.log("result", result);

            // Add assistant response to messages
            allMessages.push({
              role: "assistant",
              content: result.content as AssistantContent,
            });

            publishMessages();

            return result;
          },
          wrapStream: async ({ doStream, params }) => {
            // Find the last assistant message and pull in any tool responses after it
            const lastAssistantIndex = params.prompt.findLastIndex(
              (msg: ModelMessage) => msg.role === "assistant",
            );
            if (lastAssistantIndex !== -1) {
              const toolMessagesAfterLastAssistant = params.prompt
                .slice(lastAssistantIndex + 1)
                .filter((msg: ModelMessage) => msg.role === "tool");
              allMessages.push(...toolMessagesAfterLastAssistant);
            }

            publishMessages();

            const { stream, ...rest } = await doStream();

            // Add initial assistant message
            const assistantMessageIndex = allMessages.length;
            allMessages.push({
              role: "assistant",
              content: [],
            });

            let accumulatedText = "";
            let accumulatedReasoning = "";
            const contentParts: Array<TextPart | ToolCallPart | ReasoningPart> =
              [];

            const transformStream = new TransformStream({
              transform(chunk, controller) {
                console.log("chunk", chunk);
                if (chunk.type === "text-delta") {
                  accumulatedText += chunk.delta;

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

                  allMessages[assistantMessageIndex].content = [
                    ...contentParts,
                  ];
                  publishMessages();
                } else if (chunk.type === "reasoning-delta") {
                  accumulatedReasoning += chunk.delta;

                  // Update or add reasoning part
                  const existingReasoningPartIndex = contentParts.findIndex(
                    (part) => part.type === "reasoning",
                  );
                  if (existingReasoningPartIndex >= 0) {
                    const reasoningPart =
                      contentParts[existingReasoningPartIndex];
                    if (reasoningPart.type === "reasoning") {
                      reasoningPart.text = accumulatedReasoning;
                    }
                  } else {
                    contentParts.push({
                      type: "reasoning",
                      text: accumulatedReasoning,
                    });
                  }

                  allMessages[assistantMessageIndex].content = [
                    ...contentParts,
                  ];
                  publishMessages();
                } else if (chunk.type === "tool-call") {
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

                  allMessages[assistantMessageIndex].content = [
                    ...contentParts,
                  ];
                  publishMessages();
                }

                controller.enqueue(chunk);
              },
              flush() {
                // Final publish when stream is complete
                publishMessages();
              },
            });

            return {
              stream: stream.pipeThrough(transformStream),
              ...rest,
            };
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

    const result = streamText({
      messages: filteredMessages,
      stopWhen: stepCountIs(maxSteps),
      model: wrappedLanguageModel,
      tools,
      providerOptions,
    });

    let response = "";
    for await (const chunk of result.textStream) {
      response += chunk;
    }

    return { response, messages: allMessages };
  },
);
