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
  updateStep?: (queryResults: QueryResult[]) => void | Promise<void>;
}

export const ExecuteQuery = gensx.Component(
  "ExecuteQueries",
  async ({
    queries,
    queryOptions = {
      docsToFetch: 20,
      topK: 3,
    },
    updateStep,
  }: ExecuteQueriesParams): Promise<QueryResult[]> => {
    // Step 1: Execute searches for all queries in parallel
    const searchPromises = queries.map(
      (query) => Search({ query, limit: queryOptions.docsToFetch ?? 20 }), // Get more results initially for better ranking
    );
    const allSearchResults = await Promise.all(searchPromises);

    // Step 2: For each query, use Cohere to rank and get top 3 documents
    const rankedResultsPerQuery = await Promise.all(
      queries.map(async (query, index) => {
        const searchResults = allSearchResults[index];
        if (searchResults.length === 0) return { query, results: [] };

        // Use Cohere to rank documents for this specific query
        const rankedResults = await Rank({
          prompt: query, // Use the specific query for ranking
          documents: searchResults,
        });

        // Return top results for this query
        return {
          query,
          results: rankedResults.slice(0, queryOptions.topK),
        };
      }),
    );

    // Step 3: Return the ranked results per query
    if (updateStep) {
      await updateStep(rankedResultsPerQuery);
    }

    return rankedResultsPerQuery;
  },
);
