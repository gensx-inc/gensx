import { gsx } from "gensx";
import FirecrawlApp from "@mendable/firecrawl-js";

interface FirecrawlProps {
  url: string;
}

const firecrawlApp = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

export const Firecrawl = gsx.Component<FirecrawlProps, any>(async ({ url }) => {
  const result = await firecrawlApp.scrapeUrl(url, {
    formats: ["markdown"],
    timeout: 30000,
  });
  if (!result.success) {
    return null;
  }
  return result.markdown;
});
