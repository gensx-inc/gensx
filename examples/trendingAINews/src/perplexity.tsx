import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";
import { ChatCompletionCreateParams } from "openai/resources/chat/completions.mjs";

type PerplexityCompletionOutput = string;

export const PerplexityCompletion = gsx.Component<
  ChatCompletionCreateParams,
  PerplexityCompletionOutput
>("PerplexityCompletion", async (params) => {
  return (
    <OpenAIProvider
      apiKey={process.env.PERPLEXITY_API_KEY}
      baseURL="https://api.perplexity.ai"
    >
      <ChatCompletion
        {...(params as ChatCompletionCreateParams)}
        stream={false}
      />
    </OpenAIProvider>
  );
});

export type PerplexityMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type PerplexityParams = {
  messages: PerplexityMessage[];
  model: string;
  frequency_penalty?: number;
  max_tokens?: number;
  presence_penalty?: number;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  stream?: boolean;
  return_images?: boolean;
  return_related_questions?: boolean;
  search_domain_filter?: string[];
  search_recency_filter?: string;
  response_format?: {
    type: string;
    json_schema: {
      schema: object;
    };
  };
};

export type PerplexityResponse = {
  choices: {
    message: PerplexityMessage;
    finish_reason: "stop" | "length";
    index: number;
  }[];
  completion: string;
  citations: any[];
  thoughts?: string;
  created: number;
  id: string;
  model: string;
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
};

export const PerplexityChatCompletion = gsx.Component<
  PerplexityParams,
  PerplexityResponse
>("PerplexityChat", async (params) => {
  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        ...params,
        stream: false,
      }),
    });

    const data: PerplexityResponse = await response.json();
    console.log("Perplexity API Response:", JSON.stringify(data, null, 2));

    // Replace citation markers [n] with actual citations
    let content = data.choices[0]?.message.content || "";
    if (data.citations) {
      data.citations.forEach((citation, index) => {
        content = content.replace(`[${index}]`, citation);
      });
    }
    data.completion = content;

    return data;
  } catch (error) {
    throw new Error(`Failed to fetch from Perplexity API: ${error}`);
  }
});

export type PerplexityDeepSeekR1SearchOutput = {
  thinking: string;
  completion: string;
};

export const PerplexityDeepSeekR1Search = gsx.Component<
  Omit<PerplexityParams, "model">,
  PerplexityDeepSeekR1SearchOutput
>("PerplexityReasoningSearch", async (params) => {
  return (
    <PerplexityChatCompletion {...params} model="sonar-reasoning">
      {(response) => {
        const thinkRegex = /<think>(.*?)<\/think>/s;
        const thinkExec = thinkRegex.exec(response.completion);
        const thinking = thinkExec ? thinkExec[1].trim() : "";
        const completion = response.completion.replace(thinkRegex, "").trim();

        if (params.response_format) {
          // Remove JSON code block markers and clean up any ellipsis
          const jsonRegex = /```json\s*([\s\S]*?)```/;
          const jsonMatch = jsonRegex.exec(completion);
          if (jsonMatch) {
            // Clean up the JSON string by removing any lines containing ellipsis
            const cleanJson = jsonMatch[1]
              .split("\n")
              .filter((line) => !line.includes("..."))
              .join("\n")
              .trim();

            console.log("Successfully parsed JSON:", cleanJson);
            return {
              thinking,
              completion: cleanJson,
            };
          } else {
            return {
              thinking,
              completion: `{"articles": []}`,
            };
          }
        }
        return {
          thinking,
          completion,
        };
      }}
    </PerplexityChatCompletion>
  );
});
