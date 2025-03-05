import * as gensx from "@gensx/core";
import { ChatCompletion, OpenAIProvider } from "@gensx/openai";

export interface GroqDeepSeekR1CompletionProps {
  prompt: string;
}

export interface GroqDeepSeekR1CompletionOutput {
  thinking: string;
  completion: string;
}
export const GroqDeepSeekR1Completion = gensx.Component<
  GroqDeepSeekR1CompletionProps,
  GroqDeepSeekR1CompletionOutput
>("GroqDeepSeekR1Completion", ({ prompt }) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not set");
  }
  return (
    <OpenAIProvider apiKey={apiKey} baseURL="https://api.groq.com/openai/v1">
      <ChatCompletion
        messages={[{ role: "user", content: prompt }]}
        model="deepseek-r1-distill-llama-70b"
        stream={false}
      >
        {(response) => {
          const thinkRegex = /<think>(.*?)<\/think>/s;
          const thinkExec = thinkRegex.exec(response);
          const thinking = thinkExec ? thinkExec[1].trim() : "";
          const completion = response.replace(thinkRegex, "").trim();

          return {
            thinking,
            completion,
          };
        }}
      </ChatCompletion>
    </OpenAIProvider>
  );
});
