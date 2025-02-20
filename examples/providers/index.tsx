import { gsx } from "gensx";

import { FirecrawlProvider, ScrapePage } from "./firecrawlProvider.js";

async function main() {
  const url = "https://gensx.com/docs/";

  const ScrapePageExample = gsx.Component<{ url: string }, string>(
    "ScrapePageExample",
    ({ url }) => {
      return (
        <FirecrawlProvider apiKey={process.env.FIRECRAWL_API_KEY}>
          <ScrapePage url={url} />
        </FirecrawlProvider>
      );
    },
  );

  const workflow = gsx.Workflow("ScrapePageExampleWorkflow", ScrapePageExample);

  console.log("\n🚀 Scraping page from url:", url);
  const markdown = await workflow.run({
    url,
  });
  console.log("\n✅ Scraping complete");
  console.log("\n🚀 Scraped markdown:", markdown);
}

main().catch(console.error);
