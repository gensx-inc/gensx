/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-deprecated, no-console */

import { MemoryItem, MemoryPolicyV1 } from "./types.js";

/**
 * Short-term memory buffer that manages rolling chat history and summarization
 */
export class ShortTermBuffer {
  private items: MemoryItem[] = [];
  private summary: string | null = null;
  private tokenLimit: number;
  private summarizeOverflow: boolean;

  constructor(config: MemoryPolicyV1["shortTerm"]) {
    this.tokenLimit = config?.tokenLimit || 4000;
    this.summarizeOverflow = config?.summarizeOverflow ?? true;
  }

  /**
   * Add a new item to the short-term buffer
   */
  async add(item: MemoryItem, memoryClient: any): Promise<void> {
    this.items.push(item);

    // Check if we need to manage overflow
    const currentTokenCount = this.estimateTokenCount();
    if (currentTokenCount > this.tokenLimit) {
      await this.handleOverflow(memoryClient);
    }
  }

  /**
   * Get all items in the buffer
   */
  getItems(): MemoryItem[] {
    return [...this.items];
  }

  /**
   * Get the current summary
   */
  getSummary(): string | null {
    return this.summary;
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.items = [];
    this.summary = null;
  }

  /**
   * Handle buffer overflow by summarizing and storing old items
   */
  private async handleOverflow(memoryClient: any): Promise<void> {
    if (!this.summarizeOverflow) {
      // Just remove oldest items if summarization is disabled
      while (this.estimateTokenCount() > this.tokenLimit && this.items.length > 1) {
        this.items.shift();
      }
      return;
    }

    // Keep the most recent items under the token limit
    const itemsToSummarize: MemoryItem[] = [];
    let remainingTokens = this.tokenLimit;
    
    // Work backwards from most recent
    for (let i = this.items.length - 1; i >= 0; i--) {
      const itemTokens = this.estimateItemTokens(this.items[i]);
      if (remainingTokens - itemTokens > 0) {
        remainingTokens -= itemTokens;
      } else {
        // All items from index 0 to i should be summarized
        itemsToSummarize.push(...this.items.slice(0, i + 1));
        this.items = this.items.slice(i + 1);
        break;
      }
    }

    if (itemsToSummarize.length > 0) {
      const newSummary = await this.createSummary(itemsToSummarize);
      
      // Store or update the summary in persistent memory
      await memoryClient.remember({
        text: newSummary,
        type: "shortTerm",
        source: "buffer_summary",
        importance: "medium",
        tags: ["summary", "conversation"],
      });

      this.summary = newSummary;
    }
  }

  /**
   * Create a summary of the given items
   */
  private async createSummary(items: MemoryItem[]): Promise<string> {
    // Simple extractive summarization (in production, use LLM)
    const texts = items.map(item => item.text);
    const combinedText = texts.join(" ");
    
    // Extract key sentences (simple heuristic-based approach)
    const sentences = this.splitIntoSentences(combinedText);
    const importantSentences = this.selectImportantSentences(sentences, 3);
    
    const summary = importantSentences.join(" ");
    
    // Combine with existing summary if present
    if (this.summary) {
      return `${this.summary} ${summary}`;
    }
    
    return summary;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
  }

  /**
   * Select important sentences using simple heuristics
   */
  private selectImportantSentences(sentences: string[], maxCount: number): string[] {
    // Score sentences based on various factors
    const scoredSentences = sentences.map(sentence => ({
      sentence,
      score: this.scoreSentence(sentence),
    }));

    // Sort by score and take top N
    return scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCount)
      .map(item => item.sentence);
  }

  /**
   * Score a sentence for importance
   */
  private scoreSentence(sentence: string): number {
    let score = 0;
    const text = sentence.toLowerCase();

    // Length score (not too short, not too long)
    const idealLength = 50;
    const lengthScore = 1 - Math.abs(sentence.length - idealLength) / idealLength;
    score += lengthScore * 0.3;

    // Keyword importance
    const importantWords = [
      "important", "key", "main", "primary", "remember", "note",
      "decision", "action", "result", "outcome", "conclusion",
      "user", "prefer", "like", "want", "need", "requirement",
    ];
    
    const keywordCount = importantWords.filter(word => text.includes(word)).length;
    score += keywordCount * 0.4;

    // Position bonus (first and last sentences often more important)
    // This would need to be calculated relative to position in original text
    score += 0.1;

    // Entity mention bonus (proper nouns)
    const entityMatches = sentence.match(/[A-Z][a-z]+/g) || [];
    score += entityMatches.length * 0.1;

    return score;
  }

  /**
   * Estimate token count for all items in buffer
   */
  private estimateTokenCount(): number {
    let total = 0;
    for (const item of this.items) {
      total += this.estimateItemTokens(item);
    }
    return total;
  }

  /**
   * Estimate token count for a single item
   */
  private estimateItemTokens(item: MemoryItem): number {
    // Rough estimation: 1 token ≈ 4 characters
    const textTokens = Math.ceil(item.text.length / 4);
    const metadataTokens = 20; // Rough estimate for metadata overhead
    return textTokens + metadataTokens;
  }
}