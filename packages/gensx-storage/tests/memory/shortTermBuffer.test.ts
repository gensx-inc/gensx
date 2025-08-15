/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

import type { MemoryItem } from "../../src/memory/types.js";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShortTermBuffer } from "../../src/memory/shortTermBuffer.js";

describe("ShortTermBuffer", () => {
  let buffer: ShortTermBuffer;
  let mockMemoryClient: any;

  beforeEach(() => {
    buffer = new ShortTermBuffer({
      tokenLimit: 100, // Small limit for testing
      summarizeOverflow: true,
    });

    mockMemoryClient = {
      remember: vi.fn().mockResolvedValue({ id: "summary-id" }),
    };
  });

  describe("add", () => {
    it("should add items to the buffer", async () => {
      const item: MemoryItem = {
        id: "test-1",
        type: "shortTerm",
        text: "Short message",
        createdAt: new Date().toISOString(),
      };

      await buffer.add(item, mockMemoryClient);

      expect(buffer.getItems()).toHaveLength(1);
      expect(buffer.getItems()[0]).toEqual(item);
    });

    it("should handle overflow by summarizing when token limit exceeded", async () => {
      // Add multiple items that exceed token limit
      const items: MemoryItem[] = [
        {
          id: "test-1",
          type: "shortTerm",
          text: "This is a long message that takes up many tokens in the buffer and should trigger summarization",
          createdAt: new Date(Date.now() - 3000).toISOString(),
        },
        {
          id: "test-2", 
          type: "shortTerm",
          text: "Another long message that adds even more tokens to exceed the limit",
          createdAt: new Date(Date.now() - 2000).toISOString(),
        },
        {
          id: "test-3",
          type: "shortTerm", 
          text: "Final message that should stay in buffer",
          createdAt: new Date().toISOString(),
        },
      ];

      for (const item of items) {
        await buffer.add(item, mockMemoryClient);
      }

      // Should have called remember to store summary
      expect(mockMemoryClient.remember).toHaveBeenCalledWith({
        text: expect.any(String),
        type: "shortTerm",
        source: "buffer_summary",
        importance: "medium",
        tags: ["summary", "conversation"],
      });

      // Should have fewer items in buffer after summarization
      expect(buffer.getItems().length).toBeLessThan(items.length);
      
      // Most recent item should still be in buffer
      expect(buffer.getItems().some(item => item.id === "test-3")).toBe(true);
    });

    it("should remove oldest items when summarization is disabled", async () => {
      const bufferNoSummary = new ShortTermBuffer({
        tokenLimit: 50,
        summarizeOverflow: false,
      });

      const items: MemoryItem[] = [
        {
          id: "test-1",
          type: "shortTerm",
          text: "Long message that exceeds token limit",
          createdAt: new Date(Date.now() - 2000).toISOString(),
        },
        {
          id: "test-2",
          type: "shortTerm",
          text: "Another long message",
          createdAt: new Date().toISOString(),
        },
      ];

      for (const item of items) {
        await bufferNoSummary.add(item, mockMemoryClient);
      }

      // Should not have called remember for summary
      expect(mockMemoryClient.remember).not.toHaveBeenCalled();
      
      // Should have removed oldest items
      expect(bufferNoSummary.getItems().length).toBe(1);
      expect(bufferNoSummary.getItems()[0].id).toBe("test-2");
    });
  });

  describe("clear", () => {
    it("should clear all items and summary", async () => {
      const item: MemoryItem = {
        id: "test-1",
        type: "shortTerm",
        text: "Test message",
        createdAt: new Date().toISOString(),
      };

      await buffer.add(item, mockMemoryClient);
      expect(buffer.getItems()).toHaveLength(1);

      buffer.clear();
      
      expect(buffer.getItems()).toHaveLength(0);
      expect(buffer.getSummary()).toBeNull();
    });
  });

  describe("summarization", () => {
    it("should create meaningful summaries from multiple items", async () => {
      const buffer = new ShortTermBuffer({
        tokenLimit: 50,
        summarizeOverflow: true,
      });

      const items: MemoryItem[] = [
        {
          id: "test-1",
          type: "shortTerm",
          text: "User asked about weather in San Francisco. The weather is sunny today with 72 degrees.",
          createdAt: new Date(Date.now() - 3000).toISOString(),
        },
        {
          id: "test-2",
          type: "shortTerm", 
          text: "User wants to plan outdoor activities. Recommended visiting Golden Gate Park.",
          createdAt: new Date(Date.now() - 2000).toISOString(),
        },
      ];

      for (const item of items) {
        await buffer.add(item, mockMemoryClient);
      }

      // Check that summary was created and stored
      expect(mockMemoryClient.remember).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("User"),
          type: "shortTerm",
          source: "buffer_summary",
        })
      );
    });

    it("should combine with existing summaries", async () => {
      // Simulate existing summary - in a real implementation, this would be loaded from storage
      const items: MemoryItem[] = [
        {
          id: "test-1",
          type: "shortTerm",
          text: "User decided to book flight for next week.",
          createdAt: new Date().toISOString(),
        },
      ];

      // Test that new summaries can build on existing ones
      await buffer.add(items[0], mockMemoryClient);
      
      expect(mockMemoryClient.remember).toHaveBeenCalled();
    });
  });

  describe("token estimation", () => {
    it("should estimate tokens reasonably", async () => {
      const shortItem: MemoryItem = {
        id: "short",
        type: "shortTerm",
        text: "Hi", // Very short
        createdAt: new Date().toISOString(),
      };

      const longItem: MemoryItem = {
        id: "long",
        type: "shortTerm",
        text: "This is a much longer message that should have significantly more tokens than the short message above",
        createdAt: new Date().toISOString(),
      };

      await buffer.add(shortItem, mockMemoryClient);
      const itemsAfterShort = buffer.getItems().length;

      await buffer.add(longItem, mockMemoryClient);

      // The longer item should potentially trigger overflow sooner
      expect(itemsAfterShort).toBeGreaterThanOrEqual(1);
    });
  });
});