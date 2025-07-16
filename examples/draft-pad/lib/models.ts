import { type ModelConfig } from "@/gensx/workflows";

import { getApiUrl } from "./config";

interface ModelsDotDevModel {
  id: string;
  name: string;
  attachment?: boolean;
  reasoning?: boolean;
  temperature?: boolean;
  cost?: {
    input: number;
    output: number;
    cache_read?: number;
    cache_write?: number;
  };
  limit?: {
    context: number;
    output: number;
  };
}

interface ModelsDotDevProvider {
  id: string;
  name: string;
  env?: string[];
  models: Record<string, ModelsDotDevModel>;
}

interface ModelsDotDevResponse {
  providers: Record<string, ModelsDotDevProvider>;
  providerStatus: Record<string, boolean>;
}

// Map models.dev providers to our supported providers and their env vars
const PROVIDER_MAPPING: Record<
  string,
  { provider: string; envVars?: string[] }
> = {
  openai: { provider: "openai", envVars: ["OPENAI_API_KEY"] },
  anthropic: { provider: "anthropic", envVars: ["ANTHROPIC_API_KEY"] },
  google: { provider: "google", envVars: ["GOOGLE_GENERATIVE_AI_API_KEY"] },
  mistral: { provider: "mistral", envVars: ["MISTRAL_API_KEY"] },
  cohere: { provider: "cohere", envVars: ["COHERE_API_KEY"] },
  "amazon-bedrock": {
    provider: "amazon-bedrock",
    envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
  },
  azure: {
    provider: "azure",
    envVars: ["AZURE_RESOURCE_NAME", "AZURE_API_KEY"],
  },
  deepseek: { provider: "deepseek", envVars: ["DEEPSEEK_API_KEY"] },
  groq: { provider: "groq", envVars: ["GROQ_API_KEY"] },
  xai: { provider: "xai", envVars: ["XAI_API_KEY"] },
  // Providers we don't support yet
  vercel: { provider: "", envVars: [] }, // Skip - requires special configuration
  morph: { provider: "", envVars: [] }, // Skip - not available in AI SDK
  llama: { provider: "", envVars: [] }, // Skip - not in our supported list
};

export async function fetchAvailableModels(): Promise<ModelConfig[]> {
  try {
    // Use our API route to avoid CORS issues
    const response = await fetch(getApiUrl("/api/models"));

    if (!response.ok) {
      throw new Error("Failed to fetch models");
    }

    const data: ModelsDotDevResponse = await response.json();

    const models: ModelConfig[] = [];
    let availableCount = 0;
    let unavailableCount = 0;

    // Process each provider
    for (const [providerKey, provider] of Object.entries(data.providers)) {
      // Skip if we don't support this provider
      const mappingInfo = PROVIDER_MAPPING[providerKey];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!mappingInfo?.provider) continue;

      const mappedProvider = mappingInfo.provider;
      const envVars = provider.env ?? mappingInfo.envVars ?? [];

      // Check if the provider has required API keys
      const isAvailable = data.providerStatus[mappedProvider] ?? false;

      // Process each model from this provider
      for (const [modelKey, model] of Object.entries(provider.models)) {
        // Create a unique ID combining provider and model
        const uniqueId = `${providerKey}-${modelKey}`;

        models.push({
          id: uniqueId,
          provider: mappedProvider as
            | "openai"
            | "anthropic"
            | "google"
            | "mistral"
            | "cohere"
            | "amazon-bedrock"
            | "azure"
            | "deepseek"
            | "groq"
            | "xai"
            | "custom",
          model: decodeURIComponent(model.id), // Decode URL-encoded model IDs
          displayName: `${model.name} (${provider.name})`,
          providerName: provider.name,
          envVars,
          available: isAvailable,
          cost: model.cost,
          limit: model.limit,
        });

        if (isAvailable) {
          availableCount++;
        } else {
          unavailableCount++;
        }
      }
    }

    // Sort by availability first (available models first), then by provider and name
    models.sort((a, b) => {
      // Available models come first
      if (a.available !== b.available) {
        return a.available ? -1 : 1;
      }
      // Then sort by provider
      if (a.provider !== b.provider) {
        return a.provider.localeCompare(b.provider);
      }
      // Finally by display name
      return (a.displayName ?? "").localeCompare(b.displayName ?? "");
    });

    console.log(
      `Loaded ${models.length} models: ${availableCount} available, ${unavailableCount} require API keys`,
    );

    return models;
  } catch (error) {
    console.error("Failed to fetch models from models.dev:", error);

    // Return fallback models if API fails
    return getFallbackModels();
  }
}

// Fallback models in case the API is unavailable
function getFallbackModels(): ModelConfig[] {
  // Check if OpenAI API key is available
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  return [
    {
      id: "gpt-4o",
      provider: "openai",
      model: "gpt-4o",
      displayName: "GPT-4o (OpenAI)",
      available: hasOpenAI,
    },
    {
      id: "gpt-4o-mini",
      provider: "openai",
      model: "gpt-4o-mini",
      displayName: "GPT-4o Mini (OpenAI)",
      available: hasOpenAI,
    },
    {
      id: "gpt-3.5-turbo",
      provider: "openai",
      model: "gpt-3.5-turbo",
      displayName: "GPT-3.5 Turbo (OpenAI)",
      available: hasOpenAI,
    },
  ];
}
