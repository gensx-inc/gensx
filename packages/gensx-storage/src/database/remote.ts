/* eslint-disable @typescript-eslint/only-throw-error */

import { readConfig } from "@gensx/core";
import { InArgs } from "@libsql/client";

import {
  Database,
  DatabaseAPIResponse,
  DatabaseBatchResult,
  DatabaseError,
  DatabaseInfo,
  DatabaseInternalError,
  DatabaseNetworkError,
  DatabaseResult,
  DatabaseStatement,
  DatabaseStorage,
  DeleteDatabaseResult,
  EnsureDatabaseResult,
} from "./types.js";

/**
 * Base URL for the GenSX Console API
 */
const API_BASE_URL = "https://api.gensx.com";

/**
 * Helper to convert between API errors and DatabaseErrors
 */
function handleApiError(err: unknown, operation: string): never {
  if (err instanceof DatabaseError) {
    throw err;
  }
  if (err instanceof Error) {
    throw new DatabaseNetworkError(
      `Error during ${operation}: ${err.message}`,
      err,
    );
  }
  throw new DatabaseNetworkError(`Error during ${operation}: ${String(err)}`);
}

/**
 * Implementation of Database interface for remote cloud storage
 */
export class RemoteDatabase implements Database {
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

  async execute(sql: string, params?: InArgs): Promise<DatabaseResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/database/${this.databaseName}/execute`,
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
        throw new DatabaseInternalError(
          `Failed to execute SQL: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as DatabaseAPIResponse<DatabaseResult>;

      if (apiResponse.status === "error") {
        throw new DatabaseInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new DatabaseInternalError("No data returned from API");
      }

      return apiResponse.data;
    } catch (err) {
      throw handleApiError(err, "execute");
    }
  }

  async batch(statements: DatabaseStatement[]): Promise<DatabaseBatchResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/database/${this.databaseName}/batch`,
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
        throw new DatabaseInternalError(
          `Failed to execute batch: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as DatabaseAPIResponse<DatabaseBatchResult>;

      if (apiResponse.status === "error") {
        throw new DatabaseInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new DatabaseInternalError("No data returned from API");
      }

      return apiResponse.data;
    } catch (err) {
      throw handleApiError(err, "batch");
    }
  }

  async executeMultiple(sql: string): Promise<DatabaseBatchResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/database/${this.databaseName}/multiple`,
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
        throw new DatabaseInternalError(
          `Failed to execute multiple: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as DatabaseAPIResponse<DatabaseBatchResult>;

      if (apiResponse.status === "error") {
        throw new DatabaseInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new DatabaseInternalError("No data returned from API");
      }

      return apiResponse.data;
    } catch (err) {
      throw handleApiError(err, "executeMultiple");
    }
  }

  async migrate(sql: string): Promise<DatabaseBatchResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/database/${this.databaseName}/migrate`,
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
        throw new DatabaseInternalError(
          `Failed to execute migration: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as DatabaseAPIResponse<DatabaseBatchResult>;

      if (apiResponse.status === "error") {
        throw new DatabaseInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new DatabaseInternalError("No data returned from API");
      }

      return apiResponse.data;
    } catch (err) {
      throw handleApiError(err, "migrate");
    }
  }

  async getInfo(): Promise<DatabaseInfo> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/database/${this.databaseName}/info`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new DatabaseInternalError(
          `Failed to get database info: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as DatabaseAPIResponse<DatabaseInfo>;

      if (apiResponse.status === "error") {
        throw new DatabaseInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new DatabaseInternalError("No data returned from API");
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
 * Implementation of DatabaseStorage interface for remote cloud storage
 */
export class RemoteDatabaseStorage implements DatabaseStorage {
  private apiKey: string;
  private apiBaseUrl: string;
  private org: string;
  private databases: Map<string, RemoteDatabase> = new Map<
    string,
    RemoteDatabase
  >();

  constructor() {
    // readConfig has internal error handling and always returns a GensxConfig object

    const config = readConfig();

    this.apiKey = process.env.GENSX_API_KEY ?? config.api?.token ?? "";
    if (!this.apiKey) {
      throw new Error(
        "GENSX_API_KEY environment variable must be set for cloud storage",
      );
    }

    this.org = process.env.GENSX_ORG ?? config.api?.org ?? "";
    if (!this.org) {
      throw new Error(
        "Organization ID must be provided via props or GENSX_ORG environment variable",
      );
    }

    this.apiBaseUrl =
      process.env.GENSX_API_BASE_URL ?? config.api?.baseUrl ?? API_BASE_URL;
  }

  getDatabase(name: string): Database {
    if (!this.databases.has(name)) {
      this.databases.set(
        name,
        new RemoteDatabase(name, this.apiBaseUrl, this.apiKey, this.org),
      );
    }

    return this.databases.get(name)!;
  }

  async listDatabases(): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/database`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new DatabaseInternalError(
          `Failed to list databases: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as DatabaseAPIResponse<{
        databases: string[];
      }>;

      if (data.status === "error") {
        throw new DatabaseInternalError(
          `API error: ${data.error ?? "Unknown error"}`,
        );
      }

      if (!data.data) {
        throw new DatabaseInternalError("No data returned from API");
      }
      return data.data.databases.map((db) => decodeURIComponent(db));
    } catch (err) {
      throw handleApiError(err, "listDatabases");
    }
  }

  async ensureDatabase(name: string): Promise<EnsureDatabaseResult> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/database/${encodeURIComponent(
          name,
        )}/ensure`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new DatabaseInternalError(
          `Failed to ensure database: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as DatabaseAPIResponse<EnsureDatabaseResult>;

      if (apiResponse.status === "error") {
        throw new DatabaseInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new DatabaseInternalError("No data returned from API");
      }

      // Make sure the database is in our cache
      if (!this.databases.has(name)) {
        this.getDatabase(name);
      }

      return apiResponse.data;
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }
      throw new DatabaseNetworkError(
        `Error during ensureDatabase operation: ${String(err)}`,
        err as Error,
      );
    }
  }

  hasEnsuredDatabase(name: string): boolean {
    return this.databases.has(name);
  }

  async deleteDatabase(name: string): Promise<DeleteDatabaseResult> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/database/${encodeURIComponent(
          name,
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new DatabaseInternalError(
          `Failed to delete database: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as DatabaseAPIResponse<DeleteDatabaseResult>;

      if (apiResponse.status === "error") {
        throw new DatabaseInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new DatabaseInternalError("No data returned from API");
      }

      // Remove database from caches if it was successfully deleted
      if (apiResponse.data.deleted) {
        if (this.databases.has(name)) {
          const db = this.databases.get(name);
          if (db) {
            db.close();
            this.databases.delete(name);
          }
        }
      }

      return apiResponse.data;
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }
      throw new DatabaseNetworkError(
        `Error during deleteDatabase operation: ${String(err)}`,
        err as Error,
      );
    }
  }
}
