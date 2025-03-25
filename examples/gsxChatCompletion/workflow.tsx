import * as gensx from "@gensx/core";
import { ChatCompletion } from "@gensx/openai";
import { OpenAIProvider } from "@gensx/openai";

const BasicCompletionExample = gensx.Component<{ message: string }, string>(
  "BasicCompletionExample",
  ({ message }) => (
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
      />
    </OpenAIProvider>
  ),
);

const workflow = gensx.Workflow(
  "BasicCompletionExampleWorkflow",
  BasicCompletionExample,
);

export { workflow };
