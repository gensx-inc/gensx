import * as gensx from "@gensx/core";
import { QueryResult } from "../types";
import { Search } from "./search";

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

    // Step 2: For each query, filter out duplicates and take top results
    const filteredResultsPerQuery = queries.map((query, index) => {
      const searchResults = allSearchResults[index];
      if (searchResults.length === 0) return { query, results: [] };

      // Filter out results that match previous URLs
      const filteredResults = searchResults.filter(
        (result) => !previousUrls.has(result.url),
      );

      console.log("filteredResults" + index, filteredResults);
      if (filteredResults.length === 0) return { query, results: [] };

      // Return top results for this query (no ranking, just take first N)
      return {
        query,
        results: filteredResults.slice(0, queryOptions.topK),
      };
    });

    // Step 3: Remove any duplicate URLs across all query results
    const seenUrls = new Set<string>();
    const deduplicatedResults = filteredResultsPerQuery.map((queryResult) => ({
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
