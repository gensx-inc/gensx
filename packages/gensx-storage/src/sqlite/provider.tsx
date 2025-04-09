import { Component } from "@gensx/core";

import { SQLiteContext } from "./context.js";
import { FileSystemSQLiteStorage } from "./filesystem.js";
import { RemoteSQLiteStorage } from "./remote.js";
import { SQLiteProviderProps } from "./types.js";

/**
 * SQLiteProvider component that provides database storage to its children
 *
 * @example
 * ```jsx
 * // Use local filesystem storage
 * <SQLiteProvider kind="filesystem" path="/tmp/sqlite-storage">
 *   <YourComponent />
 * </SQLiteProvider>
 *
 * // Use cloud storage
 * <SQLiteProvider kind="cloud">
 *   <YourComponent />
 * </SQLiteProvider>
 * ```
 */
export const SQLiteProvider = Component<SQLiteProviderProps, never>(
  "SQLiteProvider",
  (props) => {
    // Create the appropriate storage implementation based on kind
    if (props.kind === "filesystem") {
      const { path = process.cwd() } = props;
      const storage = new FileSystemSQLiteStorage(path);
      return <SQLiteContext.Provider value={storage} />;
    } else {
      // Must be cloud based on our type definitions
      const { organizationId } = props;
      const storage = new RemoteSQLiteStorage(organizationId);
      return <SQLiteContext.Provider value={storage} />;
    }
  },
);
