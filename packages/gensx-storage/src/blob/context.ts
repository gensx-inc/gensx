import { createContext, useContext } from "@gensx/core";

import { BlobStorage } from "./types.js";

/**
 * Create the blob storage context
 */
export const BlobContext = createContext<BlobStorage | null>(null);

/**
 * Hook to access the blob storage instance
 * @returns The blob storage instance
 * @throws Error if used outside of a BlobProvider
 */
export function useBlobStorage(): BlobStorage {
  const storage = useContext(BlobContext);

  if (!storage) {
    throw new Error(
      "useBlobStorage must be used within a BlobProvider. Wrap your component tree with a BlobProvider.",
    );
  }

  return storage;
}

/**
 * Hook to access a blob
 * @param key The key of the blob to access
 * @returns A blob object for the given key
 * @throws Error if used outside of a BlobProvider
 */
export function useBlob<T = unknown>(key: string) {
  const storage = useBlobStorage();
  return storage.getBlob<T>(key);
}
