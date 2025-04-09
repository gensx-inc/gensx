import { Component } from "@gensx/core";

import { DatabaseContext } from "./context.js";
import { FileSystemDatabaseStorage } from "./filesystem.js";
import { RemoteDatabaseStorage } from "./remote.js";
import { DatabaseProviderProps } from "./types.js";

/**
 * DatabaseProvider component that provides database storage to its children
 *
 * @example
 * ```jsx
 * // Use local filesystem storage
 * <DatabaseProvider kind="filesystem" path="/tmp/database-storage">
 *   <YourComponent />
 * </DatabaseProvider>
 *
 * // Use cloud storage
 * <DatabaseProvider kind="cloud">
 *   <YourComponent />
 * </DatabaseProvider>
 * ```
 */
export const DatabaseProvider = Component<DatabaseProviderProps, never>(
  "DatabaseProvider",
  (props) => {
    // Create the appropriate storage implementation based on kind
    if (props.kind === "filesystem") {
      const { path = process.cwd() } = props;
      const storage = new FileSystemDatabaseStorage(path);
      return <DatabaseContext.Provider value={storage} />;
    } else {
      // Must be cloud based on our type definitions
      const { organizationId } = props;
      const storage = new RemoteDatabaseStorage(organizationId);
      return <DatabaseContext.Provider value={storage} />;
    }
  },
);
