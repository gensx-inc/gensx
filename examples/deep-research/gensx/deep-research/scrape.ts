import * as gensx from "@gensx/core";
import { tavily } from "@tavily/core";

interface ScrapeParams {
  url: string;
}

export const Scrape = gensx.Component(
  "Scrape",
  async ({ url }: ScrapeParams): Promise<string> => {
    try {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        return "Scraping failed: TAVILY_API_KEY environment variable not set";
      }

      const client = tavily({ apiKey });
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
      console.error(`Error scraping URL: ${url}`, error);
      return `Scraping failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
);
