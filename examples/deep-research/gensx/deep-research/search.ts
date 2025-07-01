import * as gensx from "@gensx/core";
import { firecrawl } from "../firecrawl";
import { SearchResult } from "../types";

interface SearchParams {
  query: string;
  limit: number;
}

export const Search = gensx.Component(
  "Search",
  async ({ query, limit }: SearchParams): Promise<SearchResult[]> => {
    const searchResults = await firecrawl.search(query, { limit });

    if (!searchResults.success) {
      console.error("Search failed for query:", query, searchResults.error);
      return [];
    }

    return searchResults.data.map((result) => ({
      title: result.title ?? "",
      url: result.url ?? "",
      description: result.description ?? "",
    }));
  },
);
