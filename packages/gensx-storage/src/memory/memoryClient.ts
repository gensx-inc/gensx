/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-deprecated, no-console */

import { SearchClient } from "../search/searchClient.js";
import { Namespace } from "../search/types.js";
import { createEmbedding } from "./embedding.js";
import { FactExtractor } from "./factExtractor.js";
import { ShortTermBuffer } from "./shortTermBuffer.js";
import {
  AttachConfig,
  HybridScoringOptions,
  MemoryConfig,
  MemoryDocument,
  MemoryImportance,
  MemoryItem,
  MemoryScope,
  RecallOptions,
  RecallResult,
  RememberInput,
} from "./types.js";

/**
 * Memory client for managing memories with vector search backend
 */
export class MemoryClient {
  private searchClient: SearchClient;
  private namespace: Namespace | null = null;
  private scope: MemoryScope;
  private policy: Required<NonNullable<MemoryConfig["policy"]>>;
  private factExtractor: FactExtractor;
  private shortTermBuffer: ShortTermBuffer;

  constructor(config: MemoryConfig) {
    this.scope = config.scope;
    this.policy = {
      retention: { defaultTTL: undefined },
      shortTerm: { tokenLimit: 4000, summarizeOverflow: true },
      privacy: { redactPII: false },
      observability: { trace: true },
      ...config.policy,
    } as Required<NonNullable<MemoryConfig["policy"]>>;

    this.searchClient = new SearchClient({
      project: process.env.GENSX_PROJECT,
      environment: process.env.GENSX_ENV,
    });

    this.factExtractor = new FactExtractor();
    this.shortTermBuffer = new ShortTermBuffer(this.policy.shortTerm);
  }

  /**
   * Get the namespace for this memory scope
   */
  private async getNamespace(): Promise<Namespace> {
    if (!this.namespace) {
      const namespaceName = this.generateNamespaceName();
      this.namespace = await this.searchClient.getNamespace(namespaceName);
    }
    return this.namespace;
  }

  /**
   * Generate namespace name from scope
   */
  private generateNamespaceName(): string {
    const parts = [
      "memory",
      this.scope.workspaceId,
      this.scope.userId,
      this.scope.agentId,
      this.scope.threadId,
    ].filter(Boolean);
    return parts.join(":");
  }

  /**
   * Remember a new memory item
   */
  async remember(input: RememberInput): Promise<{ id: string }> {
    const id = this.generateId();
    const now = new Date().toISOString();
    const type = input.type || "semantic";

    // Create memory item
    const memoryItem: MemoryItem = {
      id,
      type,
      text: input.text,
      tags: input.tags,
      importance: input.importance,
      createdAt: now,
      ttl: input.ttl || this.policy.retention.defaultTTL,
      attributes: input.attributes,
      source: input.source,
    };

    // Create embedding for semantic search
    const vector = await createEmbedding(input.text);

    // Create document for storage
    const document: MemoryDocument = {
      ...memoryItem,
      namespace: this.generateNamespaceName(),
      vector,
      textLength: input.text.length,
      importanceScore: this.mapImportanceToScore(input.importance),
      recencyScore: this.calculateRecencyScore(now),
    };

    // Store in vector database
    const namespace = await this.getNamespace();
    await namespace.write({
      upsertRows: [
        {
          id: document.id,
          vector: document.vector,
          type: document.type,
          text: document.text,
          tags: document.tags,
          importance: document.importance,
          createdAt: document.createdAt,
          ttl: document.ttl,
          attributes: document.attributes,
          source: document.source,
          namespace: document.namespace,
          textLength: document.textLength,
          importanceScore: document.importanceScore,
          recencyScore: document.recencyScore,
        },
      ],
    });

    // Handle short-term memory buffer
    if (type === "shortTerm") {
      await this.shortTermBuffer.add(memoryItem, this);
    }

    if (this.policy.observability.trace) {
      console.log(`[Memory] Remembered ${type} memory: ${id}`);
    }

    return { id };
  }

