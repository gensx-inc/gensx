import { mkdir } from "fs/promises";
import { join } from "path";

import { Component } from "@gensx/core";

import { getProjectAndEnvironment } from "../utils/config.js";
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
 * <DatabaseProvider kind="filesystem" rootDir="/tmp/database-storage">
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
  async (props) => {
    const kind =
      "kind" in props
        ? props.kind
        : process.env.GENSX_RUNTIME === "cloud"
          ? "cloud"
          : "filesystem";

    const rootDir =
      "rootDir" in props
        ? props.rootDir!
        : join(process.cwd(), ".gensx", "databases");

    // Create the appropriate storage implementation based on kind
    if (kind === "filesystem") {
      // Ensure the storage directory exists
      await mkdir(rootDir, { recursive: true });
      const storage = new FileSystemDatabaseStorage(rootDir);
      return <DatabaseContext.Provider value={storage} />;
    } else {
      const { project, environment } = getProjectAndEnvironment({
        project: props.project,
        environment: props.environment,
      });

      const storage = new RemoteDatabaseStorage(project, environment);
      return <DatabaseContext.Provider value={storage} />;
    }
  },
);
