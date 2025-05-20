import { BlobClient } from "./blobClient.js";
import { BlobProviderProps } from "./types.js";

/**
 * Hook to access a blob
 * @param key The key of the blob to access
 * @param props Optional configuration properties for the blob storage
 * @returns A blob object for the given key
 */
export function useBlob<T = unknown>(
  key: string,
  props: BlobProviderProps = {},
) {
  const client = new BlobClient(props);
  return client.getBlob<T>(key);
}
