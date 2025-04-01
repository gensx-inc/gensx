/** @jsxRuntime automatic */
/** @jsxImportSource @gensx/core */
import { Component } from "@gensx/core";

import { BlobContext } from "./context.js";
import { FilesystemBlobStorage } from "./filesystem.js";
import { RemoteBlobStorage } from "./remote.js";
import { BlobProviderProps, CloudBlobProviderProps } from "./types.js";

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
  (props) => {
    // Create the appropriate storage implementation based on kind
    if (props.kind === "filesystem") {
      const { rootDir = process.cwd(), defaultPrefix } = props;
      const storage = new FilesystemBlobStorage(rootDir, defaultPrefix);
      return <BlobContext.Provider value={storage} />;
    } else {
      // Must be cloud based on our type definitions
      const { defaultPrefix, organizationId } = props;
      const storage = new RemoteBlobStorage(defaultPrefix, organizationId);
      return <BlobContext.Provider value={storage} />;
    }
  },
);
