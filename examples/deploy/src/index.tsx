import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx, Streamable } from "gensx";

interface RespondProps {
  userInput: string;
}

const Respond = gsx.StreamComponent<RespondProps>(
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

const StreamWorkflowComponent = gsx.StreamComponent<{ userInput: string }>(
  "StreamWorkflow",
  ({ userInput }) => (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <Respond userInput={userInput} stream={true} />
    </OpenAIProvider>
  ),
);

const StreamableWorkflowComponent = gsx.Component<
  { userInput: string },
  Streamable
>("StreamableWorkflow", ({ userInput }) => (
  <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
    <Respond userInput={userInput} stream={true} />
  </OpenAIProvider>
));

const WorkflowComponent = gsx.Component<{ userInput: string }, string>(
  "Workflow",
  ({ userInput }) => (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <Respond userInput={userInput} stream={false} />
    </OpenAIProvider>
  ),
);

const StructuredWorkflowComponent = gsx.Component<
  { userInput: string },
  { response: string }
>("StructuredWorkflow", ({ userInput }) => (
  <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
    <Respond userInput={userInput} stream={false}>
      {(response) => ({ response })}
    </Respond>
  </OpenAIProvider>
));

const streamWorkflow = gsx.Workflow("StreamWorkflow", StreamWorkflowComponent);
const streamableWorkflow = gsx.Workflow(
  "StreamableWorkflow",
  StreamableWorkflowComponent,
);
const respondWorkflow = gsx.Workflow("RespondWorkflow", WorkflowComponent);
const structuredWorkflow = gsx.Workflow(
  "StructuredWorkflow",
  StructuredWorkflowComponent,
);

export {
  respondWorkflow,
  streamableWorkflow,
  streamWorkflow,
  structuredWorkflow,
};
