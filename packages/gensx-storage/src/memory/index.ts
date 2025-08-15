/**
 * GenSX Memory - A thin, opinionated memory layer on top of GenSX Storage
 * 
 * Provides simple API for remembering and recalling information with:
 * - Automatic embeddings and vector search
 * - Hybrid retrieval (semantic + keyword + recency)
 * - Short-term memory management
 * - Fact extraction from conversations
 * - Agent attachment for automatic memory integration
 */

export * from "./types.js";
export { MemoryClient } from "./memoryClient.js";
export { FactExtractor } from "./factExtractor.js";
export { ShortTermBuffer } from "./shortTermBuffer.js";
export { createEmbedding, initializeEmbeddingProvider, cosineSimilarity } from "./embedding.js";

import { MemoryClient } from "./memoryClient.js";
import { MemoryConfig } from "./types.js";

/**
 * Create a new memory instance
 * 
 * @example
 * ```typescript
 * const memory = createMemory({
 *   scope: { workspaceId: "acme", userId: "derek", agentId: "stylist" }
 * });
 * 
 * // Save a fact
 * await memory.remember({ text: "Derek prefers navy ties.", type: "semantic" });
 * 
 * // Recall relevant memories
 * const memories = await memory.recall({ query: "What tie should I recommend?" });
 * 
 * // Wrap an agent with memory
 * const agentWithMemory = await memory.attach(agent);
 * ```
 */
export function createMemory(config: MemoryConfig): MemoryClient {
  return new MemoryClient(config);
}