import FirecrawlApp from "@mendable/firecrawl-js";
import { z } from "zod";
import { tool } from "ai";

// Initialize the Firecrawl client with your API key
const apiKey = process.env.FIRECRAWL_API_KEY;
if (!apiKey) {
  throw new Error("FIRECRAWL_API_KEY environment variable is required");
}
const app = new FirecrawlApp({ apiKey });

export const scrapePageTool = tool({
  description: "Scrape a web page and return its content as markdown.",
  parameters: z.object({
    url: z.string().describe("The URL of the web page to scrape"),
  }),
  execute: async ({ url }: { url: string }) => {
    try {
      const scrapeResult = await app.scrapeUrl(url, {
        formats: ["markdown"],
      });

      if (!scrapeResult.success) {
        return `Scraping failed: ${scrapeResult.error ?? "Unknown error"}`;
      }

      const markdown = scrapeResult.markdown;
      //const title = scrapeResult.metadata?.title;

      if (!markdown) {
        return `No content found for URL: ${url}`;
      }

      return markdown;
    } catch (error) {
      return `Error scraping page: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
