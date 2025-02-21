import { openai } from "@ai-sdk/openai";
import { gsx } from "gensx";
import { expect, test } from "vitest";

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
    prompt: "Generate a JSON object",
    model: languageModel,
    output: "no-schema",
  });

  expect(response).toBeDefined();

  // Collect all chunks from the stream
  const chunks = [];
  for await (const chunk of response.partialObjectStream) {
    expect(chunk).toBeTypeOf("object");
    chunks.push(chunk);
  }

  // Verify we received some data
  expect(chunks.length).toBeGreaterThan(0);

  // Verify each chunk is a valid JSON object
  chunks.forEach((chunk) => {
    expect(() => JSON.stringify(chunk)).not.toThrow();
    expect(chunk).toHaveProperty("id");
    expect(chunk).toHaveProperty("content");
  });
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
  const result = await workflow.run({
    prompt: "Generate a user object",
    model: languageModel,
    output: "no-schema",
  });

  expect(result).toBeDefined();
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
