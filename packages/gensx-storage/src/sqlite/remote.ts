/* eslint-disable @typescript-eslint/only-throw-error */

import { readConfig } from "@gensx/core";
import { InArgs } from "@libsql/client";

import {
  DeleteDatabaseResult,
  EnsureDatabaseResult,
  SQLiteAPIResponse,
  SQLiteBatchResult,
  SQLiteDatabase,
  SQLiteDatabaseInfo,
  SQLiteError,
  SQLiteInternalError,
  SQLiteNetworkError,
  SQLiteResult,
  SQLiteStatement,
  SQLiteStorage,
} from "./types.js";

/**
 * Base URL for the GenSX Console API
 */
const API_BASE_URL = "https://api.gensx.com";

/**
 * Helper to convert between API errors and SQLiteErrors
 */
function handleApiError(err: unknown, operation: string): never {
  if (err instanceof SQLiteError) {
    throw err;
  }
  if (err instanceof Error) {
    throw new SQLiteNetworkError(
      `Error during ${operation}: ${err.message}`,
      err,
    );
  }
  throw new SQLiteNetworkError(`Error during ${operation}: ${String(err)}`);
}

/**
 * Implementation of SQLiteDatabase interface for remote cloud storage
 */
export class RemoteSQLiteDatabase implements SQLiteDatabase {
  private databaseName: string;
  private baseUrl: string;
  private apiKey: string;
  private org: string;

  constructor(
    databaseName: string,
    baseUrl: string,
    apiKey: string,
    org: string,
  ) {
    this.databaseName = encodeURIComponent(databaseName);
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.org = org;
  }

  async execute(sql: string, params?: InArgs): Promise<SQLiteResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/sqlite/${this.databaseName}/execute`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sql,
            params,
          }),
        },
      );

      if (!response.ok) {
        throw new SQLiteInternalError(
          `Failed to execute SQL: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as SQLiteAPIResponse<SQLiteResult>;

      if (apiResponse.status === "error") {
        throw new SQLiteInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new SQLiteInternalError("No data returned from API");
      }

