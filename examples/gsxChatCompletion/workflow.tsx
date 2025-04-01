import * as gensx from "@gensx/core";
import { Streamable } from "@gensx/core";
import { ChatCompletion, OpenAIChatCompletion } from "@gensx/openai";
import { OpenAIProvider } from "@gensx/openai";

const BasicChatExample = gensx.Component<{ message: string }, string>(
  "BasicChatExample",
  ({ message }) => (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <ChatCompletion
        messages={[
          {
            role: "system",
            content:
              "you are a trash eating engineer embodied as a racoon. Be sassy and fun. ",
          },
          {
            role: "user",
            content: message,
          },
        ]}
        model="gpt-4o-mini"
        temperature={0.7}
      />
    </OpenAIProvider>
  ),
);

const basicChatWorkflow = gensx.Workflow("BasicChatWorkflow", BasicChatExample);

const StreamingChatExample = gensx.StreamComponent<{
  message: string;
  stream: boolean;
}>("StreamingChatExample", ({ message, stream }) => (
  <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
    <ChatCompletion
      messages={[
        {
          role: "system",
          content:
            "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
        },
        {
          role: "user",
          content: message,
        },
      ]}
      model="gpt-4o-mini"
      temperature={0.7}
      stream={stream}
    />
  </OpenAIProvider>
));

const streamingChatWorkflow = gensx.Workflow(
  "StreamingChatWorkflow",
  StreamingChatExample,
);

const StreamingOpenAIExample = gensx.Component<
  {
    message: string;
    stream: boolean;
  },
  Streamable
>("StreamingOpenAIExample", ({ message, stream }) => (
  <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
    <OpenAIChatCompletion
      messages={[
        {
          role: "system",
          content:
            "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
        },
        {
          role: "user",
          content: message,
        },
      ]}
      model="gpt-4o-mini"
      temperature={0.7}
      stream={stream}
    />
  </OpenAIProvider>
));

const streamingOpenAIWorkflow = gensx.Workflow(
  "StreamingOpenAIWorkflow",
  StreamingOpenAIExample,
);

export { basicChatWorkflow, streamingChatWorkflow, streamingOpenAIWorkflow };
