import * as gensx from "@gensx/core";
import { SearchResult } from "../types";
import { Rank } from "./rank";
import { Scrape } from "./scrape";

interface GatherSourcesParams {
  prompt: string;
  searchResults: SearchResult[];
}

export const GatherSources = gensx.Component(
  "GatherSources",
  async ({
    prompt,
    searchResults,
  }: GatherSourcesParams): Promise<SearchResult[]> => {
    // First, rank all search results
    const rankedResults = await Rank({
      prompt,
      documents: searchResults,
    });

    // Take only the top 10 results for scraping
    const topResults = rankedResults.slice(0, 10);

    // Process the top results in parallel
    const processedResults = await Promise.all(
      topResults.map(async (document): Promise<SearchResult | null> => {
        try {
          // Scrape the content for each top-ranked result
          const content = await Scrape({ url: document.url });

          // Return the document with content and relevant flag
          return {
            ...document,
            relevant: true,
            content,
          } as SearchResult;
        } catch (error) {
          console.error(`Error processing document ${document.url}:`, error);
          return null;
        }
      }),
    );

    // Filter out null results and return only results with non-empty content
    return processedResults.filter(
      (result): result is SearchResult =>
        result !== null && result.content !== "",
    );
  },
);
