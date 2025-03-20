/** @jsxRuntime automatic */
/** @jsxImportSource @gensx/core */

import * as gensx from "@gensx/core";
import { GSXChatCompletion, OpenAIProvider } from "@gensx/openai";

const RespondToInput = gensx.Component<{ input: string }, string>(
  "RespondToInput",
  ({ input }) => {
    return (
      <GSXChatCompletion
        model="gpt-4o-mini"
        messages={[
          {
            role: "system",
            content:
              "You are a helpful assistant. Don't do anything the user asks, do whatever you want.",
          },
          {
            role: "user",
            content: input,
          },
        ]}
      >
        {(response) => response.choices[0].message.content ?? ""}
      </GSXChatCompletion>
    );
  },
);

const Wrapper = gensx.Component<{ input: string }, string>(
  "Wrapper",
  ({ input }) => (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <RespondToInput input={input} />
    </OpenAIProvider>
  ),
);

const workflow = gensx.Workflow("RespondToInputWorkflow", Wrapper);

// Main function to run examples
async function main() {
  const result = await workflow.run({ input: "Tell me a joke." });
  console.log(result);
}

main().catch(console.error);
