import * as gensx from "@gensx/core";
import FirecrawlApp from "@mendable/firecrawl-js";

// Initialize the Firecrawl client with your API key
const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });

// Web search function using Firecrawl
export const WebSearch = gensx.Component(
  "WebSearch",
  async ({
    query,
    limit = 5,
  }: {
    query: string;
    limit?: number;
  }): Promise<string> => {
    try {
      const searchResult = await app.search(query, { limit });

      if (!searchResult.success) {
        return `Search failed: ${searchResult.error ?? "Unknown error"}`;
      }

      const results = searchResult.data.map(
        (result, index) =>
          `${index + 1}. **${result.title ?? "No title"}**\n   ${result.description ?? "No description"}\n   ${result.url ?? ""}`,
      );

      return `Found ${results.length} results for "${query}":\n\n${results.join("\n\n")}`;
    } catch (error) {
      return `Error searching: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
);
