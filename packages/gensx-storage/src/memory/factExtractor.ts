/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-deprecated, no-console */

import { MemoryImportance } from "./types.js";

/**
 * Extracted fact structure
 */
export interface ExtractedFact {
  text: string;
  importance: MemoryImportance;
  tags: string[];
}

/**
 * Fact extraction from agent interactions
 * This is a simplified version - in production, this would use LLM-based extraction
 */
export class FactExtractor {
  /**
   * Extract facts from agent input/output interaction
   */
  async extractFacts(input: any, result: any): Promise<ExtractedFact[]> {
    const facts: ExtractedFact[] = [];
    
    // Convert inputs to text for analysis
    const inputText = this.normalizeToText(input);
    const resultText = this.normalizeToText(result);
    const combinedText = `${inputText} ${resultText}`.toLowerCase();

    // Simple rule-based fact extraction (in production, use LLM)
    facts.push(...this.extractPreferences(combinedText));
    facts.push(...this.extractDeclarativeStatements(combinedText));
    facts.push(...this.extractEntityRelationships(combinedText));

    return facts.filter(fact => fact.text.length > 10); // Filter too short facts
  }

  /**
   * Extract user preferences from text
   */
  private extractPreferences(text: string): ExtractedFact[] {
    const facts: ExtractedFact[] = [];
    const preferencePatterns = [
      /(?:i|user|they) (?:prefer|like|want|need|love|hate|dislike) ([^.!?]+)/gi,
      /(?:my|their) (?:favorite|preferred) ([^.!?]+)/gi,
      /(?:i|user|they) (?:always|usually|never|sometimes) ([^.!?]+)/gi,
    ];

    for (const pattern of preferencePatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const preference = match[1]?.trim();
        if (preference && preference.length > 5) {
          facts.push({
            text: `User prefers ${preference}`,
            importance: "medium",
            tags: ["preference", "user"],
          });
        }
      }
    }

    return facts;
  }

  /**
   * Extract declarative statements that might be facts
   */
  private extractDeclarativeStatements(text: string): ExtractedFact[] {
    const facts: ExtractedFact[] = [];
    const statementPatterns = [
      /(?:the|this|that) ([^.!?]+) (?:is|are|was|were) ([^.!?]+)/gi,
      /([^.!?]+) (?:is|are) (?:a|an|the) ([^.!?]+)/gi,
      /(?:remember that|note that|important:) ([^.!?]+)/gi,
    ];

    for (const pattern of statementPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const statement = match[1]?.trim() || match[0]?.trim();
        if (statement && statement.length > 10 && this.isFactualStatement(statement)) {
          facts.push({
            text: statement,
            importance: this.assessImportance(statement),
            tags: ["fact", "declarative"],
          });
        }
      }
    }

    return facts;
  }

  /**
   * Extract entity relationships
   */
  private extractEntityRelationships(text: string): ExtractedFact[] {
    const facts: ExtractedFact[] = [];
    const relationshipPatterns = [
      /([A-Z][a-z]+) (?:works at|is employed by|belongs to) ([^.!?]+)/gi,
      /([A-Z][a-z]+) (?:knows|is friends with|is related to) ([A-Z][a-z]+)/gi,
      /([A-Z][a-z]+) (?:lives in|is from|is located in) ([^.!?]+)/gi,
    ];

    for (const pattern of relationshipPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const entity1 = match[1]?.trim();
        const entity2 = match[2]?.trim();
        if (entity1 && entity2) {
          facts.push({
            text: `${entity1} ${(/works at|is employed by|belongs to|knows|is friends with|is related to|lives in|is from|is located in/.exec(match[0]))?.[0]} ${entity2}`,
            importance: "low",
            tags: ["relationship", "entity"],
          });
        }
      }
    }

    return facts;
  }

  /**
   * Convert various input types to text
   */
  private normalizeToText(input: any): string {
    if (typeof input === "string") {
      return input;
    }
    if (typeof input === "object" && input !== null) {
      // Extract text from common object structures
      if (input.content) return String(input.content);
      if (input.text) return String(input.text);
      if (input.message) return String(input.message);
      return JSON.stringify(input);
    }
    return String(input);
  }

  /**
   * Assess if a statement is likely factual
   */
  private isFactualStatement(statement: string): boolean {
    const factualIndicators = [
      "is", "are", "was", "were", "has", "have", "can", "will", "must",
      "always", "never", "usually", "often", "sometimes",
    ];
    
    const opinionIndicators = [
      "think", "believe", "feel", "seem", "appear", "maybe", "perhaps",
      "probably", "might", "could", "should",
    ];

    const factualScore = factualIndicators.filter(word => 
      statement.toLowerCase().includes(` ${word} `)
    ).length;
    
    const opinionScore = opinionIndicators.filter(word => 
      statement.toLowerCase().includes(` ${word} `)
    ).length;

    return factualScore > opinionScore;
  }

  /**
   * Assess importance of a statement
   */
  private assessImportance(statement: string): MemoryImportance {
    const highImportanceWords = [
      "important", "critical", "essential", "key", "main", "primary",
      "remember", "note", "warning", "error", "urgent",
    ];
    
    const lowImportanceWords = [
      "minor", "small", "little", "simple", "basic", "trivial",
    ];

    const text = statement.toLowerCase();
    
    if (highImportanceWords.some(word => text.includes(word))) {
      return "high";
    }
    
    if (lowImportanceWords.some(word => text.includes(word))) {
      return "low";
    }
    
    return "medium";
  }
}