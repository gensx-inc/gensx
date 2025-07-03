import * as gensx from "@gensx/core";
import { SearchResult } from "../types";
import { Search } from "./search";
import { Rank } from "./rank";

interface ExecuteQueriesParams {
  prompt: string;
  queries: string[];
  updateStep?: (searchResults: SearchResult[]) => void | Promise<void>;
}

export const ExecuteQueries = gensx.Component(
  "ExecuteQueries",
  async ({
    prompt,
    queries,
    updateStep,
  }: ExecuteQueriesParams): Promise<SearchResult[]> => {
    // Step 1: Execute searches for all queries in parallel
    const searchPromises = queries.map(
      (query) => Search({ query, limit: 20 }), // Get more results initially for better ranking
    );
    const allSearchResults = await Promise.all(searchPromises);

    // Step 2: For each query, use Cohere to rank and get top 3 documents
    const rankedResultsPerQuery = await Promise.all(
      queries.map(async (query, index) => {
        const searchResults = allSearchResults[index];
        if (searchResults.length === 0) return [];

        // Use Cohere to rank documents for this specific query
        const rankedResults = await Rank({
          prompt: query, // Use the specific query for ranking
          documents: searchResults,
        });

        // Return top 3 for this query
        return rankedResults.slice(0, 3);
      }),
    );

    // Step 3: Combine all results and dedupe by URL
    const allRankedResults = rankedResultsPerQuery.flat();
    const dedupedResults = allRankedResults.filter(
      (result, index, self) =>
        index === self.findIndex((r) => r.url === result.url),
    );

    // Step 4: Further rank the deduped results using the main prompt
    const finalRankedResults = await Rank({
      prompt,
      documents: dedupedResults,
    });

    // Step 5: Return top 10 results (content will be scraped separately)
    const topResults = finalRankedResults.slice(0, 10);

    // Update the step if updateStep function is provided
    if (updateStep) {
      await updateStep(topResults);
    }

    return topResults;
  },
);
