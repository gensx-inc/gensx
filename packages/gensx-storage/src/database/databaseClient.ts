import { join } from "path";

import { FileSystemDatabaseStorage } from "./filesystem.js";
import { RemoteDatabaseStorage } from "./remote.js";
import {
  Database,
  DatabaseProviderProps,
  DatabaseStorage,
  DeleteDatabaseResult,
  EnsureDatabaseResult,
} from "./types.js";

/**
 * Client for interacting with database functionality outside of JSX context
 */
export class DatabaseClient {
  private storage: DatabaseStorage;

  /**
   * Create a new DatabaseClient
   * @param props Optional configuration properties for the database storage
   */
  constructor(props: DatabaseProviderProps = {}) {
    const kind =
      props.kind ??
      (process.env.GENSX_RUNTIME === "cloud" ? "cloud" : "filesystem");

    if (kind === "filesystem") {
      const rootDir =
        props.kind === "filesystem" && props.rootDir
          ? props.rootDir
          : join(process.cwd(), ".gensx", "databases");

      this.storage = new FileSystemDatabaseStorage(rootDir);
    } else {
      this.storage = new RemoteDatabaseStorage();
    }
  }

  /**
   * Get a database (ensures it exists first)
   * @param name The database name
   * @returns A Promise resolving to a Database
   */
  async getDatabase(name: string): Promise<Database> {
    if (!this.storage.hasEnsuredDatabase(name)) {
      await this.storage.ensureDatabase(name);
    }
    return this.storage.getDatabase(name);
  }

  /**
   * Ensure a database exists (idempotent operation)
   * @param name The database name
   * @returns A Promise resolving to the ensure result
   */
  async ensureDatabase(name: string): Promise<EnsureDatabaseResult> {
    return this.storage.ensureDatabase(name);
  }

  /**
   * List all databases
   * @param options Optional pagination options
   * @returns A Promise resolving to an array of database names and optional next cursor
   */
  async listDatabases(options?: { limit?: number; cursor?: string }): Promise<{
    databases: { name: string; createdAt: Date }[];
    nextCursor?: string;
  }> {
    return this.storage.listDatabases(options);
  }

  /**
   * Delete a database
   * @param name The database name
   * @returns A Promise resolving to the deletion result
   */
  async deleteDatabase(name: string): Promise<DeleteDatabaseResult> {
    return this.storage.deleteDatabase(name);
  }

  /**
   * Check if a database exists
   * @param name The database name
   * @returns A Promise resolving to a boolean indicating if the database exists
   */
  async databaseExists(name: string): Promise<boolean> {
    const result = await this.storage.listDatabases();
    return result.databases.some((db) => db.name === name);
  }
}
