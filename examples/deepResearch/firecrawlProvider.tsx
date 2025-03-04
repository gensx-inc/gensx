import * as gensx from "@gensx/core";
import FirecrawlApp, { FirecrawlAppConfig } from "@mendable/firecrawl-js";

// Create a context
export const FirecrawlContext = gensx.createContext<{
  client?: FirecrawlApp;
}>({});

// Create the provider
export const FirecrawlProvider = gensx.Component<FirecrawlAppConfig, never>(
  "FirecrawlProvider",
  (args: FirecrawlAppConfig) => {
    const client = new FirecrawlApp({
      apiKey: args.apiKey,
    });
    return <FirecrawlContext.Provider value={{ client }} />;
  },
);

interface ScrapePageProps {
  url: string;
}

// Create a component that uses the provider
export const ScrapePage = gensx.Component<ScrapePageProps, string>(
  "ScrapePage",
  async ({ url }) => {
    const context = gensx.useContext(FirecrawlContext);

    if (!context.client) {
      throw new Error(
        "Firecrawl client not found. Please wrap your component with FirecrawlProvider.",
      );
    }
    const result = await context.client.scrapeUrl(url, {
      formats: ["markdown"],
      timeout: 40000,
    });

    if (!result.success || !result.markdown) {
      throw new Error(`Failed to scrape url: ${url}`);
    }

    return result.markdown;
  },
);
