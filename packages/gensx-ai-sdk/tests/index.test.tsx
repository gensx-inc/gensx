import { openai } from "@ai-sdk/openai";
import { gsx } from "gensx";
import { expect, test } from "vitest";
import { z } from "zod";

import * as AI from "../src";

// Test configuration
const languageModel = openai("gpt-4o-mini");

const embeddingModel = openai.embedding("text-embedding-3-small");

const imageModel = openai.image("dall-e-3");

test("StreamText streams text response", async () => {
  const workflow = gsx.Workflow("StreamText", AI.StreamText);
  const stream = await workflow.run({
    prompt: "What is the weather?",
    model: languageModel,
  });

  expect(stream).toBeDefined();
});

test("StreamObject streams JSON objects", async () => {
  const workflow = gsx.Workflow("StreamObject", AI.StreamObject);
  const response = await workflow.run({
    prompt:
      "Generate a chat message object representing an AI assistant's response about machine learning",
    model: languageModel,
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
  const workflow = gsx.Workflow("GenerateText", AI.GenerateText);
  const result = await workflow.run({
    prompt: "Tell me a joke",
    model: languageModel,
  });
  expect(result).toBeDefined();
});

test("GenerateObject generates JSON object", async () => {
  const workflow = gsx.Workflow("GenerateObject", AI.GenerateObject);
  const response = await workflow.run({
    prompt:
      "Generate a chat message object representing an AI assistant's response about machine learning",
    model: languageModel,
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

test("Embed generates embeddings", async () => {
  const workflow = gsx.Workflow("Embed", AI.Embed);
  const embedding = await workflow.run({
    value: "Sample text to embed",
    model: embeddingModel,
  });
  expect(embedding).toBeDefined();
});

test("EmbedMany generates multiple embeddings", async () => {
  const workflow = gsx.Workflow("EmbedMany", AI.EmbedMany);
  const embeddings = await workflow.run({
    values: ["Text 1", "Text 2"],
    model: embeddingModel,
  });

  expect(embeddings).toBeDefined();
});

test("GenerateImage generates image", async () => {
  const workflow = gsx.Workflow("GenerateImage", AI.GenerateImage);
  const result = await workflow.run({
    prompt: "A sunset over mountains",
    model: imageModel,
  });

  expect(result).toBeDefined();
}, 30000);