      return apiResponse.data;
    } catch (err) {
      throw handleApiError(err, "execute");
    }
  }

  async batch(statements: SQLiteStatement[]): Promise<SQLiteBatchResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/sqlite/${this.databaseName}/batch`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ statements }),
        },
      );

      if (!response.ok) {
        throw new SQLiteInternalError(
          `Failed to execute batch: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as SQLiteAPIResponse<SQLiteBatchResult>;

      if (apiResponse.status === "error") {
        throw new SQLiteInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new SQLiteInternalError("No data returned from API");
      }

      return apiResponse.data;
    } catch (err) {
      throw handleApiError(err, "batch");
    }
  }

  async executeMultiple(sql: string): Promise<SQLiteBatchResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/sqlite/${this.databaseName}/multiple`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sql }),
        },
      );

      if (!response.ok) {
        throw new SQLiteInternalError(
          `Failed to execute multiple: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as SQLiteAPIResponse<SQLiteBatchResult>;

      if (apiResponse.status === "error") {
        throw new SQLiteInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new SQLiteInternalError("No data returned from API");
      }

      return apiResponse.data;
    } catch (err) {
      throw handleApiError(err, "executeMultiple");
    }
  }

  async migrate(sql: string): Promise<SQLiteBatchResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/sqlite/${this.databaseName}/migrate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sql }),
        },
      );

      if (!response.ok) {
        throw new SQLiteInternalError(
          `Failed to execute migration: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as SQLiteAPIResponse<SQLiteBatchResult>;

      if (apiResponse.status === "error") {
        throw new SQLiteInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new SQLiteInternalError("No data returned from API");
      }

      return apiResponse.data;
    } catch (err) {
      throw handleApiError(err, "migrate");
    }
  }

  async getInfo(): Promise<SQLiteDatabaseInfo> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/sqlite/${this.databaseName}/info`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new SQLiteInternalError(
          `Failed to get database info: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as SQLiteAPIResponse<SQLiteDatabaseInfo>;

      if (apiResponse.status === "error") {
        throw new SQLiteInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new SQLiteInternalError("No data returned from API");
      }

      // Convert date string to Date object
      const { lastModified, ...rest } = apiResponse.data;
      return {
        ...rest,
        lastModified: new Date(lastModified as unknown as string),
      };
    } catch (err) {
      throw handleApiError(err, "getInfo");
    }
  }

  close() {
    // No-op for remote database - connection is managed by API
    return;
  }
}

/**
 * Remote implementation of SQLite storage using GenSX Console API
 */
export class RemoteSQLiteStorage implements SQLiteStorage {
  private apiKey: string;
  private apiBaseUrl: string;
  private org: string;
  private databases: Map<string, RemoteSQLiteDatabase> = new Map<
    string,
    RemoteSQLiteDatabase
  >();

  constructor(organizationId?: string) {
    // readConfig has internal error handling and always returns a GensxConfig object

    const config = readConfig();

    this.apiKey = process.env.GENSX_API_KEY ?? config.api?.token ?? "";
    if (!this.apiKey) {
      throw new Error(
        "GENSX_API_KEY environment variable must be set for cloud storage",
      );
    }

    this.org = organizationId ?? process.env.GENSX_ORG ?? config.api?.org ?? "";
    if (!this.org) {
      throw new Error(
        "Organization ID must be provided via props or GENSX_ORG environment variable",
      );
    }

    this.apiBaseUrl =
      process.env.GENSX_API_BASE_URL ?? config.api?.baseUrl ?? API_BASE_URL;
  }

  getDatabase(name: string): SQLiteDatabase {
    if (!this.databases.has(name)) {
      this.databases.set(
        name,
        new RemoteSQLiteDatabase(name, this.apiBaseUrl, this.apiKey, this.org),
      );
    }

    return this.databases.get(name)!;
  }

  async listDatabases(): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/sqlite`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new SQLiteInternalError(
          `Failed to list databases: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as { databases: string[] };
      return data.databases.map((db) => decodeURIComponent(db));
    } catch (err) {
      if (err instanceof SQLiteError) {
        throw err;
      }
      throw new SQLiteNetworkError(
        `Error during listDatabases operation: ${String(err)}`,
        err as Error,
      );
    }
  }

  async ensureDatabase(name: string): Promise<EnsureDatabaseResult> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/sqlite/${encodeURIComponent(name)}/ensure`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new SQLiteInternalError(
          `Failed to ensure database: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as SQLiteAPIResponse<EnsureDatabaseResult>;

      if (apiResponse.status === "error") {
        throw new SQLiteInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new SQLiteInternalError("No data returned from API");
      }

      return apiResponse.data;
    } catch (err) {
      if (err instanceof SQLiteError) {
        throw err;
      }
      throw new SQLiteNetworkError(
        `Error during ensureDatabase operation: ${String(err)}`,
        err as Error,
      );
    }
  }

  async deleteDatabase(name: string): Promise<DeleteDatabaseResult> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/sqlite/${encodeURIComponent(name)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new SQLiteInternalError(
          `Failed to delete database: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as SQLiteAPIResponse<DeleteDatabaseResult>;

      if (apiResponse.status === "error") {
        throw new SQLiteInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new SQLiteInternalError("No data returned from API");
      }

      // Remove database from cache if it was successfully deleted
      if (apiResponse.data.deleted && this.databases.has(name)) {
        const db = this.databases.get(name);
        if (db) {
          db.close();
          this.databases.delete(name);
        }
      }

      return apiResponse.data;
    } catch (err) {
      if (err instanceof SQLiteError) {
        throw err;
      }
      throw new SQLiteNetworkError(
        `Error during deleteDatabase operation: ${String(err)}`,
        err as Error,
      );
    }
  }
}
