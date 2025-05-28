import { DatabaseClient } from "./databaseClient.js";
import { Database, DatabaseStorageOptions } from "./types.js";

/**
 * Hook to access a database
 * @param name The name of the database to access
 * @param options Optional configuration properties for the database
 * @returns A promise that resolves to a database object for the given name
 */
export async function useDatabase(
  name: string,
  options: DatabaseStorageOptions = {},
): Promise<Database> {
  const client = new DatabaseClient(options);
  const db = await client.getDatabase(name);
  return db;
}
