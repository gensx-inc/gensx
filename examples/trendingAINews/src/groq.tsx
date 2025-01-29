import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";
import { ChatCompletionCreateParams } from "openai/resources/chat/completions.mjs";
import { Groq } from "groq-sdk";
import { ChatCompletionCreateParams as GroqChatCompletionCreateParams } from "groq-sdk/resources/chat/completions";

export interface GroqCompletionProps {
  prompt: string;
}

export const GroqCompletion = gsx.Component<ChatCompletionCreateParams, string>(
  "GroqCompletion",
  (props) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is not set");
    }
    return (
      <OpenAIProvider apiKey={apiKey} baseURL="https://api.groq.com/openai/v1">
        <ChatCompletion {...props} stream={false} />
      </OpenAIProvider>
    );
  },
);

export interface GroqDeepSeekR1CompletionProps {
  prompt: string;
}

export interface GroqDeepSeekR1CompletionOutput {
  thinking: string;
  completion: string;
}
export const GroqDeepSeekR1Completion = gsx.Component<
  Omit<ChatCompletionCreateParams, "model">,
  GroqDeepSeekR1CompletionOutput
>("GroqDeepSeekR1Completion", (props) => {
  return (
    <GroqCompletion model="deepseek-r1-distill-llama-70b" {...props}>
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
    </GroqCompletion>
  );
});

export type GroqChatCompletionProps = GroqChatCompletionCreateParams;

export const GroqChatCompletion = gsx.Component<GroqChatCompletionProps, any>(
  "GroqChatCompletion",
  async (props) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is not set");
    }

    const groq = new Groq({
      apiKey,
    });

    props.stream = false;
    const completion = await groq.chat.completions.create(props);
    return completion.choices[0]?.message?.content || "";
  },
);
