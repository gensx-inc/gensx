import { openai } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { streamText } from "@gensx/vercel-ai";

// Workflow with merged draft and progress state
// Updated: Combined DraftState and ProgressUpdate into single DraftProgress
interface StartContentEvent {
  type: "startContent";
  content: string;
}

interface EndContentEvent {
  type: "endContent";
  content: string;
}

// Model configuration
interface ModelConfig {
  id: string; // Unique identifier for this model instance
  provider: "openai" | "custom";
  model: string;
  displayName?: string; // Optional display name
  // For custom providers, allow passing the model instance directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelInstance?: any;
}

// Individual model stream state
interface ModelStreamState {
  modelId: string;
  displayName: string;
  status: "idle" | "generating" | "complete" | "error";
  content: string;
  wordCount: number;
  charCount: number;
  error?: string;
}

// Single comprehensive state object for all models
interface DraftProgress {
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
}

interface UpdateDraftInput {
  userMessage: string;
  currentDraft: string;
  models: ModelConfig[];
}

type UpdateDraftOutput = string;

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
    case "custom":
      throw new Error(
        `Custom provider requires modelInstance to be provided in the config`,
      );
  }
}

const UpdateDraftWorkflow = gensx.Workflow(
  "updateDraft",
  ({ userMessage, currentDraft, models }: UpdateDraftInput) => {
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

    // Update to generating stage
    draftProgress.stage = "generating";
    draftProgress.percentage = 25;
    draftProgress.message = `Generating content with ${models.length} AI models...`;
    draftProgress.lastUpdated = new Date().toISOString();
    gensx.publishObject<DraftProgress>("draft-progress", draftProgress);

    // Create parallel streams for each model
    const modelPromises = models.map((modelConfig, index) => {
      try {
        // Update model stream to generating
        draftProgress.modelStreams[index].status = "generating";
        gensx.publishObject<DraftProgress>("draft-progress", draftProgress);

        const model = getModelInstance(modelConfig);
        const result = streamText({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        return {
          modelConfig,
          index,
          stream: result.textStream,
          error: null,
        };
      } catch (error) {
        // Handle model initialization errors
        draftProgress.modelStreams[index].status = "error";
        draftProgress.modelStreams[index].error =
          error instanceof Error ? error.message : "Unknown error";
        gensx.publishObject<DraftProgress>("draft-progress", draftProgress);

        return {
          modelConfig,
          index,
          stream: null,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Return async generator function
    const generator = async function* () {
      const streams = await Promise.all(modelPromises);
      const activeStreams = streams.filter((s) => s.stream !== null);

      if (activeStreams.length === 0) {
        draftProgress.status = "complete";
        draftProgress.stage = "complete";
        draftProgress.message = "All models failed to initialize";
        gensx.publishObject<DraftProgress>("draft-progress", draftProgress);
        return;
      }

      // Track chunks for progress updates
      const chunkCounts = new Array(models.length).fill(0);
      const streamIterators = activeStreams.map((s) =>
        s.stream[Symbol.asyncIterator](),
      );
      const activeIndexes = new Set(activeStreams.map((s) => s.index));

      // Stream from all models in parallel
      while (activeIndexes.size > 0) {
        // Create promises for the next chunk from each active stream
        const chunkPromises = Array.from(activeIndexes).map(async (index) => {
          const streamIndex = activeStreams.findIndex((s) => s.index === index);
          try {
            const result = await streamIterators[streamIndex].next();
            return { index, result, error: null };
          } catch (error) {
            return { index, result: { done: true, value: undefined }, error };
          }
        });

        // Wait for at least one chunk
        const chunks = await Promise.all(chunkPromises);

        // Process chunks
        for (const { index, result, error } of chunks) {
          if (error || result.done) {
            // Model completed or errored
            activeIndexes.delete(index);
            const modelStream = draftProgress.modelStreams[index];

            if (error) {
              modelStream.status = "error";
              modelStream.error =
                error instanceof Error ? error.message : "Stream error";
            } else {
              modelStream.status = "complete";
              draftProgress.completedModels++;
            }

            // Update final stats for this model
            const words = modelStream.content
              .split(/\s+/)
              .filter((word) => word.length > 0);
            modelStream.wordCount = words.length;
            modelStream.charCount = modelStream.content.length;
          } else if (result.value) {
            // Add chunk to model's content
            const modelStream = draftProgress.modelStreams[index];
            modelStream.content += result.value;
            chunkCounts[index]++;

            // Update stats on EVERY chunk
            const words = modelStream.content
              .split(/\s+/)
              .filter((word) => word.length > 0);
            modelStream.wordCount = words.length;
            modelStream.charCount = modelStream.content.length;

            // Yield the chunk with model identifier
            yield JSON.stringify({
              modelId: models[index].id,
              chunk: result.value,
            });
          }
        }

        // Update overall progress on EVERY chunk iteration
        const totalCompleted = draftProgress.completedModels;
        const totalActive = activeIndexes.size;
        draftProgress.stage = totalActive > 0 ? "streaming" : "finalizing";
        draftProgress.percentage = Math.min(
          50 +
            (totalCompleted / models.length) * 40 +
            Array.from(activeIndexes).reduce(
              (sum, idx) => sum + Math.min(chunkCounts[idx] * 0.5, 10),
              0,
            ),
          90,
        );
        draftProgress.message = `${totalActive} models generating, ${totalCompleted} completed...`;
        draftProgress.lastUpdated = new Date().toISOString();
        gensx.publishObject<DraftProgress>("draft-progress", draftProgress);
      }

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
    };

    return generator();
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
