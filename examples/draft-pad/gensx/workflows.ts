import { bedrock } from "@ai-sdk/amazon-bedrock";
import { anthropic } from "@ai-sdk/anthropic";
import { azure } from "@ai-sdk/azure";
import { cohere } from "@ai-sdk/cohere";
import { deepseek } from "@ai-sdk/deepseek";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { mistral } from "@ai-sdk/mistral";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import * as gensx from "@gensx/core";
import { streamText } from "ai";

// Workflow with merged draft and progress state
// Updated: Combined DraftState and ProgressUpdate into single DraftProgress
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type StartContentEvent = {
  type: "startContent";
  content: string;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type EndContentEvent = {
  type: "endContent";
  content: string;
};

// Model configuration
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ModelConfig = {
  id: string; // Unique identifier for this model instance
  provider:
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
    | "custom";
  model: string;
  displayName?: string; // Optional display name
  providerName?: string; // Human-readable provider name
  envVars?: string[]; // Environment variables required for this provider
  available?: boolean; // Whether the provider has required API keys configured
  reasoning?: boolean; // Whether this is a reasoning/thinking model
  // Cost information (per million tokens)
  cost?: {
    input: number;
    output: number;
  };
  // Model limits
  limit?: {
    context: number; // Max context tokens
    output: number; // Max output tokens
  };
  // For custom providers, allow passing the model instance directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelInstance?: any;
  // Additional configuration for providers that need it
  providerConfig?: {
    // For Azure, we need resource name
    resourceName?: string;
    // For Bedrock, we might need region
    region?: string;
  };
};

// Individual model stream state
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ModelStreamState = {
  modelId: string;
  displayName: string;
  status: "idle" | "generating" | "complete" | "error";
  content: string;
  wordCount: number;
  charCount: number;
  error?: string;
  startTime?: number;
  endTime?: number;
  generationTime?: number; // Time in seconds
  inputTokens?: number;
  outputTokens?: number;
};

// Single comprehensive state object for all models
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type DraftProgress = {
  type: "draft-progress";
  // Overall status information
  status: "idle" | "generating" | "complete";
  stage:
    | "initializing"
    | "generating"
    | "streaming"
    | "finalizing"
    | "complete";
  percentage: number;
  message: string;
  // Model-specific streams
  modelStreams: ModelStreamState[];
  // Aggregate stats
  totalModels: number;
  completedModels: number;
  lastUpdated: string;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type UpdateDraftInput = {
  userMessage: string;
  currentDraft: string;
  models: ModelConfig[];
};

// Updated output type to include all model results
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type UpdateDraftOutput = {
  results: ModelStreamState[];
  summary: {
    totalModels: number;
    successfulModels: number;
    failedModels: number;
    totalGenerationTime: number; // in seconds
    totalInputTokens: number;
    totalOutputTokens: number;
    fastestModel?: {
      modelId: string;
      time: number;
    };
    slowestModel?: {
      modelId: string;
      time: number;
    };
  };
};

// Helper function to get model instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getModelInstance(config: ModelConfig): any {
  // If a custom model instance is provided, use it
  if (config.modelInstance) {
    return config.modelInstance;
  }

  switch (config.provider) {
    case "openai":
      return openai(config.model);
    case "anthropic":
      return anthropic(config.model);
    case "google":
      return google(config.model);
    case "mistral":
      return mistral(config.model);
    case "cohere":
      return cohere(config.model);
    case "amazon-bedrock":
      // Bedrock models are accessed directly
      return bedrock(config.model);
    case "azure":
      // Azure models are accessed directly
      return azure(config.model);
    case "deepseek":
      return deepseek(config.model);
    case "groq":
      return groq(config.model);
    case "xai":
      return xai(config.model);
    case "custom":
      throw new Error(
        `Custom provider requires modelInstance to be provided in the config`,
      );
  }
}

const UpdateDraftWorkflow = gensx.Workflow(
  "updateDraft",
  async ({
    userMessage,
    currentDraft,
    models,
  }: UpdateDraftInput): Promise<UpdateDraftOutput> => {
    // Initialize model streams
    const modelStreams: ModelStreamState[] = models.map((model) => ({
      modelId: model.id,
      displayName: model.displayName ?? `${model.provider}/${model.model}`,
      status: "idle",
      content: "",
      wordCount: 0,
      charCount: 0,
    }));

    const draftProgress: DraftProgress = {
      type: "draft-progress",
      status: "generating",
      stage: "initializing",
      percentage: 0,
      message: `Starting content generation with ${models.length} models...`,
      modelStreams,
      totalModels: models.length,
      completedModels: 0,
      lastUpdated: new Date().toISOString(),
    };

    // Publish initial state
    gensx.publishObject<DraftProgress>("draft-progress", draftProgress);

    // Publish start event (for useEvent hook)
    gensx.publishEvent<StartContentEvent>("content-events", {
      type: "startContent",
      content: "draftContent",
    });

    // Simple system prompt based on whether we have existing content
    let systemPrompt = currentDraft
      ? "You are a helpful assistant that updates draft content based on user instructions. Return only the updated content, no explanations."
      : "You are a helpful assistant that creates content based on user instructions. Return only the content, no explanations.";

    systemPrompt +=
      " You only return markdown for the updated content and not any other type of formatted text.";

    const userPrompt = currentDraft
      ? `Current content:\n${currentDraft}\n\nPlease update it based on: ${userMessage}`
      : `Please create content based on: ${userMessage}`;

    // Estimate input tokens (rough approximation: ~4 characters per token)
    const fullPrompt = systemPrompt + userPrompt;
    const estimatedInputTokens = Math.ceil(fullPrompt.length / 4);

    // Update to generating stage
    draftProgress.stage = "generating";
    draftProgress.percentage = 25;
    draftProgress.message = `Generating content with ${models.length} AI models...`;
    draftProgress.lastUpdated = new Date().toISOString();
    gensx.publishObject<DraftProgress>("draft-progress", draftProgress);

    // Create parallel promises for each model
    const modelPromises = models.map(async (modelConfig, index) => {
      const modelStream = draftProgress.modelStreams[index];

      try {
        // Update model stream to generating and record start time
        modelStream.status = "generating";
        modelStream.startTime = Date.now();
        modelStream.inputTokens = estimatedInputTokens;
        gensx.publishObject<DraftProgress>("draft-progress", draftProgress);

        const model = getModelInstance(modelConfig);
        const result = streamText({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          onFinish: ({ usage }) => {
            // Update exact token counts from the response
            modelStream.inputTokens = usage.inputTokens;
            modelStream.outputTokens = usage.outputTokens;
            gensx.publishObject<DraftProgress>("draft-progress", draftProgress);
          },
        });

        // Process the stream internally to update progress
        for await (const chunk of result.textStream) {
          // Update model content
          modelStream.content += chunk;

          // Update stats
          const words = modelStream.content
            .split(/\s+/)
            .filter((word) => word.length > 0);
          modelStream.wordCount = words.length;
          modelStream.charCount = modelStream.content.length;

          // Publish progress update (but don't yield anything)
          gensx.publishObject<DraftProgress>("draft-progress", draftProgress);
        }

        // Model completed successfully
        modelStream.status = "complete";
        modelStream.endTime = Date.now();
        if (modelStream.startTime) {
          modelStream.generationTime =
            (modelStream.endTime - modelStream.startTime) / 1000;
        }
        draftProgress.completedModels++;
        gensx.publishObject<DraftProgress>("draft-progress", draftProgress);

        return modelStream.content; // Return the final content
      } catch (error) {
        // Handle model initialization or streaming errors
        modelStream.status = "error";

        // Extract more meaningful error message
        let errorMessage = "Unknown error";
        if (error instanceof Error) {
          // Check for specific API errors
          if (
            error.message.includes("model") &&
            error.message.includes("does not exist")
          ) {
            errorMessage = `Model not available: ${modelConfig.model}`;
          } else if (error.message.includes("API key")) {
            errorMessage = `Invalid or missing API key for ${modelConfig.provider}`;
          } else if (error.message.includes("rate limit")) {
            errorMessage = "Rate limit exceeded. Please try again later.";
          } else if (error.message.includes("timeout")) {
            errorMessage = "Request timed out. Please try again.";
          } else {
            // For other errors, show a cleaner message
            errorMessage = error.message.split("\n")[0]; // Take only first line
            // Limit length for display
            if (errorMessage.length > 100) {
              errorMessage = errorMessage.substring(0, 97) + "...";
            }
          }
        }

        modelStream.error = errorMessage;
        modelStream.endTime = Date.now();
        if (modelStream.startTime) {
          modelStream.generationTime =
            (modelStream.endTime - modelStream.startTime) / 1000;
        }
        draftProgress.completedModels++; // Count as completed even if error
        gensx.publishObject<DraftProgress>("draft-progress", draftProgress);

        throw error; // Re-throw to be caught by Promise.allSettled
      }
    });

    // Wait for all models to complete (or fail)
    draftProgress.stage = "streaming";
    draftProgress.message = `Processing ${models.length} models...`;
    gensx.publishObject<DraftProgress>("draft-progress", draftProgress);

    await Promise.allSettled(modelPromises);

    // Final progress update
    draftProgress.stage = "finalizing";
    draftProgress.percentage = 95;
    draftProgress.message = "Finalizing all content streams...";
    draftProgress.lastUpdated = new Date().toISOString();
    gensx.publishObject<DraftProgress>("draft-progress", draftProgress);

    // Publish end event
    gensx.publishEvent<EndContentEvent>("content-events", {
      type: "endContent",
      content: "draftContent",
    });

    // Final complete state
    draftProgress.status = "complete";
    draftProgress.stage = "complete";
    draftProgress.percentage = 100;
    draftProgress.message = `Content generation complete! Generated content from ${draftProgress.completedModels} of ${models.length} models.`;
    draftProgress.lastUpdated = new Date().toISOString();
    gensx.publishObject<DraftProgress>("draft-progress", draftProgress);

    // Calculate summary statistics
    const successfulModels = draftProgress.modelStreams.filter(
      (model) => model.status === "complete" && model.content.length > 0,
    );
    const failedModels = draftProgress.modelStreams.filter(
      (model) => model.status === "error",
    );

    // Calculate timing statistics
    const modelsWithTiming = draftProgress.modelStreams.filter(
      (model) => model.generationTime !== undefined,
    );
    const totalGenerationTime = modelsWithTiming.reduce(
      (sum, model) => sum + (model.generationTime ?? 0),
      0,
    );

    let fastestModel: { modelId: string; time: number } | undefined;
    let slowestModel: { modelId: string; time: number } | undefined;

    if (modelsWithTiming.length > 0) {
      const sortedByTime = [...modelsWithTiming].sort(
        (a, b) => (a.generationTime ?? 0) - (b.generationTime ?? 0),
      );
      fastestModel = {
        modelId: sortedByTime[0].modelId,
        time: sortedByTime[0].generationTime ?? 0,
      };
      slowestModel = {
        modelId: sortedByTime[sortedByTime.length - 1].modelId,
        time: sortedByTime[sortedByTime.length - 1].generationTime ?? 0,
      };
    }

    // Calculate token statistics
    const totalInputTokens = draftProgress.modelStreams.reduce(
      (sum, model) => sum + (model.inputTokens ?? 0),
      0,
    );
    const totalOutputTokens = draftProgress.modelStreams.reduce(
      (sum, model) => sum + (model.outputTokens ?? 0),
      0,
    );

    // Return comprehensive results
    const output: UpdateDraftOutput = {
      results: draftProgress.modelStreams,
      summary: {
        totalModels: models.length,
        successfulModels: successfulModels.length,
        failedModels: failedModels.length,
        totalGenerationTime,
        totalInputTokens,
        totalOutputTokens,
        fastestModel,
        slowestModel,
      },
    };

    return output;
  },
);

export {
  UpdateDraftWorkflow,
  type StartContentEvent,
  type EndContentEvent,
  type DraftProgress,
  type ModelStreamState,
  type ModelConfig,
  type UpdateDraftInput,
  type UpdateDraftOutput,
};
