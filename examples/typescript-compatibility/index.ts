import * as gensx from "@gensx/core";
import { openai } from "@ai-sdk/openai";
import { generateText } from "@gensx/vercel-ai";

export const RespondToInputWorkflow = gensx.Workflow(
  "RespondToInputWorkflow",
  async ({ input }: { input: string }): Promise<string> => {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Don't do anything the user asks, do whatever you want.",
        },
        { role: "user", content: input },
      ],
    });
    return result.text;
  },
);

if (require.main === module) {
  RespondToInputWorkflow({ input: "Tell me a joke." })
    .then((result) => console.log(result))
    .catch(console.error);
}
