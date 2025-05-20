import { DatabaseClient } from "./databaseClient.js";
import { Database, DatabaseProviderProps } from "./types.js";

/**
 * Hook to access a database
 * @param name The name of the database to access
 * @param props Optional configuration properties for the database storage
 * @returns A promise that resolves to a database object for the given name
 */
export async function useDatabase(
  name: string,
  props: DatabaseProviderProps = {},
): Promise<Database> {
  const client = new DatabaseClient(props);
  const db = await client.getDatabase(name);
  return db;
}
