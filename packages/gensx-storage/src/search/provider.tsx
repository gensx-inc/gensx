import { Component } from "@gensx/core";

import { SearchContext } from "./context.js";
import { Search } from "./search.js";
import { SearchProviderProps } from "./types.js";

export const SearchProvider = Component<SearchProviderProps, never>(
  "SearchProvider",
  (props) => {
    const search = new Search(props.defaultPrefix);
    return <SearchContext.Provider value={search} />;
  },
);
