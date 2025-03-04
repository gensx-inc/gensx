import { gsx } from "@gensx/core";
import { ChatCompletion, OpenAIProvider } from "@gensx/openai";

interface RespondProps {
  userInput: string;
}
type RespondOutput = string;

const GenerateText = gsx.Component<RespondProps, RespondOutput>(
  "GenerateText",
  ({ userInput }) => (
    <ChatCompletion
      model="anthropic/claude-3.7-sonnet"
      messages={[
        {
          role: "system",
          content: "You are a helpful assistant. Respond to the user's input.",
        },
        { role: "user", content: userInput },
      ]}
      provider={{
        ignore: ["Anthropic"],
      }}
    />
  ),
);

const OpenRouterExampleComponent = gsx.Component<{ userInput: string }, string>(
  "OpenRouter",
  ({ userInput }) => (
    <OpenAIProvider
      apiKey={process.env.OPENROUTER_API_KEY}
      baseURL="https://openrouter.ai/api/v1"
    >
      <GenerateText userInput={userInput} />
    </OpenAIProvider>
  ),
);

const workflow = gsx.Workflow("OpenRouterWorkflow", OpenRouterExampleComponent);

const result = await workflow.run(
  {
    userInput: "Hi there! Write me a short story about a cat that can fly.",
  },
  { printUrl: true },
);

console.log(result);
