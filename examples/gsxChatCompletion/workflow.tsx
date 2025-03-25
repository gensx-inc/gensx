import * as gensx from "@gensx/core";
import { GSXChatCompletion } from "@gensx/openai";
import { OpenAIProvider } from "@gensx/openai";
import { ChatCompletion as ChatCompletionOutput } from "openai/resources/chat/completions.js";

const BasicCompletionExample = gensx.Component<{}, ChatCompletionOutput>(
  "BasicCompletionExample",
  () => (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <GSXChatCompletion
        messages={[
          {
            role: "system",
            content:
              "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
          },
          {
            role: "user",
            content: `What do you think of kubernetes in one paragraph?`,
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
