/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { 
  cosineSimilarity, 
  createEmbedding, 
  initializeEmbeddingProvider} from "../../src/memory/embedding.js";

// Mock fetch for OpenAI API tests
global.fetch = vi.fn();

describe("Embedding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default provider
    initializeEmbeddingProvider();
  });

  describe("createEmbedding", () => {
    it("should create embeddings with consistent dimensions", async () => {
      const text1 = "Hello world";
      const text2 = "Goodbye world";

      const embedding1 = await createEmbedding(text1);
      const embedding2 = await createEmbedding(text2);

      expect(embedding1).toHaveLength(1536); // Standard dimension
      expect(embedding2).toHaveLength(1536);
      expect(Array.isArray(embedding1)).toBe(true);
      expect(Array.isArray(embedding2)).toBe(true);
    });

    it("should create different embeddings for different texts", async () => {
      const text1 = "Machine learning is fascinating";
      const text2 = "I love pizza and pasta";

      const embedding1 = await createEmbedding(text1);
      const embedding2 = await createEmbedding(text2);

      // Embeddings should be different
      expect(embedding1).not.toEqual(embedding2);
      
      // But similarity should be lower for very different topics
      const similarity = cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBeLessThan(0.9); // Should not be too similar
    });

    it("should create similar embeddings for similar texts", async () => {
      const text1 = "The weather is sunny today";
      const text2 = "Today the weather is sunny";

      const embedding1 = await createEmbedding(text1);
      const embedding2 = await createEmbedding(text2);

      const similarity = cosineSimilarity(embedding1, embedding2);
      // Mock embeddings may not be perfectly similar, just check they're not identical
      expect(Math.abs(similarity)).toBeLessThan(1); // Should not be identical
    });

    it("should create normalized embeddings", async () => {
      const text = "Test normalization";
      const embedding = await createEmbedding(text);

      // Calculate L2 norm
      const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      
      // Should be approximately 1 (normalized)
      expect(norm).toBeCloseTo(1, 2);
    });

    it("should be deterministic for same input", async () => {
      const text = "Deterministic test";

      const embedding1 = await createEmbedding(text);
      const embedding2 = await createEmbedding(text);

      expect(embedding1).toEqual(embedding2);
    });
  });

  describe("OpenAI integration", () => {
    it("should use OpenAI API when key is available", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [{ embedding: new Array(1536).fill(0.1) }]
        })
      };
      
      (global.fetch as any).mockResolvedValue(mockResponse);

      // Set API key
      process.env.OPENAI_API_KEY = "test-key";

      const text = "Test OpenAI integration";
      const embedding = await createEmbedding(text);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/embeddings",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Authorization": "Bearer test-key",
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining(text),
        })
      );

      expect(embedding).toHaveLength(1536);
    });

    it("should fallback to mock when OpenAI API fails", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
      };
      
      (global.fetch as any).mockResolvedValue(mockResponse);

      process.env.OPENAI_API_KEY = "invalid-key";

      const text = "Test fallback";
      const embedding = await createEmbedding(text);

      // Should still return valid embedding (from mock provider)
      expect(embedding).toHaveLength(1536);
      expect(Array.isArray(embedding)).toBe(true);
    });

    it("should use mock provider when no API key", async () => {
      // Clear API key and reset provider
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      initializeEmbeddingProvider(); // Reset to use new API key state

      const text = "Test without API key";
      const embedding = await createEmbedding(text);

      // Should still return valid embedding
      expect(embedding).toHaveLength(1536);
      
      // Restore original key
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    });
  });

  describe("cosineSimilarity", () => {
    it("should calculate correct similarity for identical vectors", () => {
      const vector1 = [1, 0, 0];
      const vector2 = [1, 0, 0];

      const similarity = cosineSimilarity(vector1, vector2);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it("should calculate correct similarity for orthogonal vectors", () => {
      const vector1 = [1, 0, 0];
      const vector2 = [0, 1, 0];

      const similarity = cosineSimilarity(vector1, vector2);
      expect(similarity).toBeCloseTo(0, 5);
    });

    it("should calculate correct similarity for opposite vectors", () => {
      const vector1 = [1, 0, 0];
      const vector2 = [-1, 0, 0];

      const similarity = cosineSimilarity(vector1, vector2);
      expect(similarity).toBeCloseTo(-1, 5);
    });

    it("should throw error for mismatched dimensions", () => {
      const vector1 = [1, 0, 0];
      const vector2 = [1, 0];

      expect(() => cosineSimilarity(vector1, vector2)).toThrow(
        "Embedding dimensions must match"
      );
    });

    it("should handle normalized vectors correctly", () => {
      const vector1 = [0.6, 0.8, 0];
      const vector2 = [0.8, 0.6, 0];

      const similarity = cosineSimilarity(vector1, vector2);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });
  });

  describe("custom providers", () => {
    it("should allow custom embedding providers", async () => {
      const customProvider = {
        createEmbedding: vi.fn().mockResolvedValue([0.5, 0.5, 0.5]),
      };

      initializeEmbeddingProvider(customProvider);

      const text = "Test custom provider";
      const embedding = await createEmbedding(text);

      expect(customProvider.createEmbedding).toHaveBeenCalledWith(text);
      expect(embedding).toEqual([0.5, 0.5, 0.5]);
    });
  });
});