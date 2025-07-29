import { join } from "path";

import { getProjectAndEnvironment } from "../utils/config.js";
import {
  Database,
  DatabaseStorage,
  DatabaseStorageOptions,
  DeleteDatabaseResult,
  EnsureDatabaseResult,
} from "./types.js";

/**
 * Client for interacting with database functionality outside of JSX context
 */
export class DatabaseClient {
  private storage: DatabaseStorage | null = null;
  private storagePromise: Promise<DatabaseStorage> | null = null;
  private options: DatabaseStorageOptions;

  /**
   * Create a new DatabaseClient
   * @param options Optional configuration properties for the database storage
   */
  constructor(options: DatabaseStorageOptions = {}) {
    this.options = options;
  }

  /**
   * Lazy initialization of storage
   */
  private async getStorage(): Promise<DatabaseStorage> {
    if (this.storage) {
      return this.storage;
    }

    if (this.storagePromise) {
      return this.storagePromise;
    }

    this.storagePromise = this.initializeStorage();

    try {
      this.storage = await this.storagePromise;
      return this.storage;
    } catch (error) {
      // Clear the failed promise to allow retry on next call
      this.storagePromise = null;
      throw error;
    }
  }

  private async initializeStorage(): Promise<DatabaseStorage> {
    const kind =
      this.options.kind ??
      (process.env.GENSX_RUNTIME === "cloud" ? "cloud" : "filesystem");

    if (kind === "filesystem") {
      const { FileSystemDatabaseStorage } = await import("./filesystem.js");

      const rootDir =
        this.options.kind === "filesystem" && this.options.rootDir
          ? this.options.rootDir
          : join(process.cwd(), ".gensx", "databases");

      return new FileSystemDatabaseStorage(rootDir);
    } else {
      const { RemoteDatabaseStorage } = await import("./remote.js");

      const { project, environment } = getProjectAndEnvironment({
        project: this.options.project,
        environment: this.options.environment,
      });
      return new RemoteDatabaseStorage(project, environment);
    }
  }

  /**
   * Get a database (ensures it exists first)
   * @param name The database name
   * @returns A Promise resolving to a Database
   */
  async getDatabase(name: string): Promise<Database> {
    const storage = await this.getStorage();
    if (!storage.hasEnsuredDatabase(name)) {
      await storage.ensureDatabase(name);
    }
    return storage.getDatabase(name);
  }

  /**
   * Ensure a database exists (idempotent operation)
   * @param name The database name
   * @returns A Promise resolving to the ensure result
   */
  async ensureDatabase(name: string): Promise<EnsureDatabaseResult> {
    const storage = await this.getStorage();
    return storage.ensureDatabase(name);
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
    const storage = await this.getStorage();
    return storage.listDatabases(options);
  }

  /**
   * Delete a database
   * @param name The database name
   * @returns A Promise resolving to the deletion result
   */
  async deleteDatabase(name: string): Promise<DeleteDatabaseResult> {
    const storage = await this.getStorage();
    return storage.deleteDatabase(name);
  }

  /**
   * Check if a database exists
   * @param name The database name
   * @returns A Promise resolving to a boolean indicating if the database exists
   */
  async databaseExists(name: string): Promise<boolean> {
    const storage = await this.getStorage();
    const result = await storage.listDatabases();
    return result.databases.some((db) => db.name === name);
  }
}
