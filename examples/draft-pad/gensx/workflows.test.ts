import { existsSync, renameSync } from "fs";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type ModelConfig, UpdateDraftWorkflow } from "./workflows";

// Setup for PostCSS config conflict
let postcssRenamed = false;

beforeAll(() => {
  // Temporarily rename postcss.config.mjs to avoid conflicts with vitest
  if (existsSync("postcss.config.mjs")) {
    renameSync("postcss.config.mjs", "postcss.config.mjs.backup");
    postcssRenamed = true;
  }
});

afterAll(() => {
  // Restore postcss.config.mjs
  if (postcssRenamed && existsSync("postcss.config.mjs.backup")) {
    renameSync("postcss.config.mjs.backup", "postcss.config.mjs");
  }
});

describe("UpdateDraftWorkflow", () => {
  it("should generate content with a single model", async () => {
    const models: ModelConfig[] = [
      {
        id: "test-openai",
        provider: "openai",
        model: "gpt-4o-mini",
        displayName: "GPT-4O Mini",
      },
    ];

    const result = await UpdateDraftWorkflow(
      {
        userMessage: "Write a short haiku about testing",
        currentDraft: "",
        models,
      },
      {
        messageListener: (msg: unknown) => {
          console.log("Message:", JSON.stringify(msg, null, 2));
        },
      },
    );

    // Check the structure of the response
    expect(result).toBeDefined();
    expect(result).toHaveProperty("results");
    expect(result).toHaveProperty("summary");

    // Check results array
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results).toHaveLength(1);

    const modelResult = result.results[0];
    expect(modelResult.modelId).toBe("test-openai");
    expect(modelResult.displayName).toBe("GPT-4O Mini");
    expect(modelResult.status).toBe("complete");
    expect(modelResult.content).toBeDefined();
    expect(modelResult.content.length).toBeGreaterThan(0);
    expect(modelResult.wordCount).toBeGreaterThan(0);
    expect(modelResult.generationTime).toBeGreaterThan(0);

    // Check summary
    expect(result.summary.totalModels).toBe(1);
    expect(result.summary.successfulModels).toBe(1);
    expect(result.summary.failedModels).toBe(0);
    expect(result.summary.totalInputTokens).toBeGreaterThan(0);
    expect(result.summary.totalOutputTokens).toBeGreaterThan(0);
    expect(result.summary.fastestModel).toBeDefined();
    expect(result.summary.fastestModel?.modelId).toBe("test-openai");

    console.log("Generated content:", modelResult.content);
    console.log("Summary:", result.summary);
  }, 30000);

  it("should handle multiple models in parallel", async () => {
    const models: ModelConfig[] = [
      {
        id: "test-openai-1",
        provider: "openai",
        model: "gpt-4o-mini",
        displayName: "GPT-4O Mini",
      },
      {
        id: "test-openai-2",
        provider: "openai",
        model: "gpt-3.5-turbo",
        displayName: "GPT-3.5 Turbo",
      },
    ];

    const result = await UpdateDraftWorkflow(
      {
        userMessage: "Write a very short poem about parallel processing",
        currentDraft: "",
        models,
      },
      {
        messageListener: (msg: unknown) => {
          console.log("Message:", JSON.stringify(msg, null, 2));
        },
      },
    );

    // Check the structure
    expect(result.results).toHaveLength(2);
    expect(result.summary.totalModels).toBe(2);
    expect(result.summary.successfulModels).toBe(2);
    expect(result.summary.failedModels).toBe(0);

    // Check both models completed
    result.results.forEach((modelResult) => {
      expect(modelResult.status).toBe("complete");
      expect(modelResult.content.length).toBeGreaterThan(0);
      expect(modelResult.generationTime).toBeGreaterThan(0);
    });

    // Check timing statistics
    expect(result.summary.fastestModel).toBeDefined();
    expect(result.summary.slowestModel).toBeDefined();
    expect(result.summary.totalGenerationTime).toBeGreaterThan(0);

    console.log("Model 1 content:", result.results[0].content);
    console.log("Model 2 content:", result.results[1].content);
    console.log("Fastest model:", result.summary.fastestModel);
    console.log("Slowest model:", result.summary.slowestModel);
  }, 30000);

  it("should handle errors gracefully", async () => {
    const models: ModelConfig[] = [
      {
        id: "test-invalid",
        provider: "openai",
        model: "invalid-model-name",
        displayName: "Invalid Model",
      },
    ];

    const result = await UpdateDraftWorkflow(
      {
        userMessage: "Write something",
        currentDraft: "",
        models,
      },
      {
        messageListener: (msg: unknown) => {
          console.log("Error test message:", JSON.stringify(msg, null, 2));
        },
      },
    );

    // Even with errors, we should get a result structure
    expect(result).toBeDefined();
    expect(result.results).toHaveLength(1);
    expect(result.summary.totalModels).toBe(1);

    const modelResult = result.results[0];
    expect(modelResult.modelId).toBe("test-invalid");

    // The model should either have failed with an error or returned empty content
    const hasError = modelResult.status === "error" && modelResult.error;
    const hasEmptyContent =
      modelResult.status === "complete" && modelResult.content === "";

    expect(Boolean(hasError) || Boolean(hasEmptyContent)).toBe(true);

    if (hasError) {
      expect(result.summary.failedModels).toBe(1);
      expect(result.summary.successfulModels).toBe(0);
      console.log("Model failed with error:", modelResult.error);
    } else {
      expect(result.summary.successfulModels).toBe(0); // Empty content doesn't count as successful
      console.log("Model returned empty content");
    }
  }, 30000);
});
