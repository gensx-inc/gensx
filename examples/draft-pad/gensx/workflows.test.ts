import { describe, expect, it } from "vitest";

import { type ModelConfig, UpdateDraftWorkflow } from "./workflows";

describe("UpdateDraftWorkflow - Integration Test", () => {
  it("should run the workflow with a real model", async () => {
    // Use a simple model configuration - adjust based on what API keys you have
    const testModels: ModelConfig[] = [
      {
        id: "test-gpt-3.5",
        provider: "openai",
        model: "gpt-3.5-turbo",
        displayName: "GPT-3.5 Turbo Test",
        available: true,
      },
    ];

    // Create test input
    const input = {
      userMessage: "Make this text more concise",
      currentDraft:
        "This is a very long and verbose piece of text that could definitely be made shorter and more to the point without losing any of the important meaning.",
      models: testModels,
    };

    // Run the workflow with runtime options
    const generator = await UpdateDraftWorkflow(input, {
      messageListener: () => {
        // Silently consume events
      },
    });

    // Collect all chunks
    const chunks: string[] = [];
    let chunkCount = 0;

    for await (const chunk of generator) {
      chunks.push(chunk);
      chunkCount++;
    }

    // Basic assertions
    expect(chunkCount).toBeGreaterThan(0);
    expect(chunks.length).toBeGreaterThan(0);

    // Parse and validate some chunks
    const parsedChunks = chunks
      .filter((chunk) => chunk.trim())
      .map((chunk) => {
        try {
          return JSON.parse(chunk);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Should have received some valid JSON chunks
    expect(parsedChunks.length).toBeGreaterThan(0);

    // Check that we got chunks with the expected model ID
    const modelChunks = parsedChunks.filter(
      (chunk) => chunk.modelId === "test-gpt-3.5",
    );
    expect(modelChunks.length).toBeGreaterThan(0);

    // Verify we got actual content
    const contentChunks = modelChunks.filter((chunk) => chunk.chunk);
    expect(contentChunks.length).toBeGreaterThan(0);

    // Concatenate all content to verify we got a response
    const fullContent = contentChunks.map((chunk) => chunk.chunk).join("");

    expect(fullContent).toBeTruthy();
    expect(fullContent.length).toBeGreaterThan(0);

    // The response should be shorter than the original (since we asked for conciseness)
    expect(fullContent.length).toBeLessThan(input.currentDraft.length);
  }, 30000); // 30 second timeout for API calls

  it("should handle multiple models in parallel", async () => {
    // Test with multiple models if you have multiple API keys
    const testModels: ModelConfig[] = [
      {
        id: "model-1",
        provider: "openai",
        model: "gpt-3.5-turbo",
        displayName: "GPT-3.5 Turbo",
        available: true,
      },
      // Uncomment if you have Anthropic API key
      // {
      //   id: "model-2",
      //   provider: "anthropic",
      //   model: "claude-3-haiku-20240307",
      //   displayName: "Claude 3 Haiku",
      //   available: true,
      // },
    ];

    const input = {
      userMessage: "Write a haiku about testing",
      currentDraft: "",
      models: testModels,
    };

    const generator = await UpdateDraftWorkflow(input);

    const modelResponses = new Map<string, string>();

    for await (const chunk of generator) {
      if (!chunk.trim()) continue;

      try {
        const parsed = JSON.parse(chunk);
        if (parsed.modelId && parsed.chunk) {
          const existing = modelResponses.get(parsed.modelId) ?? "";
          modelResponses.set(
            parsed.modelId,
            existing + (parsed.chunk as string),
          );
        }
      } catch {
        // Skip non-JSON chunks
      }
    }

    // Should have responses from all models
    expect(modelResponses.size).toBe(testModels.length);

    // Each model should have produced some content
    for (const [modelId, content] of modelResponses) {
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
      console.log(`Model ${modelId} response:`, content);
    }
  }, 30000);

  it("should handle workflow errors gracefully", async () => {
    // Test with an invalid model to ensure error handling works
    const testModels: ModelConfig[] = [
      {
        id: "invalid-model",
        provider: "openai",
        model: "gpt-99-ultra", // Non-existent model
        displayName: "Invalid Model",
        available: true,
      },
    ];

    const input = {
      userMessage: "Test error handling",
      currentDraft: "Test content",
      models: testModels,
    };

    const generator = await UpdateDraftWorkflow(input);

    let errorFound = false;

    for await (const chunk of generator) {
      // The workflow should complete even with errors
      if (chunk.includes("error") || chunk.includes("Model not available")) {
        errorFound = true;
      }
    }

    // We expect the workflow to handle the error gracefully
    // It should complete without throwing
    expect(errorFound).toBe(false); // The error is in the progress object, not the chunks
  });
});
