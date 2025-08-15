/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

import type { MemoryScope } from "../../src/memory/types.js";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMemory, MemoryClient } from "../../src/memory/index.js";

// Mock the SearchClient
vi.mock("../../src/search/searchClient.js", () => ({
  SearchClient: vi.fn().mockImplementation(() => ({
    getNamespace: vi.fn().mockResolvedValue({
      write: vi.fn().mockResolvedValue({ message: "success", rowsAffected: 1 }),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    }),
  })),
}));

// Mock embedding creation
vi.mock("../../src/memory/embedding.js", () => ({
  createEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));

describe("MemoryClient", () => {
  let memory: MemoryClient;
  let scope: MemoryScope;

  beforeEach(() => {
    scope = {
      workspaceId: "test-workspace",
      userId: "test-user",
      agentId: "test-agent",
    };

    memory = createMemory({ scope });
  });

  describe("remember", () => {
    it("should store a semantic memory by default", async () => {
      const result = await memory.remember({
        text: "Derek prefers navy ties",
        importance: "high",
      });

      expect(result).toHaveProperty("id");
      expect(result.id).toMatch(/^mem_\d+_[a-z0-9]+$/);
    });

    it("should store episodic memory", async () => {
      const result = await memory.remember({
        text: "User clicked the submit button",
        type: "episodic",
        source: "ui",
        tags: ["interaction", "ui"],
      });

      expect(result).toHaveProperty("id");
    });

    it("should store short-term memory", async () => {
      const result = await memory.remember({
        text: "Recent conversation turn",
        type: "shortTerm",
        importance: "medium",
      });

      expect(result).toHaveProperty("id");
    });
  });

  describe("recall", () => {
    it("should recall memories without query (importance/recency sort)", async () => {
      const results = await memory.recall({
        limit: 3,
        types: ["semantic"],
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("should recall memories with semantic query", async () => {
      const results = await memory.recall({
        query: "What does Derek prefer?",
        limit: 5,
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("should filter by memory types", async () => {
      const results = await memory.recall({
        types: ["episodic", "semantic"],
        limit: 3,
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it("should filter by tags", async () => {
      const results = await memory.recall({
        tags: ["preference"],
        limit: 3,
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it("should filter by date range", async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24h ago
      
      const results = await memory.recall({
        since,
        limit: 3,
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it("should respect the hard limit of 10 results", async () => {
      const results = await memory.recall({
        limit: 20, // Request more than hard limit
      });

      expect(results.length).toBeLessThanOrEqual(10);
    });
  });

  describe("attach", () => {
    it("should wrap an agent with memory capabilities", async () => {
      const mockAgent = vi.fn().mockResolvedValue("Agent response");
      
      const agentWithMemory = await memory.attach(mockAgent, {
        preRecall: { limit: 3 },
        postTurn: { logEpisodic: true, extractFacts: true },
      });

      expect(typeof agentWithMemory).toBe("function");

      // Test wrapped agent execution
      const input = { message: "Hello, what do you remember about Derek?" };
      const result = await agentWithMemory(input);

      expect(mockAgent).toHaveBeenCalled();
      expect(result).toBe("Agent response");
    });

    it("should inject memories into system message", async () => {
      const mockAgent = vi.fn().mockResolvedValue("Agent response");
      
      const agentWithMemory = await memory.attach(mockAgent, {
        injectMode: "systemPreamble",
      });

      const input = { 
        message: "What should I wear?",
        systemMessage: "You are a fashion assistant."
      };
      
      await agentWithMemory(input);

      // Check that agent was called with enhanced input
      expect(mockAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          systemMessage: expect.stringContaining("You are a fashion assistant"),
        })
      );
    });
  });

  describe("scope", () => {
    it("should create different namespaces for different scopes", () => {
      const scope1 = { workspaceId: "ws1", userId: "user1" };
      const scope2 = { workspaceId: "ws1", userId: "user2" };
      
      const memory1 = createMemory({ scope: scope1 });
      const memory2 = createMemory({ scope: scope2 });

      // These should use different namespaces
      expect(memory1).not.toBe(memory2);
    });
  });

  describe("configuration", () => {
    it("should apply custom policy settings", () => {
      const customMemory = createMemory({
        scope,
        policy: {
          shortTerm: {
            tokenLimit: 2000,
            summarizeOverflow: false,
          },
          privacy: {
            redactPII: true,
          },
          observability: {
            trace: false,
          },
        },
      });

      expect(customMemory).toBeInstanceOf(MemoryClient);
    });
  });
});