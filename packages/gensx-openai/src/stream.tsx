/* eslint-disable @typescript-eslint/no-explicit-any */

import { gsx } from "gensx";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { Stream } from "openai/streaming";

import { OpenAIChatCompletion } from "./openai.js";
import { GSXTool, ToolExecutor } from "./tools.js";

type StreamCompletionProps = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream: true;
  tools?: GSXTool<any>[];
};

type StreamCompletionOutput = Stream<ChatCompletionChunk>;

export const StreamCompletion = gsx.Component<
  StreamCompletionProps,
  StreamCompletionOutput
>("StreamCompletion", async (props) => {
  const { stream, tools, ...rest } = props;

  // If we have tools, first make a synchronous call to get tool calls
  if (tools?.length) {
    // Make initial completion to get tool calls
    const completion = await gsx.execute<ChatCompletionOutput>(
      <OpenAIChatCompletion
        {...rest}
        tools={tools.map((t) => t.definition)}
        stream={false}
      />,
    );

    const toolCalls = completion.choices[0]?.message?.tool_calls;
    // If no tool calls, proceed with streaming the original response
    if (!toolCalls?.length) {
      return gsx.execute<Stream<ChatCompletionChunk>>(
        <OpenAIChatCompletion {...rest} stream={true} />,
      );
    }

    // Execute tools
    const toolResponses = await gsx.execute<ChatCompletionMessageParam[]>(
      <ToolExecutor
        tools={tools}
        toolCalls={toolCalls}
        messages={[...rest.messages, completion.choices[0].message]}
        model={rest.model}
      />,
    );

    // Make final streaming call with all messages
    return gsx.execute<Stream<ChatCompletionChunk>>(
      <OpenAIChatCompletion
        {...rest}
        messages={[
          ...rest.messages,
          completion.choices[0].message,
          ...toolResponses,
        ]}
        stream={true}
      />,
    );
  }

  // No tools, just stream normally
  return gsx.execute<Stream<ChatCompletionChunk>>(
    <OpenAIChatCompletion
      {...rest}
      tools={tools?.map((t) => t.definition)}
      stream={true}
    />,
  );
});
