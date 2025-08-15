/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-deprecated, no-console */

/**
 * Simple embedding interface - abstracts the actual embedding provider
 * In a real implementation, this would integrate with OpenAI, Anthropic, or local models
 */

interface EmbeddingProvider {
  createEmbedding(text: string): Promise<number[]>;
}

/**
 * Mock embedding provider for development/testing
 * In production, this would be replaced with actual embedding models
 */
class MockEmbeddingProvider implements EmbeddingProvider {
  async createEmbedding(text: string): Promise<number[]> {
    // Simple hash-based mock embedding for development
    // In production, use actual embedding models like text-embedding-3-small
    const hash = this.simpleHash(text);
    const dimensions = 1536; // Standard embedding dimension
    const embedding = new Array(dimensions).fill(0);
    
    // Create a pseudo-random but deterministic embedding based on text
    for (let i = 0; i < dimensions; i++) {
      embedding[i] = Math.sin(hash + i) * 0.5;
    }
    
    // Normalize the vector
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

/**
 * OpenAI embedding provider (for production use)
 */
class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = "text-embedding-3-small") {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
    this.model = model;
  }

  async createEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      console.warn("[Memory] No OpenAI API key found, falling back to mock embeddings");
      return new MockEmbeddingProvider().createEmbedding(text);
    }

    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: text,
          model: this.model,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json() as { data: { embedding: number[] }[] };
      return data.data[0].embedding;
    } catch (error) {
      console.warn("[Memory] OpenAI embedding failed, falling back to mock:", error);
      return new MockEmbeddingProvider().createEmbedding(text);
    }
  }
}

// Global embedding provider instance
let embeddingProvider: EmbeddingProvider;

/**
 * Initialize the embedding provider
 */
export function initializeEmbeddingProvider(provider?: EmbeddingProvider): void {
  embeddingProvider = provider || new OpenAIEmbeddingProvider();
}

/**
 * Create an embedding for the given text
 */
export async function createEmbedding(text: string): Promise<number[]> {
  if (!embeddingProvider) {
    initializeEmbeddingProvider();
  }
  
  return embeddingProvider.createEmbedding(text);
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embedding dimensions must match");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}