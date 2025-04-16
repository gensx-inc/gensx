/* eslint-disable @typescript-eslint/only-throw-error */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import { createClient, InArgs } from "@libsql/client";
import { Client, ResultSet } from "@libsql/client";

import {
  Database,
  DatabaseBatchResult,
  DatabaseConstraintError,
  DatabaseError,
  DatabaseInfo,
  DatabaseInternalError,
  DatabaseNotFoundError,
  DatabasePermissionDeniedError,
  DatabaseResult,
  DatabaseStatement,
  DatabaseStorage,
  DatabaseSyntaxError,
  DatabaseTableInfo,
  DeleteDatabaseResult,
  EnsureDatabaseResult,
} from "./types.js";

/**
 * Helper to convert between filesystem/libSQL errors and DatabaseErrors
 */
function handleError(err: unknown, operation: string): never {
  if (err instanceof DatabaseError) {
    throw err;
  }

  if (err instanceof Error) {
    const nodeErr = err as NodeJS.ErrnoException;

    if (nodeErr.code === "ENOENT") {
      throw new DatabaseNotFoundError(
        `Database not found: ${String(err.message)}`,
        err,
      );
    } else if (nodeErr.code === "EACCES") {
      throw new DatabasePermissionDeniedError(
        `Permission denied for operation ${operation}: ${String(err.message)}`,
        err,
      );
    }

    // Handle libSQL specific errors
    const message = err.message.toLowerCase();

    if (message.includes("syntax error")) {
      throw new DatabaseSyntaxError(
        `Syntax error in ${operation}: ${err.message}`,
        err,
      );
    }

    if (
      message.includes("constraint failed") ||
      message.includes("unique constraint") ||
      message.includes("foreign key constraint")
    ) {
      throw new DatabaseConstraintError(
        `Constraint violation in ${operation}: ${err.message}`,
        err,
      );
    }
  }

  // Default error case
  throw new DatabaseInternalError(
    `Error during ${operation}: ${String(err)}`,
    err as Error,
  );
}

/**
 * Convert libSQL ResultSet to our DatabaseResult format
 */
function mapResult(result: ResultSet): DatabaseResult {
  return {
    columns: result.columns,
    rows: result.rows.map((row) => Object.values(row)),
    rowsAffected: result.rowsAffected,
    lastInsertId: result.lastInsertRowid
      ? Number(result.lastInsertRowid)
      : undefined,
  };
}

/**
 * Implementation of Database interface for filesystem storage
 */
export class FileSystemDatabase implements Database {
  private client: Client;
  private dbPath: string;
  private dbName: string;

  constructor(rootPath: string, dbName: string) {
    this.dbName = dbName;
    this.dbPath = path.join(rootPath, `${dbName}.db`);
    this.client = createClient({ url: `file:${this.dbPath}` });
  }

  async execute(sql: string, params?: InArgs): Promise<DatabaseResult> {
    try {
      const result = await this.client.execute({
        sql,
        args: params,
      });

      return mapResult(result);
    } catch (err) {
      throw handleError(err, "execute");
    }
  }

  async batch(statements: DatabaseStatement[]): Promise<DatabaseBatchResult> {
    try {
      const results: DatabaseResult[] = [];

      // Create a transaction with explicit write mode
      const transactionPromise = this.client.transaction("write");
      const transaction = await transactionPromise;

      try {
        // Execute each statement within the transaction
        for (const statement of statements) {
          const result = await transaction.execute({
            sql: statement.sql,
            args: statement.params,
          });

          results.push(mapResult(result));
        }

        // Commit the transaction if all statements succeeded
        await transaction.commit();
        return { results };
      } catch (err) {
        // Transaction will be rolled back in the finally block
        throw err;
      } finally {
        // Always close the transaction
        transaction.close();
      }
    } catch (err) {
      throw handleError(err, "batch");
    }
  }

