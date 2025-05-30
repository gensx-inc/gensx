import { join } from "path";

import { getProjectAndEnvironment } from "../utils/config.js";
import { FileSystemBlobStorage } from "./filesystem.js";
import { RemoteBlobStorage } from "./remote.js";
import {
  Blob,
  BlobStorage,
  BlobStorageOptions,
  DeleteBlobResult,
  ListBlobsOptions,
  ListBlobsResponse,
} from "./types.js";

/**
 * Client for interacting with blob storage functionality outside of JSX context
 */
export class BlobClient {
  private storage: BlobStorage;

  /**
   * Create a new BlobClient
   * @param options Optional configuration properties for the blob storage
   */
  constructor(options: BlobStorageOptions = {}) {
    const kind =
      options.kind ??
      (process.env.GENSX_RUNTIME === "cloud" ? "cloud" : "filesystem");

    if (kind === "filesystem") {
      const rootDir =
        options.kind === "filesystem" && options.rootDir
          ? options.rootDir
          : join(process.cwd(), ".gensx", "blobs");

      this.storage = new FileSystemBlobStorage(rootDir, options.defaultPrefix);
    } else {
      const { project, environment } = getProjectAndEnvironment({
        project: options.project,
        environment: options.environment,
      });
      this.storage = new RemoteBlobStorage(
        project,
        environment,
        options.defaultPrefix,
      );
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
   * List all blobs with optional filtering and pagination
   * @param options Optional listing options including prefix, limit, and cursor for pagination
   * @returns A Promise resolving to the list response containing keys and pagination info
   */
  async listBlobs(options?: ListBlobsOptions): Promise<ListBlobsResponse> {
    return this.storage.listBlobs(options);
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
