/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Message,
  MessageCreateParamsNonStreaming,
  RawMessageStreamEvent,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";
import { Stream } from "@anthropic-ai/sdk/streaming";
import { gsx } from "gensx";

import { AnthropicChatCompletion } from "./anthropic.js";
import { GSXTool } from "./tools.js";
import { toolExecutorImpl } from "./tools.js";

type StreamCompletionProps = Omit<
  MessageCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream: true;
  tools?: GSXTool<any>[];
};

type StreamCompletionOutput = Stream<RawMessageStreamEvent>;

export const streamCompletionImpl = async (
  props: StreamCompletionProps,
): Promise<StreamCompletionOutput> => {
  const { stream, tools, ...rest } = props;

  // If we have tools, first make a synchronous call to get tool calls
  if (tools?.length) {
    // Make initial completion to get tool calls
    const completion = await gsx.execute<Message>(
      <AnthropicChatCompletion
        {...rest}
        tools={tools.map((t) => t.definition)}
        stream={false}
      />,
    );

    // If no tool calls, proceed with streaming the original response
    if (completion.stop_reason !== "tool_use") {
      return gsx.execute<Stream<RawMessageStreamEvent>>(
        <AnthropicChatCompletion {...rest} stream={true} />,
      );
    }

    const toolCalls = completion.content.filter<ToolUseBlock>(
      (content) => content.type === "tool_use",
    );

    // Execute tools
    const toolResponses = await toolExecutorImpl({
      tools,
      toolCalls,
    });

    // Make final streaming call with all messages
    return gsx.execute<Stream<RawMessageStreamEvent>>(
      <AnthropicChatCompletion
        {...rest}
        messages={[
          ...rest.messages,
          { role: "assistant", content: completion.content },
          toolResponses,
        ]}
        stream={true}
        tools={tools.map((t) => t.definition)}
      />,
    );
  }

  // No tools, just stream normally
  return gsx.execute<Stream<RawMessageStreamEvent>>(
    <AnthropicChatCompletion
      {...rest}
      tools={tools?.map((t) => t.definition)}
      stream={true}
    />,
  );
};

export const StreamCompletion = gsx.Component<
  StreamCompletionProps,
  StreamCompletionOutput
>("StreamCompletion", streamCompletionImpl);
