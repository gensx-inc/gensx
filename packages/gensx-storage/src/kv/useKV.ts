import { KVClient } from "./kvClient.js";
import { KV, KVStorageOptions } from "./types.js";

export function useKV<T = unknown>(
  key: string,
  options: KVStorageOptions = {},
): Promise<KV<T>> {
  const client = new KVClient(options);
  return Promise.resolve(client.getKV<T>(key));
}
