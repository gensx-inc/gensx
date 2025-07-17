import FirecrawlApp from "@mendable/firecrawl-js";
import { z } from "zod";
import { tool } from "ai";

// Initialize the Firecrawl client with your API key
const apiKey = process.env.FIRECRAWL_API_KEY;
if (!apiKey) {
  throw new Error("FIRECRAWL_API_KEY environment variable is required");
}
const app = new FirecrawlApp({ apiKey });

export const webSearchTool = tool({
  description: "Search the web for current information on any topic.",
  parameters: z.object({
    query: z.string().describe("The search query to find information about"),
    location: z.string().describe('Optional location to geo-target results. Examples: "Germany", "San Francisco,California,United States".').optional(),
  }),
  execute: async ({ query, location }: { query: string; location?: string }) => {
    const limit = 10;
    try {
      const searchResult = await app.search(query, { limit, location });

      if (!searchResult.success) {
        return `Search failed: ${searchResult.error ?? "Unknown error"}`;
      }

      const results = searchResult.data.map(
        (result) =>
          `<result>\n<title>${result.title ?? ""}</title>\n<url>${result.url ?? ""}</url>\n<description>${result.description ?? ""}</description>\n</result>`,
      );

      return `Found ${results.length} results for "${query}":\n\n${results.join("\n\n")}`;
    } catch (error) {
      return `Error searching: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
