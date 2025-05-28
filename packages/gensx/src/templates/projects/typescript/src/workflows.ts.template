import * as gensx from "@gensx/core";
import { openai } from "@ai-sdk/openai";
import { generateText } from "@gensx/vercel-ai";

interface ChatProps {
  userMessage: string;
}

const openaiModel = openai("gpt-4.1-mini");


const Chat = gensx.Component(
  "Chat",
  async ({ userMessage }: ChatProps) => {
    const result = await generateText({
      model: openaiModel,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        { role: "user", content: userMessage },
      ],
    });
    return result.text;
  });

const ChatWorkflow = gensx.Workflow(
  "ChatWorkflow",
  async ({ userMessage }: ChatProps) => {
    return await Chat({ userMessage });
  },
);

export { ChatWorkflow };
