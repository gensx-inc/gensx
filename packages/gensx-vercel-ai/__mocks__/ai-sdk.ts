import { vi } from "vitest";

// Mock the OpenAI module
const createMockOpenAI = (modelId: string) => ({
  specificationVersion: "v2" as const,
  provider: "openai",
  modelId,
  defaultObjectGenerationMode: "json" as const,
  supportedUrls: {},
  doGenerate: vi
    .fn()
    .mockImplementation(
      async (params: { responseFormat?: { type: string } }) => {
        await Promise.resolve();

        // Check if this is an object generation request
        if (params.responseFormat?.type === "json") {
          const response = {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  recipe: {
                    name: "Chocolate Chip Cookies",
                    ingredients: ["flour", "sugar", "chocolate chips"],
                    steps: ["Mix ingredients", "Bake at 350F"],
                  },
                }),
              },
            ],
            finishReason: "stop",
            usage: {
              promptTokens: 10,
              completionTokens: 2,
              totalTokens: 12,
            },
            response: {
              id: "test-id",
              modelId: modelId,
              timestamp: new Date(),
              headers: {},
              messages: [
                {
                  role: "assistant",
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify({
                        recipe: {
                          name: "Chocolate Chip Cookies",
                          ingredients: ["flour", "sugar", "chocolate chips"],
                          steps: ["Mix ingredients", "Bake at 350F"],
                        },
                      }),
                    },
                  ],
                },
              ],
            },
            rawCall: { rawPrompt: "test", rawSettings: {} },
            rawResponse: { headers: {} },
            warnings: [],
            request: { body: "{}" },
          };
          return response;
        }

        // Default text response - AI SDK v5 format
        const response = {
          content: [{ type: "text", text: "Hello World" }],
          finishReason: "stop",
          usage: {
            promptTokens: 10,
            completionTokens: 2,
            totalTokens: 12,
          },
          response: {
            id: "test-id",
            modelId: modelId,
            timestamp: new Date(),
            headers: {},
            messages: [
              {
                role: "assistant",
                content: [{ type: "text", text: "Hello World" }],
              },
            ],
          },
          rawCall: { rawPrompt: "test", rawSettings: {} },
          rawResponse: { headers: {} },
          warnings: [],
          request: { body: "{}" },
        };
        return response;
      },
    ),
  doStream: vi.fn().mockImplementation(async () => {
    await Promise.resolve();
    return {
      stream: new ReadableStream({
        async start(controller) {
          const messageId = "msg_test_id";

          controller.enqueue({
            type: "stream-start",
            warnings: [],
          });

          controller.enqueue({
            type: "response-metadata",
            id: "resp_test_id",
            timestamp: new Date(),
            modelId: modelId,
          });

          controller.enqueue({
            type: "text-start",
            id: messageId,
          });

          controller.enqueue({
            type: "text-delta",
            id: messageId,
            delta: "Hello ",
          });

          await Promise.resolve();

          controller.enqueue({
            type: "text-delta",
            id: messageId,
            delta: "World",
          });

          controller.enqueue({
            type: "text-end",
            id: messageId,
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
      response: {
        id: "test-id",
        modelId: modelId,
        timestamp: new Date(),
        headers: {},
        messages: [],
      },
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
  specificationVersion: "v2" as const,
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
