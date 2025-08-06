import { tavily } from "@tavily/core";
import { z } from "zod";
import { tool } from "ai";

// Initialize the Firecrawl client with your API key
const apiKey = process.env.TAVILY_API_KEY;
if (!apiKey) {
  throw new Error("TAVILY_API_KEY environment variable is required");
}
const client = tavily({ apiKey });

export const scrapePageTool = tool({
  description: "Scrape a web page and return its content as markdown.",
  inputSchema: z.object({
    url: z.string().describe("The URL of the web page to scrape"),
  }),
  execute: async ({ url }: { url: string }) => {
    try {
      const response = await client.extract([url]);

      if (!response.results || response.results.length === 0) {
        return `No content found for URL: ${url}`;
      }

      const result = response.results[0];
      if (!result.rawContent) {
        return `No content extracted for URL: ${url}`;
      }

      return result.rawContent;
    } catch (error) {
      return `Error scraping page: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
