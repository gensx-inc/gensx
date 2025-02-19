import { gsx } from "gensx";

import { FirecrawlProvider, ScrapePage } from "./firecrawlProvider.js";

async function main() {
  const url = "https://gensx.com/overview/";

  const ScrapeWorkflow = gsx.Component<{ url: string }, string>(
    "ScrapeWorkflow",
    ({ url }) => {
      return (
        <FirecrawlProvider apiKey={process.env.FIRECRAWL_API_KEY}>
          <ScrapePage url={url} />
        </FirecrawlProvider>
      );
    },
  );

  const workflow = gsx.workflow("ScrapeWorkflow", ScrapeWorkflow);

  console.log("\n🚀 Scraping page from url:", url);
  const markdown = await workflow.run({
    url,
  });
  console.log("\n✅ Scraping complete");
  console.log("\n🚀 Scraped markdown:", markdown);
}

main().catch(console.error);
