import { vi } from "vitest";

// Mock the OpenAI module
const createMockOpenAI = (modelId: string) => ({
  specificationVersion: "v1" as const,
  provider: "openai",
  modelId,
  defaultObjectGenerationMode: "json" as const,
  doGenerate: vi
    .fn()
    .mockImplementation(async (params: { mode?: { type: string } }) => {
      await Promise.resolve();

      // Check if this is an object generation request
      if (params.mode?.type === "object-json") {
        const response = {
          text: JSON.stringify({
            recipe: {
              name: "Chocolate Chip Cookies",
              ingredients: ["flour", "sugar", "chocolate chips"],
              steps: ["Mix ingredients", "Bake at 350F"],
            },
          }),
          finishReason: "stop",
          promptTokens: 10,
          completionTokens: 2,
          totalTokens: 12,
          usage: {
            promptTokens: 10,
            completionTokens: 2,
            totalTokens: 12,
          },
        };
        return response;
      }

      // Default text response
      const response = {
        text: "Hello World",
        finishReason: "stop",
        promptTokens: 10,
        completionTokens: 2,
        totalTokens: 12,
        usage: {
          promptTokens: 10,
          completionTokens: 2,
          totalTokens: 12,
        },
      };
      return response;
    }),
  doStream: vi.fn().mockImplementation(async () => {
    await Promise.resolve();
    return {
      stream: new ReadableStream({
        async start(controller) {
          controller.enqueue({
            type: "text-delta",
            textDelta: "Hello ",
          });
          await Promise.resolve();
          controller.enqueue({
            type: "text-delta",
            textDelta: "World",
          });
          controller.enqueue({
            type: "finish",
            finishReason: "stop",
            usage: {
              promptTokens: 10,
              completionTokens: 2,
            },
          });
          controller.close();
        },
      }),
      rawCall: { rawPrompt: "test", rawSettings: {} },
      rawResponse: { headers: {} },
      warnings: [],
      request: { body: "{}" },
    };
  }),
  doObject: vi.fn().mockImplementation(async () => {
    await Promise.resolve();
    return {
      recipe: {
        name: "Chocolate Chip Cookies",
        ingredients: ["flour", "sugar", "chocolate chips"],
        steps: ["Mix ingredients", "Bake at 350F"],
      },
      usage: {
        promptTokens: 10,
        completionTokens: 2,
        totalTokens: 12,
      },
    };
  }),
});

const createMockEmbedding = (modelId: string) => ({
  specificationVersion: "v1" as const,
  provider: "openai",
  modelId,
  maxEmbeddingsPerCall: 100,
  supportsParallelCalls: true,
  doEmbed: vi.fn().mockImplementation(async (params: { values: string[] }) => {
    await Promise.resolve();
    return {
      embeddings: params.values.map(() => [0.1, 0.2, 0.3]),
      usage: {
        tokens: params.values.length * 3,
      },
    };
  }),
});

// Create a function that can be called directly and also has properties
const openaiFunction = (modelId: string) => createMockOpenAI(modelId);
openaiFunction.embedding = (modelId: string) => createMockEmbedding(modelId);

export const openai = openaiFunction;
