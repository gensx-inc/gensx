import { BlobClient } from "./blobClient.js";
import { BlobStorageOptions } from "./types.js";

/**
 * Hook to access a blob
 * @param key The key of the blob to access
 * @param options Optional configuration properties for the blob storage
 * @returns A blob object for the given key
 */
export function useBlob<T = unknown>(
  key: string,
  options: BlobStorageOptions = {},
) {
  const client = new BlobClient(options);
  return client.getBlob<T>(key);
}
