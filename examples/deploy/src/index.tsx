import * as gensx from "@gensx/core";
import { Streamable } from "@gensx/core";
import { ChatCompletion, OpenAIProvider } from "@gensx/openai";

interface RespondProps {
  userInput: string;
}

const Respond = gensx.StreamComponent<RespondProps>(
  "Respond",
  ({ userInput }) => {
    return (
      <ChatCompletion
        stream={true}
        model="gpt-4o-mini"
        messages={[
          {
            role: "system",
            content:
              "You are a helpful assistant. Respond to the user's input!",
          },
          { role: "user", content: userInput },
        ]}
      />
    );
  },
);

const StreamWorkflowComponent = gensx.StreamComponent<{ userInput: string }>(
  "StreamWorkflow",
  ({ userInput }) => (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <Respond userInput={userInput} stream={true} />
    </OpenAIProvider>
  ),
);

const StreamableWorkflowComponent = gensx.Component<
  { userInput: string },
  Streamable
>("StreamableWorkflow", ({ userInput }) => (
  <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
    <Respond userInput={userInput} stream={true} />
  </OpenAIProvider>
));

const WorkflowComponent = gensx.Component<{ userInput: string }, string>(
  "Workflow",
  ({ userInput }) => (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <Respond userInput={userInput} stream={false} />
    </OpenAIProvider>
  ),
);

const StructuredWorkflowComponent = gensx.Component<
  { userInput: string },
  { response: string }
>("StructuredWorkflow", ({ userInput }) => (
  <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
    <Respond userInput={userInput} stream={false}>
      {(response) => ({ response })}
    </Respond>
  </OpenAIProvider>
));

const streamWorkflow = gensx.Workflow(
  "StreamWorkflow",
  StreamWorkflowComponent,
);
const streamableWorkflow = gensx.Workflow(
  "StreamableWorkflow",
  StreamableWorkflowComponent,
);
const respondWorkflow = gensx.Workflow("RespondWorkflow", WorkflowComponent);
const structuredWorkflow = gensx.Workflow(
  "StructuredWorkflow",
  StructuredWorkflowComponent,
);

export {
  respondWorkflow,
  streamableWorkflow,
  streamWorkflow,
  structuredWorkflow,
};
