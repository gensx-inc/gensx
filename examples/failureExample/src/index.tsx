import { ChatCompletion } from "@gensx/openai";
import { gsx } from "gensx";

interface RespondProps {
  userInput: string;
}
type RespondOutput = string;

const Respond = gsx.Component<RespondProps, RespondOutput>(
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

const ErrorComponent = gsx.Component<
  { message: string; timeout: number },
  string
>("ErrorComponent", async ({ message, timeout }) => {
  await new Promise((resolve) => setTimeout(resolve, timeout));
  throw new Error(message);
});

const WorkflowComponent = gsx.Component<{ userInput: string }, string>(
  "Workflow",
  ({ userInput }) => (
    <>
      <ErrorComponent timeout={10000} message="Test error message" />
    </>
  ),
);

const workflow = gsx.Workflow("MyGSXWorkflow", WorkflowComponent);

const result = await workflow.run(
  {
    userInput: "Hi there! Say 'Hello, World!' and nothing else.",
  },
  { printUrl: true },
);

// console.log(result);
