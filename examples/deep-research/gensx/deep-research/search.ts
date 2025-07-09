import * as gensx from "@gensx/core";
import { tavily } from "@tavily/core";
import { SearchResult } from "../types";

interface SearchParams {
  query: string;
  limit: number;
}

export const Search = gensx.Component(
  "Search",
  async ({ query, limit }: SearchParams): Promise<SearchResult[]> => {
    try {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        console.error("TAVILY_API_KEY environment variable not set");
        return [];
      }

      const client = tavily({ apiKey });
      const searchResults = await client.search(query, {
        maxResults: limit,
        includeFavicon: true,
        format: "markdown",
      });

      if (!searchResults.results || searchResults.results.length === 0) {
        console.error("Search failed for query:", query, "No results found");
        return [];
      }

      return searchResults.results.map((result) => ({
        title: result.title ?? "",
        url: result.url ?? "",
        description: result.content ?? "",
        relevanceScore: result.score,
        // @ts-expect-error - favicon is not in the type
        favicon: result.favicon ?? "",
      }));
    } catch (error) {
      console.error("Search failed for query:", query, error);
      return [];
    }
  },
);
