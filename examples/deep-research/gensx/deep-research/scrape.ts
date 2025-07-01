import * as gensx from "@gensx/core";
import { firecrawl } from "../firecrawl";

interface ScrapeParams {
  url: string;
}

export const Scrape = gensx.Component(
  "Scrape",
  async ({ url }: ScrapeParams): Promise<string> => {
    try {
      const scrapeResult = await firecrawl.scrapeUrl(url, {
        formats: ["markdown"],
      });

      if (!scrapeResult.success) {
        return `Scraping failed: ${scrapeResult.error ?? "Unknown error"}`;
      }

      const markdown = scrapeResult.markdown;

      if (!markdown) {
        return `No content found for URL: ${url}`;
      }

      return markdown;
    } catch (error) {
      console.error(`Error scraping URL: ${url}`, error);
      return "";
    }
  },
);
