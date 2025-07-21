import { tavily } from "@tavily/core";
import { z } from "zod";
import { tool } from "ai";

// Initialize the Tavily client with your API key
const apiKey = process.env.TAVILY_API_KEY;
if (!apiKey) {
  throw new Error("TAVILY_API_KEY environment variable is required");
}
const tvly = tavily({ apiKey });

export const webSearchTool = tool({
  description: "Search the web for current information on any topic.",
  parameters: z.object({
    query: z.string().describe("The search query to find information about"),
    country: z
      .string()
      .describe(
        'Optional country to geo-target results. Examples: "germany", "united states".',
      )
      .optional(),
  }),
  execute: async ({ query, country }: { query: string; country?: string }) => {
    const limit = 10;
    try {
      const searchResult = await tvly.search(query, {
        limit,
        country,
        includeImages: true,
        includeImageDescriptions: true,
        includeAnswer: false,
      });

      const results = {
        images: searchResult.images,
        results: searchResult.results,
      };

      return JSON.stringify(results);
    } catch (error) {
      return `Error searching: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
