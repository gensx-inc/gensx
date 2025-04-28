import { InArgs } from "@libsql/client";

/**
 * Error types for database operations
 */
export type DatabaseErrorCode =
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "CONFLICT"
  | "SYNTAX_ERROR"
  | "CONSTRAINT_VIOLATION"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "TRANSACTION_ERROR";

/**
 * Abstract base error class for database operations
 */
export abstract class DatabaseError extends Error {
  constructor(
    public readonly code: DatabaseErrorCode,
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

/**
 * Error class for when a database is not found
 */
export class DatabaseNotFoundError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super("NOT_FOUND", message, cause);
    this.name = "DatabaseNotFoundError";
  }
}

/**
 * Error class for permission denied errors
 */
export class DatabasePermissionDeniedError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super("PERMISSION_DENIED", message, cause);
    this.name = "DatabasePermissionDeniedError";
  }
}

/**
 * Error class for SQL syntax errors
 */
export class DatabaseSyntaxError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super("SYNTAX_ERROR", message, cause);
    this.name = "DatabaseSyntaxError";
  }
}

/**
 * Error class for constraint violations
 */
export class DatabaseConstraintError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super("CONSTRAINT_VIOLATION", message, cause);
    this.name = "DatabaseConstraintError";
  }
}

/**
 * Error class for internal errors
 */
export class DatabaseInternalError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super("INTERNAL_ERROR", message, cause);
    this.name = "DatabaseInternalError";
  }
}

/**
 * Error class for network errors
 */
export class DatabaseNetworkError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super("NETWORK_ERROR", message, cause);
    this.name = "DatabaseNetworkError";
  }
}

/**
 * Error class for transaction errors
 */
export class DatabaseTransactionError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super("TRANSACTION_ERROR", message, cause);
    this.name = "DatabaseTransactionError";
  }
}

/**
 * SQL execution result
 */
export interface DatabaseResult {
  columns: string[];
  rows: unknown[][];
  rowsAffected: number;
  lastInsertId?: number;
}

/**
 * SQL statement with optional parameters
 */
export interface DatabaseStatement {
  sql: string;
  params?: InArgs;
}

/**
 * Batch execution results
 */
export interface DatabaseBatchResult {
  results: DatabaseResult[];
}

/**
 * Database table information
 */
export interface DatabaseTableInfo {
  name: string;
  columns: DatabaseColumnInfo[];
}

/**
 * Column information
 */
export interface DatabaseColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue?: unknown;
  primaryKey: boolean;
}

/**
 * Database information
 */
export interface DatabaseInfo {
  name: string;
  size: number;
  lastModified: Date;
  tables: DatabaseTableInfo[];
}

/**
 * Result of ensuring a database exists
 */
export interface EnsureDatabaseResult {
  exists: boolean;
  created: boolean;
}

/**
 * Result of deleting a database
 */
export interface DeleteDatabaseResult {
  deleted: boolean;
}

/**
 * Interface for a database
 */
export interface Database {
  /**
   * Execute a single SQL statement
   */
  execute(sql: string, params?: InArgs): Promise<DatabaseResult>;

  /**
   * Execute multiple SQL statements in a transaction
   */
  batch(statements: DatabaseStatement[]): Promise<DatabaseBatchResult>;

  /**
   * Execute multiple SQL statements as a script (without transaction semantics)
   */
  executeMultiple(sql: string): Promise<DatabaseBatchResult>;

  /**
   * Run SQL migration statements with foreign keys disabled
   */
  migrate(sql: string): Promise<DatabaseBatchResult>;

  /**
   * Get information about the database
   */
  getInfo(): Promise<DatabaseInfo>;

  /**
   * Close the database connection
   */
  close(): void;
}

/**
 * Interface for database storage
 */
export interface DatabaseStorage {
  /**
   * Get a database by name
   */
  getDatabase(name: string): Database;

  /**
   * List all databases
   * @param options Options for listing databases
   * @returns Promise with array of database names and optional next cursor for pagination
   */
  listDatabases(options?: { limit?: number; cursor?: string }): Promise<{
    databases: { name: string; createdAt: Date }[];
    nextCursor?: string;
  }>;

  /**
   * Ensure a database exists
   * @param name Database name
   * @returns Promise resolving to result with exists and created flags
   */
  ensureDatabase(name: string): Promise<EnsureDatabaseResult>;

  /**
   * Delete a database
   * @param name Database name
   * @returns Promise resolving to result with deleted flag
   */
  deleteDatabase(name: string): Promise<DeleteDatabaseResult>;

  /**
   * Check if a database has been ensured
   */
  hasEnsuredDatabase(name: string): boolean;
}

/**
 * Provider configuration kinds
 */
export type DatabaseStorageKind = "filesystem" | "cloud";

/**
 * Base provider props
 */
export interface BaseDatabaseProviderProps {
  /**
   * Storage kind
   */
  kind?: DatabaseStorageKind;
}

/**
 * Filesystem provider props
 */
export interface FileSystemDatabaseProviderProps
  extends BaseDatabaseProviderProps {
  kind?: "filesystem";

  /**
   * Root directory for storing database files
   */
  rootDir?: string;
}

/**
 * Cloud provider props
 */
export interface CloudDatabaseProviderProps extends BaseDatabaseProviderProps {
  kind?: "cloud";
}

/**
 * Union type for database provider props
 */
export type DatabaseProviderProps =
  | FileSystemDatabaseProviderProps
  | CloudDatabaseProviderProps;
