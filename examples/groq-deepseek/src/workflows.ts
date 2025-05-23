import * as gensx from "@gensx/core";
import { OpenAI } from "@gensx/openai";

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  throw new Error("GROQ_API_KEY environment variable is not set");
}

const openai = new OpenAI({
  apiKey,
  baseURL: "https://api.groq.com/openai/v1",
});

export interface GroqDeepSeekR1CompletionProps {
  prompt: string;
}

export interface GroqDeepSeekR1CompletionOutput {
  thinking: string;
  completion: string;
}

@gensx.Workflow()
export async function GroqDeepSeekR1Completion(
  { prompt }: GroqDeepSeekR1CompletionProps
): Promise<GroqDeepSeekR1CompletionOutput> {
  const response = await openai.chat.completions.create({
    model: "deepseek-r1-distill-llama-70b",
    messages: [{ role: "user", content: prompt }],
    stream: false,
  });

  const content = response.choices[0].message.content || "";
  const thinkRegex = /<think>(.*?)<\/think>/s;
  const thinkExec = thinkRegex.exec(content);
  const thinking = thinkExec ? thinkExec[1].trim() : "";
  const completion = content.replace(thinkRegex, "").trim();

  return {
    thinking,
    completion,
  };
}