/* eslint-disable @typescript-eslint/only-throw-error */

import { readConfig } from "@gensx/core";
import { InArgs } from "@libsql/client";

import { parseErrorResponse } from "../utils/parse-error.js";
import { USER_AGENT } from "../utils/user-agent.js";
import {
  Database,
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
  private project: string;
  private environment: string;

  constructor(
    databaseName: string,
    baseUrl: string,
    apiKey: string,
    org: string,
    project: string,
    environment: string,
  ) {
    this.databaseName = encodeURIComponent(databaseName);
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.org = org;
    this.project = project;
    this.environment = environment;
  }

  async execute(sql: string, params?: InArgs): Promise<DatabaseResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/database/${this.databaseName}/execute`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify({
            sql,
            params,
          }),
        },
      );

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new DatabaseInternalError(`Failed to execute SQL: ${message}`);
      }

      const data = (await response.json()) as DatabaseResult;
      return data;
    } catch (err) {
      throw handleApiError(err, "execute");
    }
  }

  async batch(statements: DatabaseStatement[]): Promise<DatabaseBatchResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/database/${this.databaseName}/batch`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify({ statements }),
        },
      );

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new DatabaseInternalError(`Failed to execute batch: ${message}`);
      }

      const data = (await response.json()) as DatabaseBatchResult;
      return data;
    } catch (err) {
      throw handleApiError(err, "batch");
    }
  }

  async executeMultiple(sql: string): Promise<DatabaseBatchResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/database/${this.databaseName}/multiple`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify({ sql }),
        },
      );

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new DatabaseInternalError(
          `Failed to execute multiple: ${message}`,
        );
      }

      const data = (await response.json()) as DatabaseBatchResult;
      return data;
    } catch (err) {
      throw handleApiError(err, "executeMultiple");
    }
  }

  async migrate(sql: string): Promise<DatabaseBatchResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/database/${this.databaseName}/migrate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify({ sql }),
        },
      );

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new DatabaseInternalError(
          `Failed to execute migration: ${message}`,
        );
      }

      const data = (await response.json()) as DatabaseBatchResult;
      return data;
    } catch (err) {
      throw handleApiError(err, "migrate");
    }
  }

  async getInfo(): Promise<DatabaseInfo> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/database/${this.databaseName}/info`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "User-Agent": USER_AGENT,
          },
        },
      );

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new DatabaseInternalError(
          `Failed to get database info: ${message}`,
        );
      }

      const data = (await response.json()) as DatabaseInfo;

      // Convert date string to Date object
      const { lastModified, ...rest } = data;
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
  private project: string;
  private environment: string;
  private databases: Map<string, RemoteDatabase> = new Map<
    string,
    RemoteDatabase
  >();

  constructor(project: string, environment: string) {
    this.project = project;
    this.environment = environment;

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
        new RemoteDatabase(
          name,
          this.apiBaseUrl,
          this.apiKey,
          this.org,
          this.project,
          this.environment,
        ),
      );
    }

    return this.databases.get(name)!;
  }

  async listDatabases(options?: { limit?: number; cursor?: string }): Promise<{
    databases: { name: string; createdAt: Date }[];
    nextCursor?: string;
  }> {
    try {
      const url = new URL(
        `${this.apiBaseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/database`,
      );

      if (options?.limit) {
        url.searchParams.append("limit", options.limit.toString());
      }

      if (options?.cursor) {
        url.searchParams.append("cursor", options.cursor);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new DatabaseInternalError(`Failed to list databases: ${message}`);
      }

      const data = (await response.json()) as {
        databases: { name: string; createdAt: string }[];
        nextCursor?: string;
      };

      return {
        databases: data.databases.map((db) => ({
          name: decodeURIComponent(db.name),
          createdAt: new Date(db.createdAt),
        })),
        ...(data.nextCursor && { nextCursor: data.nextCursor }),
      };
    } catch (err) {
      throw handleApiError(err, "listDatabases");
    }
  }

  async ensureDatabase(name: string): Promise<EnsureDatabaseResult> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/database/${encodeURIComponent(
          name,
        )}/ensure`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
          },
        },
      );

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new DatabaseInternalError(
          `Failed to ensure database: ${message}`,
        );
      }

      const data = (await response.json()) as EnsureDatabaseResult;

      // Make sure the database is in our cache
      if (!this.databases.has(name)) {
        this.getDatabase(name);
      }

      return data;
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
        `${this.apiBaseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/database/${encodeURIComponent(
          name,
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "User-Agent": USER_AGENT,
          },
        },
      );

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new DatabaseInternalError(
          `Failed to delete database: ${message}`,
        );
      }

      const data = (await response.json()) as DeleteDatabaseResult;

      // Remove database from caches if it was successfully deleted
      if (data.deleted) {
        if (this.databases.has(name)) {
          const db = this.databases.get(name);
          if (db) {
            db.close();
            this.databases.delete(name);
          }
        }
      }

      return data;
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
