/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import * as gensx from "@gensx/core";
import { expect, test } from "vitest";
import { z } from "zod";

import { openai } from "../__mocks__/ai-sdk.js";
import * as AI from "../src/index.js";

// Test configuration
const languageModel = openai("gpt-4o-mini");
const embeddingModel = openai.embedding("text-embedding-3-small");

test("StreamText streams text response", async () => {
  const workflow = gensx.createWorkflow(AI.streamText, {
    name: "StreamText",
  });

  // Test streaming mode
  const streamTextResult = await workflow({
    prompt: "Write a short poem about programming",
    model: languageModel,
  });

  // Verify it's an async iterable
  expect(streamTextResult).toBeDefined();

  // Collect streaming results
  let streamedContent = "";
  for await (const token of streamTextResult.textStream) {
    streamedContent += token as string;
  }

  // Verify the content
  expect(streamedContent).toBe("Hello World");
  expect(streamedContent.length).toBeGreaterThan(0);
});

test("StreamObject streams JSON objects", async () => {
  const workflow = gensx.createWorkflow(AI.streamObject, {
    name: "StreamObject",
  });
  const response = await workflow({
    prompt: "Generate a recipe",
    model: languageModel,
    // @ts-expect-error - schema is not a valid property of the streamObject function
    schema: z.object({
      recipe: z.object({
        name: z.string(),
        ingredients: z.array(z.string()),
        steps: z.array(z.string()),
      }),
    }),
  });
  expect(response).toBeDefined();
});

test("GenerateText generates text", async () => {
  const workflow = gensx.createWorkflow(AI.generateText, {
    name: "GenerateText",
  });
  const result = await workflow({
    prompt: "Tell me a joke",
    model: languageModel,
  });
  expect(result.text).toBe("Hello World");
});

test("GenerateObject generates JSON object", async () => {
  const workflow = gensx.createWorkflow(AI.generateObject, {
    name: "GenerateObject",
  });
  const response = await workflow({
    prompt: "Generate a recipe",
    model: languageModel,
    // @ts-expect-error - schema is not a valid property of the generateObject function
    schema: z.object({
      recipe: z.object({
        name: z.string(),
        ingredients: z.array(z.string()),
        steps: z.array(z.string()),
      }),
    }),
    mode: "json",
  });

  console.info("GenerateObject test response:", response);

  // Define the expected response type
  interface RecipeResponse {
    object: {
      recipe: {
        name: string;
        ingredients: string[];
        steps: string[];
      };
    };
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }

  // Verify the response structure and content
  expect(response).toBeDefined();
  const data = response as unknown as RecipeResponse;
  expect(data.object).toBeDefined();
  expect(data.object.recipe).toBeDefined();
  expect(data.object.recipe.name).toBe("Chocolate Chip Cookies");
  expect(data.object.recipe.ingredients).toEqual([
    "flour",
    "sugar",
    "chocolate chips",
  ]);
  expect(data.object.recipe.steps).toEqual(["Mix ingredients", "Bake at 350F"]);
  expect(data.usage).toBeDefined();
  expect(data.usage.promptTokens).toBe(10);
  expect(data.usage.completionTokens).toBe(2);
  expect(data.usage.totalTokens).toBe(12);
});

test("Embed generates embeddings", async () => {
  const workflow = gensx.createWorkflow(AI.embed, {
    name: "Embed",
  });
  const result = await workflow({
    value: "Sample text to embed",
    model: embeddingModel,
  });

  // Test the structure and content of the response
  expect(result).toHaveProperty("embedding");
  expect(result.embedding).toBeInstanceOf(Array);
  expect(result.embedding).toHaveLength(3); // Based on our mock
  expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
  expect(result).toHaveProperty("usage");
  expect(result.usage).toHaveProperty("tokens", 3);
});

test("EmbedMany generates multiple embeddings", async () => {
  const workflow = gensx.createWorkflow(AI.embedMany, {
    name: "EmbedMany",
  });
  const result = await workflow({
    values: ["Text 1", "Text 2"],
    model: embeddingModel,
  });

  // Test the structure and content of the response
  expect(result).toHaveProperty("embeddings");
  expect(result.embeddings).toBeInstanceOf(Array);
  expect(result.embeddings).toHaveLength(2); // Two input texts
  expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
  expect(result.embeddings[1]).toEqual([0.1, 0.2, 0.3]);
  expect(result).toHaveProperty("usage");
  expect(result.usage).toHaveProperty("tokens", 6); // 3 tokens per embedding
});
