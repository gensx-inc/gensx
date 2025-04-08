import { createContext, useContext } from "@gensx/core";

import { Namespace, Search } from "./types.js";

/**
 * Create the search context
 */
export const SearchContext = createContext<Search | null>(null);

/**
 * Hook to access the search instance
 * @returns The search instance
 * @throws Error if used outside of a SearchProvider
 */
export function useSearch(): Search {
  const search = useContext(SearchContext);

  if (!search) {
    throw new Error(
      "useSearch must be used within a SearchProvider. Wrap your component tree with a SearchProvider.",
    );
  }

  return search;
}

/**
 * Hook to access a search namespace
 * @param namespaceId The ID of the namespace to access
 * @returns A namespace object for the given ID
 * @throws Error if used outside of a SearchProvider
 */
export function useNamespace(namespaceId: string): Namespace {
  const search = useSearch();
  return search.getNamespace(namespaceId);
}
