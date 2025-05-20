import { SearchClient } from "./searchClient.js";
import { Namespace, SearchStorageOptions } from "./types.js";

/**
 * Hook to access a search namespace
 * @param name The name of the namespace to access
 * @param options Optional configuration properties for the search storage
 * @returns A promise that resolves to a namespace object for the given name
 */
export async function useSearch(
  name: string,
  options: SearchStorageOptions = {},
): Promise<Namespace> {
  const client = new SearchClient(options);
  const namespace = await client.getNamespace(name);
  return namespace;
}
