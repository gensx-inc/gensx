import * as gensx from "@gensx/core";

import { FirecrawlContext } from "./firecrawl.js";

interface CrawlUrlProps {
  url: string;
}

// Create a component that uses the provider
export const CrawlUrl = gensx.Component<CrawlUrlProps, string>(
  "CrawlUrl",
  async ({ url }) => {
    const context = gensx.useContext(FirecrawlContext);

    if (!context.client) {
      throw new Error(
        "Firecrawl client not found. Please wrap your component with a FirecrawlProvider.",
      );
    }
    const result = await context.client.scrapeUrl(url, {
      formats: ["markdown"],
      timeout: 30000,
    });

    if (!result.success || !result.markdown) {
      throw new Error(`Failed to scrape url: ${url}`);
    }

    return result.markdown;
  },
);
