import { Component } from "@gensx/core";

import { SearchContext } from "./context.js";
import { SearchStorage } from "./remote.js";

export const SearchProvider = Component<{}, never>("SearchProvider", () => {
  const search = new SearchStorage();
  return <SearchContext.Provider value={search} />;
});
