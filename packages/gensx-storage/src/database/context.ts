import { createContext, useContext } from "@gensx/core";

import { Database, DatabaseStorage } from "./types.js";

/**
 * Create the database storage context
 */
export const DatabaseContext = createContext<DatabaseStorage | null>(null);

/**
 * Hook to access the database storage instance
 * @returns The database storage instance
 * @throws Error if used outside of a DatabaseProvider
 */
export function useDatabaseStorage(): DatabaseStorage {
  const storage = useContext(DatabaseContext);

  if (!storage) {
    throw new Error(
      "useDatabaseStorage must be used within a DatabaseProvider. Wrap your component tree with a DatabaseProvider.",
    );
  }

  return storage;
}

/**
 * Hook to access a database
 * @param name The name of the database to access
 * @returns A promise that resolves to a database object for the given name
 * @throws Error if used outside of a DatabaseProvider
 */
export async function useDatabase(name: string): Promise<Database> {
  const storage = useDatabaseStorage();

  // Ensure the database exists before returning it
  await storage.ensureDatabase(name);

  return storage.getDatabase(name);
}
