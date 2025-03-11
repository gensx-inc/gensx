import * as gensx from "@gensx/core";
import { OpenAIContext, OpenAIProvider } from "@gensx/openai";

// Define the OpenRouter model structure based on the example data
interface OpenRouterModel {
  id: string;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type: string | null;
  };
  pricing: {
    prompt: string;
    completion: string;
    image: string;
    request: string;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number | null;
    is_moderated: boolean;
  };
  per_request_limits: unknown;
}

// This interface is more generic to accommodate both OpenAI and OpenRouter responses
interface ListModelsOutput {
  models: {
    data: unknown[]; // Using any[] to accommodate different model structures
    // Add other properties if needed
  };
}

// Example component to list available OpenAI models
const ListModels = gensx.Component<{}, ListModelsOutput>(
  "ListModels",
  async () => {
    const context = gensx.useContext(OpenAIContext);
    if (!context.client) {
      throw new Error(
        "OpenAI client not found in context. Please wrap your component with OpenAIProvider.",
      );
    }
    const models = await context.client.models.list();
    return { models }; // Return as is, we'll handle type conversion in the consumer
  },
);

const GetAllOpenRouterModels = gensx.Component<{}, ListModelsOutput>(
  "Get All OpenRouter Models",
  () => {
    return (
      <OpenAIProvider
        baseURL="https://openrouter.ai/api/v1"
        apiKey={process.env.OPENROUTER_API_KEY}
      >
        <ListModels />
      </OpenAIProvider>
    );
  },
);

interface GetModelPricingOutput {
  model: string;
  prompt: string;
  completion: string;
}

interface GetModelPricingProps {
  model: OpenRouterModel;
}

const GetModelPricing = gensx.Component<
  GetModelPricingProps,
  GetModelPricingOutput
>("Get Model Pricing", ({ model }) => {
  console.log(model);
  return {
    model: model.name,
    prompt: `$${parseFloat(model.pricing.prompt) * 1000000} per million tokens`,
    completion: `$${parseFloat(model.pricing.completion) * 1000000} per million tokens`,
  };
});

const AllOpenRouterModelPricing = gensx.Component<{}, ListModelsOutput>(
  "Get All OpenRouter Model Pricing",
  () => {
    return (
      <GetAllOpenRouterModels>
        {(models) => {
          // Use type assertion to ensure the data is treated as OpenRouterModel[]
          const openRouterModels = models.models.data as OpenRouterModel[];

          return openRouterModels
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((model) => (
              <GetModelPricing
                model={model}
                componentOpts={{
                  name: model.name,
                }}
              />
            ));
        }}
      </GetAllOpenRouterModels>
    );
  },
);

const workflow = gensx.Workflow("All Model Pricing", AllOpenRouterModelPricing);

const result = await workflow.run({}, { printUrl: true });

console.info(result);
