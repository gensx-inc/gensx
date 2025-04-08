import { mkdir } from "fs/promises";
import { join } from "path";

import { Component } from "@gensx/core";

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
        : process.env.STORAGE_MODE === "s3"
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
      // Must be cloud based on our type definitions
      const organizationId =
        props.kind === "cloud" ? props.organizationId : undefined;
      const storage = new RemoteBlobStorage(
        props.defaultPrefix,
        organizationId,
      );
      return <BlobContext.Provider value={storage} />;
    }
  },
);
