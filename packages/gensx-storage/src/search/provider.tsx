import { Component } from "@gensx/core";

import { SearchContext } from "./context.js";
import { SearchStorage } from "./remote.js";
import { SearchProviderProps } from "./types.js";

export const SearchProvider = Component<SearchProviderProps, never>(
  "SearchProvider",
  (props) => {
    const search = new SearchStorage(props.defaultPrefix);
    return <SearchContext.Provider value={search} />;
  },
);