  /**
   * Recall relevant memories
   */
  async recall(options: RecallOptions = {}): Promise<RecallResult[]> {
    const limit = Math.min(options.limit || 5, 10); // Hard cap at 10

    let results: RecallResult[] = [];

    if (options.query) {
      // Hybrid search: vector + keyword + recency
      results = await this.performHybridSearch(options.query, options, limit);
    } else {
      // No query: sort by importance then recency
      results = await this.performNonSemanticRetrieval(options, limit);
    }

    // Apply additional filters
    results = this.applyFilters(results);

    if (this.policy.observability.trace) {
      console.log(`[Memory] Recalled ${results.length} memories`);
    }

    return results.slice(0, limit);
  }

  /**
   * Attach memory capabilities to an agent
   */
  async attach(agent: any, config: AttachConfig = {}): Promise<any> {
    const attachConfig = {
      preRecall: { limit: 5, types: ["semantic", "episodic"] },
      injectMode: "systemPreamble",
      postTurn: { logEpisodic: true, extractFacts: true },
      shortTerm: this.policy.shortTerm,
      ...config,
    };

    // Return wrapped agent with memory capabilities
    return async (input: any) => {
      // Pre-turn: Recall relevant memories
      const preRecallOptions: RecallOptions = {
        query: typeof input === "string" ? input : JSON.stringify(input),
        limit: attachConfig.preRecall?.limit,
        types: attachConfig.preRecall?.types as any,
      };

      const memories = await this.recall(preRecallOptions);
      
      // Inject memories into agent context
      let enhancedInput = input;
      if (attachConfig.injectMode === "systemPreamble" && memories.length > 0) {
        const memoryContext = this.formatMemoriesForInjection(memories);
        enhancedInput = {
          ...input,
          systemMessage: `${input.systemMessage || ""}\n\n${memoryContext}`.trim(),
        };
      }

      // Execute agent
      const result = await agent(enhancedInput);

      // Post-turn processing
      if (attachConfig.postTurn?.logEpisodic) {
        await this.logEpisodicMemory(input, result);
      }

      if (attachConfig.postTurn?.extractFacts) {
        await this.extractAndStoreFacts(input, result);
      }

      return result;
    };
  }

  /**
   * Perform hybrid search combining vector, keyword, and recency
   */
  private async performHybridSearch(
    query: string,
    options: RecallOptions,
    limit: number,
  ): Promise<RecallResult[]> {
    const namespace = await this.getNamespace();
    const vector = await createEmbedding(query);

    // Vector search
    const vectorResults = await namespace.query({
      topK: limit * 2, // Get more for fusion
      includeAttributes: true,
      filters: this.buildFilters(options),
      rankBy: ["Similarity", vector] as any,
    });

    // Keyword search
    const keywordResults = await namespace.query({
      topK: limit * 2,
      includeAttributes: true,
      filters: this.buildFilters(options),
      rankBy: ["FullTextSearch", query] as any,
    });

    // Combine and score
    const scoringOptions: HybridScoringOptions = {
      semanticWeight: 0.6,
      keywordWeight: 0.25,
      recencyWeight: 0.15,
    };

    return this.fuseSearchResults(
      vectorResults.rows || [],
      keywordResults.rows || [],
      scoringOptions,
    );
  }

  /**
   * Perform non-semantic retrieval based on importance and recency
   */
  private async performNonSemanticRetrieval(
    options: RecallOptions,
    limit: number,
  ): Promise<RecallResult[]> {
    const namespace = await this.getNamespace();

    const results = await namespace.query({
      topK: limit,
      includeAttributes: true,
      filters: this.buildFilters(options),
      rankBy: ["Composite", [
        ["importanceScore", -1], // Descending importance
        ["recencyScore", -1],    // Descending recency
      ]] as any,
    });

    return (results.rows || []).map((row) => ({
      item: this.rowToMemoryItem(row),
      score: 1.0, // Not applicable for non-semantic retrieval
    }));
  }

  /**
   * Build filters for query options
   */
  private buildFilters(options: RecallOptions): any {
    const filters: any = {};

    if (options.types?.length) {
      filters.type = { $in: options.types };
    }

    if (options.tags?.length) {
      // Simple AND filter for tags
      filters.tags = { $contains: options.tags };
    }

    if (options.since) {
      filters.createdAt = { $gte: options.since };
    }

    return Object.keys(filters).length > 0 ? filters : undefined;
  }

  /**
   * Apply additional filters to results
   */
  private applyFilters(results: RecallResult[]): RecallResult[] {
    return results; // Filters already applied in query
  }

