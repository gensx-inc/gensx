import { gsx } from "gensx";
import { OpenAIProvider, OpenAIContext } from "@gensx/openai";
import OpenAI from "openai";
import { GenerateText } from "@gensx/vercel-ai-sdk";
import { createOpenAI } from "@ai-sdk/openai";

// Define types for the API provider configuration
interface APIProviderConfig {
  apiKey: string | undefined;
  baseURL?: string;
}

interface APIProvider {
  name: string;
  providerConfig: APIProviderConfig;
}

// Define input and output types for the APIProviderRunner component
interface APIProviderRunnerProps {
  providerConfig: APIProviderConfig;
  prompt: string;
  name: string;
}

type APIProviderRunnerOutput = {
  result: string;
  provider: string;
};
type ListModelsOutput = {
  models: OpenAI.Models.ModelsPage;
};
// Example component to list available OpenAI models
const ListModels = gsx.Component<{}, ListModelsOutput>(
  "ListModels",
  async () => {
    const context = gsx.useContext(OpenAIContext);
    if (!context.client) {
      throw new Error(
        "OpenAI client not found in context. Please wrap your component with OpenAIProvider.",
      );
    }
    const models = await context.client.models.list();
    return { models };
  },
);
// Component to create a provider for a specific API configuration
const GetAllModelResponsesFromProvider = gsx.Component<
  APIProviderRunnerProps,
  APIProviderRunnerOutput
>(
  "Get All Model Responses from Provider",
  async ({ providerConfig, prompt, name }) => {
    return (
      <OpenAIProvider {...providerConfig} componentOpts={{ name: name }}>
        <ListModels>
          {({ models }) => {
            // Filter models without modifying the ModelsPage structure
            const filteredModels = models.data
              .filter(
                (model) =>
                  model.object === "model" &&
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
                  !model.id.startsWith("ft:"),
              )
              .sort((a, b) => a.created - b.created);
            const context = gsx.useContext(OpenAIContext);

            return Object.fromEntries(
              filteredModels.map((model) => [
                model.id +
                  " (" +
                  new Date(model.created * 1000).toLocaleDateString("en-US", {
                    month: "numeric",
                    day: "numeric",
                    year: "numeric",
                  }) +
                  ")",
                <GenerateText
                  prompt={prompt}
                  model={createOpenAI({
                    baseURL: context.client?.baseURL,
                    apiKey: context.client?.apiKey,
                  }).languageModel(model.id)}
                >
                  {({ text }) => text}
                </GenerateText>,
              ]),
            );
          }}
        </ListModels>
      </OpenAIProvider>
    );
  },
);

const GetModelHistoryAcrossProviders = gsx.Component<
  {
    prompt: string;
    providers?: APIProvider[];
  },
  any
>(
  "Get History of Model Responses across Providers",
  ({ prompt, providers }) => {
    const apiProviders = providers || [
      {
        name: "OpenAI",
        providerConfig: {
          apiKey: process.env["OPENAI_API_KEY"],
        },
      },
      {
        name: "Groq",
        providerConfig: {
          baseURL: "https://api.groq.com/openai/v1",
          apiKey: process.env["GROQ_API_KEY"],
        },
      },
    ];

    // Map through all API providers and get history for each
    return apiProviders.map((provider) => (
      <GetAllModelResponsesFromProvider
        name={provider.name}
        providerConfig={provider.providerConfig}
        prompt={prompt}
        componentOpts={{
          name: `Get History of Model Responses from ${provider.name} - "${prompt}"`,
        }}
      />
    ));
  },
);

const workflow = gsx.Workflow(
  "History of Model Responses",
  GetModelHistoryAcrossProviders,
);

const result = await workflow.run(
  {
    prompt: "Why is the ocean salty?",
    providers: [
      {
        name: "OpenAI",
        providerConfig: { apiKey: process.env["OPENAI_API_KEY"] },
      },
      {
        name: "Groq",
        providerConfig: {
          baseURL: "https://api.groq.com/openai/v1",
          apiKey: process.env["GROQ_API_KEY"],
        },
      },
    ],
  },
  { printUrl: true },
);

console.log("Model Comparison Results:");
for (const [modelName, response] of Object.entries(result)) {
  console.log(`\n--- ${modelName} ---`);
  console.log(response);
}
