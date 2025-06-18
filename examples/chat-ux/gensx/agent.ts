import * as gensx from "@gensx/core";
import { streamText } from "@gensx/vercel-ai";
import { anthropic, AnthropicProviderOptions } from "@ai-sdk/anthropic";
import {
  CoreMessage,
  ToolSet,
  wrapLanguageModel,
  TextPart,
  ToolCallPart,
} from "ai";

interface ReasoningPart {
  type: "reasoning";
  text: string;
}

interface AgentProps {
  messages: CoreMessage[];
  tools: ToolSet;
  // TODO: add model and other options
}

export const Agent = gensx.Component(
  "Agent",
  async ({ messages, tools }: AgentProps) => {
    const model = anthropic("claude-sonnet-4-20250514");

    // Track all messages including responses
    const allMessages: CoreMessage[] = [];

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

            // Add assistant response to messages
            allMessages.push({
              role: "assistant",
              content: result.text ?? "",
            });

            publishMessages();

            return result;
          },
          wrapStream: async ({ doStream, params }) => {
            console.log("wrapStream params:", JSON.stringify(params, null, 2));

            // Find the last assistant message and pull in any tool responses after it
            const lastAssistantIndex = params.prompt.findLastIndex(
              (msg: CoreMessage) => msg.role === "assistant",
            );
            if (lastAssistantIndex !== -1) {
              const toolMessagesAfterLastAssistant = params.prompt
                .slice(lastAssistantIndex + 1)
                .filter((msg: CoreMessage) => msg.role === "tool");
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
                console.log("Stream chunk:", chunk.type);

                if (chunk.type === "text-delta") {
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

                  allMessages[assistantMessageIndex].content = [
                    ...contentParts,
                  ];
                  publishMessages();
                } else if (chunk.type === "reasoning") {
                  accumulatedReasoning += chunk.textDelta;
                  console.log(chunk);

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
                  // Add tool call part
                  contentParts.push({
                    type: "tool-call",
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                    args: chunk.args,
                  });

                  allMessages[assistantMessageIndex].content = [
                    ...contentParts,
                  ];
                  publishMessages();
                }

                controller.enqueue(chunk);
              },
              flush() {
                console.log("Stream finished");
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

    const result = streamText({
      messages,
      maxSteps: 10,
      model: wrappedLanguageModel,
      tools,
      providerOptions: {
        anthropic: {
          thinking: { type: "enabled", budgetTokens: 12000 },
        } satisfies AnthropicProviderOptions,
      },
    });

    let response = "";
    for await (const chunk of result.textStream) {
      response += chunk;
    }

    return { response, messages: allMessages };
  },
);
