import * as gensx from "@gensx/core";
import { QueryResult } from "../types";
import { Search } from "./search";
import { Rank } from "./rank";

interface ExecuteQueriesParams {
  queries: string[];
  queryOptions?: {
    docsToFetch?: number;
    topK?: number;
  };
  previousResults?: QueryResult[];
  updateStep?: (queryResults: QueryResult[]) => void | Promise<void>;
}

// Helper function to extract all URLs from previous results
const extractPreviousUrls = (previousResults: QueryResult[]): Set<string> => {
  const urls = new Set<string>();
  previousResults.forEach((queryResult) => {
    queryResult.results.forEach((result) => {
      urls.add(result.url);
    });
  });
  return urls;
};

export const ExecuteQuery = gensx.Component(
  "ExecuteQueries",
  async ({
    queries,
    queryOptions = {
      docsToFetch: 20,
      topK: 3,
    },
    previousResults = [],
    updateStep,
  }: ExecuteQueriesParams): Promise<QueryResult[]> => {
    // Extract URLs from previous results to filter out duplicates
    const previousUrls = extractPreviousUrls(previousResults);

    // Step 1: Execute searches for all queries in parallel
    const searchPromises = queries.map(
      (query) => Search({ query, limit: queryOptions.docsToFetch ?? 20 }), // Get more results initially for better ranking
    );
    const allSearchResults = await Promise.all(searchPromises);

    // Step 2: For each query, filter out duplicates and use Cohere to rank and get top 3 documents
    const rankedResultsPerQuery = await Promise.all(
      queries.map(async (query, index) => {
        const searchResults = allSearchResults[index];
        if (searchResults.length === 0) return { query, results: [] };

        // Filter out results that match previous URLs
        const filteredResults = searchResults.filter(
          (result) => !previousUrls.has(result.url),
        );

        if (filteredResults.length === 0) return { query, results: [] };

        // Use Cohere to rank documents for this specific query
        const rankedResults = await Rank({
          prompt: query, // Use the specific query for ranking
          documents: filteredResults,
        });

        // Return top results for this query
        return {
          query,
          results: rankedResults.slice(0, queryOptions.topK),
        };
      }),
    );

    // Step 3: Remove any duplicate URLs across all query results
    const seenUrls = new Set<string>();
    const deduplicatedResults = rankedResultsPerQuery.map((queryResult) => ({
      query: queryResult.query,
      results: queryResult.results.filter((result) => {
        if (seenUrls.has(result.url)) {
          return false; // Skip this result as we've seen this URL before
        }
        seenUrls.add(result.url);
        return true;
      }),
    }));

    // Step 4: Return the deduplicated results per query
    if (updateStep) {
      await updateStep(deduplicatedResults);
    }

    return deduplicatedResults;
  },
);
