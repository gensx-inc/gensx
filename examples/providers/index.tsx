import { gsx } from "gensx";

import { FirecrawlProvider, ScrapePage } from "./firecrawlProvider.js";

async function scrapePageWithFirecrawl(url: string) {
  console.log("\n🚀 Scraping page from url:", url);
  const markdown = await gsx.execute<string>(
    <FirecrawlProvider apiKey={process.env.FIRECRAWL_API_KEY}>
      <ScrapePage url={url} />
    </FirecrawlProvider>,
  );
  console.log("\n✅ Scraping complete");
  console.log("\n🚀 Scraped markdown:", markdown);
}

async function useMultipleProviders() {
  const url = "https://gensx.com/overview/";
  const markdown = await gsx.execute<string>(
    <FirecrawlProvider apiKey={process.env.FIRECRAWL_API_KEY}>
      <ScrapePage url={url} />
    </FirecrawlProvider>,
  );
}

async function main() {
  const url = "https://gensx.com/overview/";
  await scrapePageWithFirecrawl(url);

  // Use multiple providers
  await useMultipleProviders();
}

main().catch(console.error);
