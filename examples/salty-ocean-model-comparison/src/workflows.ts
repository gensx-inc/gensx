import * as gensx from "@gensx/core";
import { openai } from "@ai-sdk/openai";
import { generateText } from "@gensx/vercel-ai";
import OpenAI from "openai";

interface APIProviderConfig {
  apiKey?: string;
  baseURL?: string;
}

interface APIProvider {
  name: string;
  providerConfig: APIProviderConfig;
}

export const GetAllModelResponsesFromProvider = gensx.Component(
  "GetAllModelResponsesFromProvider",
  async ({ providerConfig, prompt }: { providerConfig: APIProviderConfig; prompt: string; }): Promise<Record<string, string>> => {
    const client = new OpenAI(providerConfig);
    const models = await client.models.list();

    const filteredModels = models.data
      .filter(
        (model) =>
          !model.id.includes("embedding") &&
          !model.id.includes("audio") &&
          !model.id.includes("whisper") &&
          !model.id.includes("dall-e") &&
          !model.id.includes("moderation") &&
          !model.id.includes("tts") &&
          !model.id.includes("davinci") &&
          !model.id.includes("instruct") &&
          !model.id.includes("realtime") &&
          !model.id.includes("babbage") &&
          !model.id.startsWith("ft:")
      )
      .sort((a, b) => a.created - b.created);

    const responses: Record<string, string> = {};

    for (const model of filteredModels) {
      const result = await generateText({
        messages: [{ role: "user", content: prompt }],
        model: openai(model.id, {
          apiKey: providerConfig.apiKey,
          baseUrl: providerConfig.baseURL,
        }),
      });
      const label = `${model.id} (${new Date(model.created * 1000).toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      })})`;
      responses[label] = result.text;
    }

    return responses;
  }
);

export const GetModelHistoryAcrossProviders = gensx.Workflow(
  "GetModelHistoryAcrossProviders",
  async ({ prompt, providers }: { prompt: string; providers?: APIProvider[] }) => {
    const apiProviders =
      providers ?? [
        {
          name: "OpenAI",
          providerConfig: { apiKey: process.env.OPENAI_API_KEY },
        },
        {
          name: "Groq",
          providerConfig: {
            apiKey: process.env.GROQ_API_KEY,
            baseURL: "https://api.groq.com/openai/v1",
          },
        },
      ];

    const results: Record<string, Record<string, string>> = {};

    for (const provider of apiProviders) {
      results[provider.name] = await GetAllModelResponsesFromProvider({
        providerConfig: provider.providerConfig,
        prompt,
      });
    }

    return results;
  }
);

