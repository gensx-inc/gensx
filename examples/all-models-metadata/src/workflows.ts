import * as gensx from "@gensx/core";
import { OpenAI } from "@gensx/openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Define the OpenRouter model structure based on the actual output
interface OpenRouterModel {
  id: string;
  hugging_face_id: string | null;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
    tokenizer: string;
    instruct_type: string | null;
  };
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
    web_search: string;
    internal_reasoning: string;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number | null;
    is_moderated: boolean;
  };
  per_request_limits: unknown;
  supported_parameters: string[];
}

// OpenRouter API response structure
interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

// This interface is more generic to accommodate both OpenAI and OpenRouter responses
interface ListModelsOutput {
  models: {
    data: unknown[];
    // Add other properties if needed
  };
}

// Example component to list available models
@gensx.Component()
async function ListModels() {
  const models = await openai.models.list();
  return models;
}

interface GetModelPricingOutput {
  model: string;
  prompt: string;
  completion: string;
}

// Regular function instead of Component for simpler usage
@gensx.Component()
async function GetModelPricing(model: OpenRouterModel): Promise<GetModelPricingOutput> {
  return {
    model: model.name,
    prompt: `$${parseFloat(model.pricing.prompt) * 1000000} per million tokens`,
    completion: `$${parseFloat(model.pricing.completion) * 1000000} per million tokens`,
  };
}

@gensx.Workflow()
export async function GetAllOpenRouterModelPricing({ }) {
  const models = await ListModels();
  // Cast to any to work with the actual structure returned by OpenRouter
  const modelsData = (models as any).data as OpenRouterModel[];
  return Promise.all(modelsData.map((model) => GetModelPricing(model)));
}