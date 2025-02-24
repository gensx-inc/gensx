import { GSXTool } from "@gensx/openai";
import FirecrawlApp, { FirecrawlAppConfig } from "@mendable/firecrawl-js";
import { gsx } from "gensx";
import { z } from "zod";

// Create a context
export const FirecrawlContext = gsx.createContext<{
  client?: FirecrawlApp;
}>({});

// Create the provider
export const FirecrawlProvider = gsx.Component<FirecrawlAppConfig, never>(
  "FirecrawlProvider",
  (args: FirecrawlAppConfig) => {
    const client = new FirecrawlApp({
      apiKey: args.apiKey,
    });
    return <FirecrawlContext.Provider value={{ client }} />;
  },
);

const scrapePageSchema = z.object({
  url: z.string().url(),
});

// Create a component that uses the provider
export const scrapeWebpageTool = new GSXTool<typeof scrapePageSchema>({
  name: "scrapeWebpage",
  description: "Scrape a webpage",
  schema: scrapePageSchema,
  run: async ({ url }) => {
    const context = gsx.useContext(FirecrawlContext);

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
});
