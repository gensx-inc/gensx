import * as gensx from "@gensx/core";
import FirecrawlApp from "@mendable/firecrawl-js";

interface ScrapePageProps {
  url: string;
}

export const ScrapePage = gensx.Component(
  "ScrapePage",
  async ({ url }: ScrapePageProps): Promise<string> => {
    const client = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY,
    });

    const result = await client.scrapeUrl(url, {
      formats: ["markdown"],
      timeout: 40000,
    });

    if (!result.success || !result.markdown) {
      throw new Error(`Failed to scrape url: ${url}`);
    }

    return result.markdown;
  },
);
