import { gsx } from "gensx";

import { Tweet, TweetsByUsername, XProvider } from "./xProvider.js";

async function main() {
  const username = "gensx_inc";

  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    throw new Error("X_BEARER_TOKEN environment variable is not set");
  }

  console.log("\n🚀 Scraping tweets for username:", username);
  const tweets = await gsx.execute<Tweet[]>(
    <XProvider bearerToken={bearerToken}>
      <TweetsByUsername username="gensx_inc" />
    </XProvider>,
  );
  console.log("\n✅ Scraping complete");
  console.log("\n🚀 Scraped tweets:", JSON.stringify(tweets, null, 2));
}

main().catch(console.error);
