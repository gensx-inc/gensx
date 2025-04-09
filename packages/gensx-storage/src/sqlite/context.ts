import { createContext, useContext } from "@gensx/core";

import { SQLiteDatabase, SQLiteStorage } from "./types.js";

/**
 * Create the SQLite storage context
 */
export const SQLiteContext = createContext<SQLiteStorage | null>(null);

/**
 * Hook to access the SQLite storage instance
 * @returns The SQLite storage instance
 * @throws Error if used outside of a SQLiteProvider
 */
export function useSQLiteStorage(): SQLiteStorage {
  const storage = useContext(SQLiteContext);

  if (!storage) {
    throw new Error(
      "useSQLiteStorage must be used within a SQLiteProvider. Wrap your component tree with a SQLiteProvider.",
    );
  }

  return storage;
}

/**
 * Hook to access a database
 * @param name The name of the database to access
 * @returns A promise that resolves to a database object for the given name
 * @throws Error if used outside of a SQLiteProvider
 */
export async function useSQLite(name: string): Promise<SQLiteDatabase> {
  const storage = useSQLiteStorage();

  // Ensure the database exists before returning it
  await storage.ensureDatabase(name);

  return storage.getDatabase(name);
}
