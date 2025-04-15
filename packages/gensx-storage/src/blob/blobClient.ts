import { join } from "path";

import { FileSystemBlobStorage } from "./filesystem.js";
import { RemoteBlobStorage } from "./remote.js";
import {
  Blob,
  BlobProviderProps,
  BlobStorage,
  DeleteBlobResult,
} from "./types.js";

/**
 * Client for interacting with blob storage functionality outside of JSX context
 */
export class BlobClient {
  private storage: BlobStorage;

  /**
   * Create a new BlobClient
   * @param props Optional configuration properties for the blob storage
   */
  constructor(props: BlobProviderProps = {}) {
    const kind =
      props.kind ??
      (process.env.GENSX_RUNTIME === "cloud" ? "cloud" : "filesystem");

    if (kind === "filesystem") {
      const rootDir =
        props.kind === "filesystem" && props.rootDir
          ? props.rootDir
          : join(process.cwd(), ".gensx", "blobs");

      this.storage = new FileSystemBlobStorage(rootDir, props.defaultPrefix);
    } else {
      this.storage = new RemoteBlobStorage(props.defaultPrefix);
    }
  }

  /**
   * Get a blob
   * @param key The blob key
   * @returns A Blob instance for the given key
   */
  getBlob<T = unknown>(key: string): Blob<T> {
    return this.storage.getBlob<T>(key);
  }

  /**
   * List all blobs with an optional prefix
   * @param prefix Optional prefix to filter blobs
   * @returns A Promise resolving to an array of blob keys
   */
  async listBlobs(prefix?: string): Promise<string[]> {
    return this.storage.listBlobs(prefix);
  }

  /**
   * Check if a blob exists
   * @param key The blob key
   * @returns A Promise resolving to a boolean indicating if the blob exists
   */
  async blobExists(key: string): Promise<boolean> {
    return this.storage.blobExists(key);
  }

  /**
   * Delete a blob
   * @param key The blob key
   * @returns A Promise resolving to the result of the delete operation
   */
  async deleteBlob(key: string): Promise<DeleteBlobResult> {
    return this.storage.deleteBlob(key);
  }
}
