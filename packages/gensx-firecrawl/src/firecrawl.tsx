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
  {
    secretProps: ["apiKey"],
  },
);
