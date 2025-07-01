import FirecrawlApp from "@mendable/firecrawl-js";

// Initialize the Firecrawl client with your API key
const apiKey = process.env.FIRECRAWL_API_KEY;
if (!apiKey) {
  throw new Error("FIRECRAWL_API_KEY environment variable is required");
}

export const firecrawl = new FirecrawlApp({ apiKey });
