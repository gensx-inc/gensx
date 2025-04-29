import { Component } from "@gensx/core";

import { getProjectAndEnvironment } from "../utils/config.js";
import { SearchContext } from "./context.js";
import { SearchStorage } from "./remote.js";
import { SearchProviderProps } from "./types.js";

export const SearchProvider = Component<SearchProviderProps, never>(
  "SearchProvider",
  (props) => {
    const { project, environment } = getProjectAndEnvironment({
      project: props.project,
      environment: props.environment,
    });
    const search = new SearchStorage(project, environment);
    return <SearchContext.Provider value={search} />;
  },
);
