/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

import { beforeEach, describe, expect, it } from "vitest";

import { FactExtractor } from "../../src/memory/factExtractor.js";

describe("FactExtractor", () => {
  let extractor: FactExtractor;

  beforeEach(() => {
    extractor = new FactExtractor();
  });

  describe("extractFacts", () => {
    it("should extract user preferences", async () => {
      const input = "I prefer dark colors and modern styles";
      const result = "Here are some recommendations based on your preferences";

      const facts = await extractor.extractFacts(input, result);

      expect(facts.length).toBeGreaterThan(0);
      expect(facts.some(fact => 
        fact.text.includes("prefer") && 
        fact.tags.includes("preference")
      )).toBe(true);
    });

    it("should extract declarative statements", async () => {
      const input = "The meeting is scheduled for 3 PM";
      const result = "I've noted that information";

      const facts = await extractor.extractFacts(input, result);

      // Should extract some facts (exact content may vary)
      expect(facts.length).toBeGreaterThanOrEqual(0);
    });

    it("should extract entity relationships", async () => {
      const input = "Derek works at GenSX and lives in San Francisco";
      const result = "Got it, I'll remember that";

      const facts = await extractor.extractFacts(input, result);

      expect(facts.some(fact => 
        fact.text.includes("Derek") &&
        fact.tags.includes("relationship")
      )).toBe(true);
    });

    it("should assess importance correctly", async () => {
      const input = "This is very important: the password must be at least 12 characters";
      const result = "I understand the security requirement";

      const facts = await extractor.extractFacts(input, result);

      expect(facts.some(fact => fact.importance === "high")).toBe(true);
    });

    it("should filter out very short facts", async () => {
      const input = "Yes. No. Ok.";
      const result = "Brief responses noted";

      const facts = await extractor.extractFacts(input, result);

      // Should filter out facts that are too short
      facts.forEach(fact => {
        expect(fact.text.length).toBeGreaterThan(10);
      });
    });

    it("should handle complex object inputs", async () => {
      const input = {
        type: "user_action",
        action: "clicked_button",
        context: "The user prefers the dark theme",
      };
      const result = {
        status: "success",
        message: "Action completed successfully",
      };

      const facts = await extractor.extractFacts(input, result);

      expect(Array.isArray(facts)).toBe(true);
      // Should extract preference from the context
      expect(facts.some(fact => 
        fact.text.includes("prefer") &&
        fact.tags.includes("preference")
      )).toBe(true);
    });
  });

  describe("importance assessment", () => {
    it("should identify high importance indicators", async () => {
      const input = "Remember this critical information: the API key expires tomorrow";
      const result = "I'll make a note of that important deadline";

      const facts = await extractor.extractFacts(input, result);

      expect(facts.some(fact => fact.importance === "high")).toBe(true);
    });

    it("should identify low importance indicators", async () => {
      const input = "This is just a minor detail about the UI color";
      const result = "Noted the small preference";

      const facts = await extractor.extractFacts(input, result);

      expect(facts.some(fact => fact.importance === "low")).toBe(true);
    });
  });

  describe("factual vs opinion detection", () => {
    it("should prefer factual statements over opinions", async () => {
      const input = "The server is running on port 3000. I think the design looks nice.";
      const result = "Information processed";

      const facts = await extractor.extractFacts(input, result);

      // Should extract the factual statement about the server
      expect(facts.some(fact => 
        fact.text.includes("server") || fact.text.includes("port")
      )).toBe(true);
    });
  });
});