  /**
   * Fuse vector and keyword search results
   */
  private fuseSearchResults(
    vectorRows: any[],
    keywordRows: any[],
    options: HybridScoringOptions,
  ): RecallResult[] {
    const itemMap = new Map<string, RecallResult>();

    // Process vector results
    vectorRows.forEach((row, index) => {
      const item = this.rowToMemoryItem(row);
      const semanticScore = 1 - (index / vectorRows.length); // Normalize rank
      const recencyScore = this.calculateRecencyScore(item.createdAt);
      
      itemMap.set(item.id, {
        item,
        score: options.semanticWeight! * semanticScore + 
               options.recencyWeight! * recencyScore,
      });
    });

    // Process keyword results
    keywordRows.forEach((row, index) => {
      const item = this.rowToMemoryItem(row);
      const keywordScore = 1 - (index / keywordRows.length); // Normalize rank
      const recencyScore = this.calculateRecencyScore(item.createdAt);
      
      const existing = itemMap.get(item.id);
      if (existing) {
        // Combine scores
        existing.score += options.keywordWeight! * keywordScore;
      } else {
        itemMap.set(item.id, {
          item,
          score: options.keywordWeight! * keywordScore + 
                 options.recencyWeight! * recencyScore,
        });
      }
    });

    // Sort by final score
    return Array.from(itemMap.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Convert database row to memory item
   */
  private rowToMemoryItem(row: any): MemoryItem {
    return {
      id: row.id,
      type: row.type,
      text: row.text,
      tags: row.tags,
      importance: row.importance,
      createdAt: row.createdAt,
      ttl: row.ttl,
      attributes: row.attributes,
      source: row.source,
    };
  }

  /**
   * Format memories for injection into agent context
   */
  private formatMemoriesForInjection(memories: RecallResult[]): string {
    const lines = memories.map((result) => {
      const { item } = result;
      const date = new Date(item.createdAt).toISOString().split('T')[0];
      return `- ${item.text}  [type: ${item.type}, seen: ${date}]`;
    });

    return `Relevant memories (most to least relevant):\n${lines.join('\n')}`;
  }

  /**
   * Log episodic memory from agent interaction
   */
  private async logEpisodicMemory(input: any, result: any): Promise<void> {
    const summary = `Tool interaction: ${this.summarizeInteraction(input, result)}`;
    
    await this.remember({
      text: summary,
      type: "episodic",
      source: "agent",
      importance: "medium",
      tags: ["interaction"],
    });
  }

  /**
   * Extract and store facts from agent interaction
   */
  private async extractAndStoreFacts(input: any, result: any): Promise<void> {
    const facts = await this.factExtractor.extractFacts(input, result);
    
    for (const fact of facts) {
      // Check for similar existing facts
      const similar = await this.recall({
        query: fact.text,
        types: ["semantic"],
        limit: 3,
      });

      const isDuplicate = similar.some(r => r.score > 0.9);
      
      if (!isDuplicate) {
        await this.remember({
          text: fact.text,
          type: "semantic",
          source: "chat",
          importance: fact.importance,
          tags: fact.tags,
        });
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Map importance to numeric score
   */
  private mapImportanceToScore(importance?: MemoryImportance): number {
    switch (importance) {
      case "high": return 3;
      case "medium": return 2;
      case "low": return 1;
      default: return 2; // Default to medium
    }
  }

  /**
   * Calculate recency score (0-1, higher = more recent)
   */
  private calculateRecencyScore(createdAt: string): number {
    const now = Date.now();
    const created = new Date(createdAt).getTime();
    const ageMs = now - created;
    const dayMs = 24 * 60 * 60 * 1000;
    
    // Score decays over 30 days
    return Math.max(0, 1 - (ageMs / (30 * dayMs)));
  }

  /**
   * Summarize agent interaction for episodic memory
   */
  private summarizeInteraction(input: any, result: any): string {
    // Simple summarization - could be enhanced with LLM
    const inputStr = typeof input === "string" ? input : JSON.stringify(input);
    const resultStr = typeof result === "string" ? result : JSON.stringify(result);
    
    return `Input: ${inputStr.slice(0, 100)}... Result: ${resultStr.slice(0, 100)}...`;
  }
}