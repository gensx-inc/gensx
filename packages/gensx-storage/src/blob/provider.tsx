import { mkdir } from "fs/promises";
import { join } from "path";

import { Component } from "@gensx/core";

import { getProjectAndEnvironment } from "../utils/config.js";
import { BlobContext } from "./context.js";
import { FileSystemBlobStorage } from "./filesystem.js";
import { RemoteBlobStorage } from "./remote.js";
import { BlobProviderProps } from "./types.js";

/**
 * BlobProvider component that provides blob storage to its children
 *
 * @example
 * ```jsx
 * // Use local filesystem storage
 * <BlobProvider kind="filesystem" rootDir="/tmp/blob-storage">
 *   <YourComponent />
 * </BlobProvider>
 *
 * // Use cloud storage
 * <BlobProvider kind="cloud">
 *   <YourComponent />
 * </BlobProvider>
 * ```
 */
export const BlobProvider = Component<BlobProviderProps, never>(
  "BlobProvider",
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
        : join(process.cwd(), ".gensx", "blobs");

    // Create the appropriate storage implementation based on kind
    if (kind === "filesystem") {
      // Ensure the storage directory exists
      await mkdir(rootDir, { recursive: true });
      const storage = new FileSystemBlobStorage(rootDir, props.defaultPrefix);
      return <BlobContext.Provider value={storage} />;
    } else {
      const { project, environment } = getProjectAndEnvironment({
        project: props.project,
        environment: props.environment,
      });

      const storage = new RemoteBlobStorage(
        project,
        environment,
        props.defaultPrefix,
      );
      return <BlobContext.Provider value={storage} />;
    }
  },
);
