import { tavily } from "@tavily/core";
import { z } from "zod";
import { tool } from "ai";

// Initialize the Firecrawl client with your API key
const apiKey = process.env.TAVILY_API_KEY;
if (!apiKey) {
  throw new Error("TAVILY_API_KEY environment variable is required");
}
const client = tavily({ apiKey });

export const webSearchTool = tool({
  description: "Search the web for current information on any topic.",
  parameters: z.object({
    query: z.string().describe("The search query to find information about"),
  }),
  execute: async ({ query }: { query: string }) => {
    const limit = 10;
    try {
      const searchResults = await client.search(query, {
        maxResults: limit,
        format: "markdown",
      });

      if (!searchResults.results || searchResults.results.length === 0) {
        console.info("No results found for query:", query);
        return JSON.stringify([]);
      }

      const results = searchResults.results.map((result) => ({
        title: result.title ?? "",
        url: result.url ?? "",
        description: result.content ?? "",
      }));

      return JSON.stringify(results);
    } catch (error) {
      const errorMessage = `Error searching: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMessage);
      return JSON.stringify({ error: errorMessage });
    }
  },
});
