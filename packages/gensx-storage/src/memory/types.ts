/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Memory scope for namespacing memories
 */
export interface MemoryScope {
  workspaceId: string;
  userId?: string;
  agentId?: string;
  threadId?: string;
}

/**
 * Memory item types
 */
export type MemoryType = "shortTerm" | "episodic" | "semantic";

/**
 * Memory importance levels
 */
export type MemoryImportance = "low" | "medium" | "high";

/**
 * Core memory item structure
 */
export interface MemoryItem {
  id: string;
  type: MemoryType;
  text: string;
  tags?: string[];
  importance?: MemoryImportance;
  createdAt: string; // ISO8601
  ttl?: string | null; // e.g. "90d"
  attributes?: Record<string, any>;
  source?: string; // "chat" | "slack" | "tool:*" | ...
}

/**
 * Input for remembering a new memory
 */
export interface RememberInput {
  text: string;
  type?: MemoryType; // default "semantic"
  tags?: string[];
  importance?: MemoryImportance;
  ttl?: string;
  attributes?: Record<string, any>;
  source?: string;
}

/**
 * Options for recalling memories
 */
export interface RecallOptions {
  query?: string; // if omitted → recency/importance sort
  types?: MemoryType[]; // e.g. ["semantic","episodic"]
  tags?: string[]; // simple AND filter
  since?: string; // ISO8601 (createdAt >= since)
  limit?: number; // default 5
}

/**
 * Result from recalling memories
 */
export interface RecallResult {
  item: MemoryItem;
  score: number;
}

/**
 * Configuration for agent attachment
 */
export interface AttachConfig {
  preRecall?: {
    limit?: number;
    types?: MemoryType[];
  };
  injectMode?: "systemPreamble" | "metadata"; // default "systemPreamble"
  postTurn?: {
    logEpisodic?: boolean; // default true
    extractFacts?: boolean; // default true (promote compact facts)
  };
  shortTerm?: {
    tokenLimit?: number;
    summarizeOverflow?: boolean;
  }; // defaults on
}

/**
 * Memory policy configuration
 */
export interface MemoryPolicyV1 {
  retention?: {
    defaultTTL?: string;
  }; // none by default
  shortTerm?: {
    tokenLimit?: number;
    summarizeOverflow?: boolean;
  }; // on by default
  privacy?: {
    redactPII?: boolean;
  }; // off by default
  observability?: {
    trace?: boolean;
  }; // on by default
}

/**
 * Configuration for creating a memory instance
 */
export interface MemoryConfig {
  scope: MemoryScope;
  policy?: MemoryPolicyV1;
}

/**
 * Internal memory document structure for storage
 */
export interface MemoryDocument extends MemoryItem {
  namespace: string;
  vector?: number[];
  // Computed fields for hybrid search
  textLength: number;
  importanceScore: number; // numeric mapping of importance
  recencyScore: number; // computed from createdAt
}

/**
 * Options for hybrid retrieval scoring
 */
export interface HybridScoringOptions {
  semanticWeight?: number; // default 0.6
  keywordWeight?: number; // default 0.25
  recencyWeight?: number; // default 0.15
}