import * as gensx from "@gensx/core";
import { ChatCompletion, OpenAIProvider } from "@gensx/openai";

interface RespondProps {
  userInput: string;
}
type RespondOutput = string;

const Respond = gensx.Component<RespondProps, RespondOutput>(
  "Respond",
  ({ userInput }) => (
    <ChatCompletion
      model="gpt-4o-mini"
      messages={[
        {
          role: "system",
          content: "You are a helpful assistant. Respond to the user's input.",
        },
        { role: "user", content: userInput },
      ]}
    />
  ),
);

const WorkflowComponent = gensx.Component<{ userInput: string }, string>(
  "Workflow",
  ({ userInput }) => (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <Respond userInput={userInput} />
    </OpenAIProvider>
  ),
);

const workflow = gensx.Workflow("MyGSXWorkflow", WorkflowComponent);

const result = await workflow.run(
  {
    userInput: "Hi there! Say 'Hello, World!' and nothing else.",
  },
  { printUrl: true },
);

console.log(result);