  async executeMultiple(sql: string): Promise<DatabaseBatchResult> {
    try {
      // Split the SQL by semicolons, ignoring those in quotes or comments
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => ({ sql: `${s};` }));

      const results: DatabaseResult[] = [];

      // Execute each statement without transaction
      for (const statement of statements) {
        try {
          const result = await this.client.execute({ sql: statement.sql });
          results.push(mapResult(result));
        } catch (_) {
          // If one statement fails, we still try to execute the others
          results.push({
            columns: [],
            rows: [],
            rowsAffected: 0,
            lastInsertId: undefined,
          });
        }
      }

      return { results };
    } catch (err) {
      throw handleError(err, "executeMultiple");
    }
  }

  async migrate(sql: string): Promise<DatabaseBatchResult> {
    try {
      // Disable foreign keys, run migrations, then re-enable foreign keys
      const results: DatabaseResult[] = [];

      // Disable foreign keys
      const disableResult = await this.client.execute({
        sql: "PRAGMA foreign_keys = OFF;",
      });
      results.push(mapResult(disableResult));

      // Split and execute migration statements
      const migrationStatements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => ({ sql: `${s};` }));

      // Execute migrations
      for (const statement of migrationStatements) {
        try {
          const result = await this.client.execute({ sql: statement.sql });
          results.push(mapResult(result));
        } catch (err) {
          // Re-enable foreign keys before rethrowing
          await this.client.execute({ sql: "PRAGMA foreign_keys = ON;" });
          throw err;
        }
      }

      // Re-enable foreign keys
      const enableResult = await this.client.execute({
        sql: "PRAGMA foreign_keys = ON;",
      });
      results.push(mapResult(enableResult));

      return { results };
    } catch (err) {
      throw handleError(err, "migrate");
    }
  }

  async getInfo(): Promise<DatabaseInfo> {
    try {
      // Get file stats
      let stats;
      try {
        stats = await fs.stat(this.dbPath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          // Database file doesn't exist yet, return minimal info
          return {
            name: this.dbName,
            size: 0,
            lastModified: new Date(),
            tables: [],
          };
        }
        throw err;
      }

      // Get table information
      const tablesResult = await this.client.execute({
        sql: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
      });

      const tables: DatabaseTableInfo[] = [];

      for (const row of tablesResult.rows) {
        const tableName = row.name as string;

        // Get column information for this table
        const columnsResult = await this.client.execute({
          sql: `PRAGMA table_info(${tableName});`,
        });

        const columns = columnsResult.rows.map((col) => ({
          name: col.name as string,
          type: col.type as string,
          notNull: Boolean(col.notnull),
          defaultValue: col.dflt_value,
          primaryKey: Boolean(col.pk),
        }));

        tables.push({
          name: tableName,
          columns,
        });
      }

      return {
        name: this.dbName,
        size: stats.size,
        lastModified: stats.mtime,
        tables,
      };
    } catch (err) {
      throw handleError(err, "getInfo");
    }
  }

  close() {
    try {
      this.client.close();
    } catch (err) {
      throw handleError(err, "close");
    }
  }
}

/**
 * Implementation of DatabaseStorage interface for filesystem storage
 */
export class FileSystemDatabaseStorage implements DatabaseStorage {
  private databases = new Map<string, FileSystemDatabase>();

  constructor(private rootPath: string) {
    // Ensure rootPath exists on instantiation
    void this.ensureRootDir();
  }

  /**
   * Ensure the root directory exists
   */
  private async ensureRootDir(): Promise<void> {
    try {
      await fs.mkdir(this.rootPath, { recursive: true });
    } catch (err) {
      throw handleError(err, "ensureRootDir");
    }
  }

  getDatabase(name: string): Database {
    let db = this.databases.get(name);
    if (!db) {
      db = new FileSystemDatabase(this.rootPath, name);
      this.databases.set(name, db);
    }
    return db;
  }

  async listDatabases(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.rootPath);

      // Filter for .db files and remove extension
      return files
        .filter((file) => file.endsWith(".db"))
        .map((file) => file.slice(0, -3)); // Remove .db extension
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw handleError(err, "listDatabases");
    }
  }

  async ensureDatabase(name: string): Promise<EnsureDatabaseResult> {
    try {
      const dbPath = path.join(this.rootPath, `${name}.db`);

      // First check if database file exists
      let exists = false;
      try {
        await fs.access(dbPath);
        exists = true;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          throw err;
        }
      }

      if (exists) {
        // If it exists, make sure it's in our cache
        if (!this.databases.has(name)) {
          this.getDatabase(name);
        }
        return { exists: true, created: false };
      }

      // Ensure the directory exists
      await this.ensureRootDir();

      // Create an empty database by getting a database instance
      // which will initialize the file
      const db = this.getDatabase(name);

      // Execute a simple query to ensure the file is created
      await db.execute("SELECT 1");

      return { exists: false, created: true };
    } catch (err) {
      throw handleError(err, "ensureDatabase");
    }
  }

  async deleteDatabase(name: string): Promise<DeleteDatabaseResult> {
    try {
      const dbPath = path.join(this.rootPath, `${name}.db`);

      // Close any open connection to this database
      if (this.databases.has(name)) {
        const db = this.databases.get(name)!;
        db.close();
        this.databases.delete(name);
      }

      // Check if file exists
      try {
        await fs.access(dbPath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          return { deleted: false };
        }
        throw err;
      }

      // Delete the file
      await fs.unlink(dbPath);
      return { deleted: true };
    } catch (err) {
      throw handleError(err, "deleteDatabase");
    }
  }

  hasEnsuredDatabase(name: string): boolean {
    return this.databases.has(name);
  }
}
