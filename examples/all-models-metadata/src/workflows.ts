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

// Example component to list available models
const ListModels = gensx.Component("ListModels", async () => {
  const models = await openai.models.list();
  return models;
});

// Regular function instead of Component for simpler usage
const GetModelPricing = gensx.Component(
  "GetModelPricing",
  (model: OpenRouterModel) => {
    return {
      model: model.name,
      prompt: `$${parseFloat(model.pricing.prompt) * 1000000} per million tokens`,
      completion: `$${parseFloat(model.pricing.completion) * 1000000} per million tokens`,
    };
  },
);

export const GetAllOpenRouterModelPricing = gensx.Workflow(
  "GetAllOpenRouterModelPricing",
  async () => {
    const models = await ListModels();
    const modelsData = (models as unknown as OpenRouterModelsResponse).data;
    return Promise.all(modelsData.map((model) => GetModelPricing(model)));
  },
);
