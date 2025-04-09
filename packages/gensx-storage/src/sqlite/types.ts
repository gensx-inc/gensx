// import { Readable } from "stream";

import { InArgs } from "@libsql/client";

/**
 * Error types for SQLite operations
 */
export type SQLiteErrorCode =
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "CONFLICT"
  | "SYNTAX_ERROR"
  | "CONSTRAINT_VIOLATION"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "TRANSACTION_ERROR";

/**
 * Abstract base error class for SQLite operations
 */
export abstract class SQLiteError extends Error {
  constructor(
    public readonly code: SQLiteErrorCode,
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "SQLiteError";
  }
}

/**
 * Error class for when a database is not found
 */
export class SQLiteNotFoundError extends SQLiteError {
  constructor(message: string, cause?: Error) {
    super("NOT_FOUND", message, cause);
    this.name = "SQLiteNotFoundError";
  }
}

/**
 * Error class for permission denied errors
 */
export class SQLitePermissionDeniedError extends SQLiteError {
  constructor(message: string, cause?: Error) {
    super("PERMISSION_DENIED", message, cause);
    this.name = "SQLitePermissionDeniedError";
  }
}

/**
 * Error class for SQL syntax errors
 */
export class SQLiteSyntaxError extends SQLiteError {
  constructor(message: string, cause?: Error) {
    super("SYNTAX_ERROR", message, cause);
    this.name = "SQLiteSyntaxError";
  }
}

/**
 * Error class for constraint violations
 */
export class SQLiteConstraintError extends SQLiteError {
  constructor(message: string, cause?: Error) {
    super("CONSTRAINT_VIOLATION", message, cause);
    this.name = "SQLiteConstraintError";
  }
}

/**
 * Error class for internal errors
 */
export class SQLiteInternalError extends SQLiteError {
  constructor(message: string, cause?: Error) {
    super("INTERNAL_ERROR", message, cause);
    this.name = "SQLiteInternalError";
  }
}

/**
 * Error class for network errors
 */
export class SQLiteNetworkError extends SQLiteError {
  constructor(message: string, cause?: Error) {
    super("NETWORK_ERROR", message, cause);
    this.name = "SQLiteNetworkError";
  }
}

/**
 * Error class for transaction errors
 */
export class SQLiteTransactionError extends SQLiteError {
  constructor(message: string, cause?: Error) {
    super("TRANSACTION_ERROR", message, cause);
    this.name = "SQLiteTransactionError";
  }
}

/**
 * A response from the API
 */
export interface APIResponse<T> {
  status: "ok" | "error";
  data?: T;
  error?: string;
}

/**
 * SQL execution result
 */
export interface SQLiteResult {
  columns: string[];
  rows: unknown[][];
  rowsAffected: number;
  lastInsertId?: number;
}

/**
 * SQL statement with optional parameters
 */
export interface SQLiteStatement {
  sql: string;
  params?: InArgs;
}

/**
 * Batch execution results
 */
export interface SQLiteBatchResult {
  results: SQLiteResult[];
}

/**
 * Database table information
 */
export interface SQLiteTableInfo {
  name: string;
  columns: SQLiteColumnInfo[];
}

/**
 * Column information
 */
export interface SQLiteColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue?: unknown;
  primaryKey: boolean;
}

/**
 * Database information
 */
export interface SQLiteDatabaseInfo {
  name: string;
  size: number;
  lastModified: Date;
  tables: SQLiteTableInfo[];
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
 * Interface for a SQLite database
 */
export interface SQLiteDatabase {
  /**
   * Execute a single SQL statement
   */
  execute(sql: string, params?: InArgs): Promise<SQLiteResult>;

  /**
   * Execute multiple SQL statements in a transaction
   */
  batch(statements: SQLiteStatement[]): Promise<SQLiteBatchResult>;

  /**
   * Execute multiple SQL statements as a script (without transaction semantics)
   */
  executeMultiple(sql: string): Promise<SQLiteBatchResult>;

  /**
   * Run SQL migration statements with foreign keys disabled
   */
  migrate(sql: string): Promise<SQLiteBatchResult>;

  /**
   * Get information about the database
   */
  getInfo(): Promise<SQLiteDatabaseInfo>;

  /**
   * Close the database connection
   */
  close(): void;
}

/**
 * Interface for SQLite storage
 */
export interface SQLiteStorage {
  /**
   * Get a database by name
   */
  getDatabase(name: string): SQLiteDatabase;

  /**
   * List all databases
   */
  listDatabases(): Promise<string[]>;

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
}

/**
 * Provider configuration kinds
 */
export type StorageKind = "filesystem" | "cloud";

/**
 * Base provider props
 */
export interface BaseSQLiteProviderProps {
  /**
   * Storage kind
   */
  kind: StorageKind;

  /**
   * Default database name
   */
  defaultDatabase?: string;
}

/**
 * Filesystem provider props
 */
export interface FileSystemSQLiteProviderProps extends BaseSQLiteProviderProps {
  kind: "filesystem";

  /**
   * Root directory for storing database files
   */
  path?: string;
}

/**
 * Cloud provider props
 */
export interface CloudSQLiteProviderProps extends BaseSQLiteProviderProps {
  kind: "cloud";

  /**
   * Optional organization ID override (default: uses current org from context)
   */
  organizationId?: string;
}

/**
 * Union type for SQLite provider props
 */
export type SQLiteProviderProps =
  | FileSystemSQLiteProviderProps
  | CloudSQLiteProviderProps;
