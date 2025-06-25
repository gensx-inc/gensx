/* eslint-disable @typescript-eslint/only-throw-error */

import { readConfig } from "@gensx/core";

import { USER_AGENT } from "../utils/user-agent.js";
import {
  DeleteNamespaceResult,
  EnsureNamespaceResult,
  Namespace,
  QueryOptions,
  QueryResults,
  Schema,
  SearchStorage as ISearchStorage,
  WriteParams,
} from "./types.js";

/**
 * Base URL for the GenSX Console API
 */
const API_BASE_URL = "https://api.gensx.com";

/**
 * Error types for search operations
 */
export type SearchErrorCode =
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "INVALID_ARGUMENT"
  | "SEARCH_ERROR"
  | "NOT_IMPLEMENTED"
  | "NETWORK_ERROR";

/**
 * Abstract base error class for search operations
 */
export abstract class SearchError extends Error {
  constructor(
    public readonly code: SearchErrorCode,
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "SearchError";
  }
}

/**
 * Error class for when a vector is not found
 */
export class SearchNotFoundError extends SearchError {
  constructor(message: string, cause?: Error) {
    super("NOT_FOUND", message, cause);
    this.name = "SearchNotFoundError";
  }
}

/**
 * Error class for permission denied errors
 */
export class SearchPermissionDeniedError extends SearchError {
  constructor(message: string, cause?: Error) {
    super("PERMISSION_DENIED", message, cause);
    this.name = "SearchPermissionDeniedError";
  }
}

/**
 * Error class for invalid argument errors
 */
export class SearchInvalidArgumentError extends SearchError {
  constructor(message: string, cause?: Error) {
    super("INVALID_ARGUMENT", message, cause);
    this.name = "SearchInvalidArgumentError";
  }
}

/**
 * Error class for API errors (bad requests, server errors, etc.)
 */
export class SearchApiError extends SearchError {
  constructor(message: string, cause?: Error) {
    super("SEARCH_ERROR", message, cause);
    this.name = "SearchApiError";
  }
}

/**
 * Error class for malformed or missing API responses
 */
export class SearchResponseError extends SearchError {
  constructor(message: string, cause?: Error) {
    super("SEARCH_ERROR", message, cause);
    this.name = "SearchResponseError";
  }
}

/**
 * Error class for not implemented errors
 */
export class SearchNotImplementedError extends SearchError {
  constructor(message: string, cause?: Error) {
    super("NOT_IMPLEMENTED", message, cause);
    this.name = "SearchNotImplementedError";
  }
}

/**
 * Error class for network errors
 */
export class SearchNetworkError extends SearchError {
  constructor(message: string, cause?: Error) {
    super("NETWORK_ERROR", message, cause);
    this.name = "SearchNetworkError";
  }
}

/**
 * Helper to convert API errors to more specific errors
 */
function handleApiError(err: unknown, operation: string): never {
  if (err instanceof SearchError) {
    throw err;
  }
  if (err instanceof Error) {
    throw new SearchNetworkError(
      `Error during ${operation}: ${err.message}`,
      err,
    );
  }
  throw new SearchNetworkError(`Error during ${operation}: ${String(err)}`);
}

/**
 * Remote implementation of vector namespace
 */
export class SearchNamespace implements Namespace {
  constructor(
    public readonly namespaceId: string,
    private apiBaseUrl: string,
    private apiKey: string,
    private org: string,
    private project: string,
    private environment: string,
  ) {}

  async write({
    upsertColumns,
    upsertRows,
    patchColumns,
    patchRows,
    deletes,
    deleteByFilter,
    distanceMetric,
    schema,
  }: WriteParams): Promise<{ message: string; rowsAffected: number }> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/search/${encodeURIComponent(this.namespaceId)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify({
            upsertColumns,
            upsertRows,
            patchColumns,
            patchRows,
            deletes,
            deleteByFilter,
            distanceMetric,
            schema,
          } as Record<string, unknown>),
        },
      );

      if (!response.ok) {
        throw new SearchApiError(response.statusText);
      }

      const data = (await response.json()) as {
        message: string;
        rowsAffected: number;
      };
      return data;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "write");
      }
      throw err;
    }
  }

  async query({
    topK,
    includeAttributes,
    filters,
    rankBy,
    aggregateBy,
    consistency,
  }: QueryOptions): Promise<QueryResults> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/search/${encodeURIComponent(this.namespaceId)}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify({
            rankBy,
            topK: topK,
            includeAttributes,
            filters,
            aggregateBy,
            consistency,
          }),
        },
      );

      if (!response.ok) {
        throw new SearchApiError(response.statusText);
      }

      const data = (await response.json()) as QueryResults;
      return data;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "query");
      }
      throw err;
    }
  }

  async getSchema(): Promise<Schema> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/search/${encodeURIComponent(this.namespaceId)}/schema`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "User-Agent": USER_AGENT,
          },
        },
      );

      if (!response.ok) {
        throw new SearchApiError(response.statusText);
      }

      const data = (await response.json()) as Schema;
      return data;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "schema");
      }
      throw err;
    }
  }

  async updateSchema({ schema }: { schema: Schema }): Promise<Schema> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/search/${encodeURIComponent(this.namespaceId)}/schema`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify(schema),
        },
      );

      if (!response.ok) {
        throw new SearchApiError(response.statusText);
      }

      const data = (await response.json()) as Schema;
      return data;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "updateSchema");
      }
      throw err;
    }
  }
}

/**
 * Remote implementation of search
 */
export class SearchStorage implements ISearchStorage {
  private apiKey: string;
  private apiBaseUrl: string;
  private org: string;
  private project: string;
  private environment: string;
  private namespaces: Map<string, SearchNamespace> = new Map<
    string,
    SearchNamespace
  >();

  constructor(project: string, environment: string) {
    this.project = project;
    this.environment = environment;

    const config = readConfig();

    this.apiKey = process.env.GENSX_API_KEY ?? config.api?.token ?? "";
    if (!this.apiKey) {
      throw new Error(
        "GENSX_API_KEY environment variable must be set for search",
      );
    }

    this.org = process.env.GENSX_ORG ?? config.api?.org ?? "";
    if (!this.org) {
      throw new Error(
        "Organization ID must be provided via constructor or GENSX_ORG environment variable",
      );
    }

    this.apiBaseUrl =
      process.env.GENSX_API_BASE_URL ?? config.api?.baseUrl ?? API_BASE_URL;
  }

  getNamespace(name: string): Namespace {
    if (!this.namespaces.has(name)) {
      this.namespaces.set(
        name,
        new SearchNamespace(
          name,
          this.apiBaseUrl,
          this.apiKey,
          this.org,
          this.project,
          this.environment,
        ),
      );
    }

    return this.namespaces.get(name)!;
  }

  async ensureNamespace(name: string): Promise<EnsureNamespaceResult> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/search/${encodeURIComponent(name)}/ensure`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "User-Agent": USER_AGENT,
          },
        },
      );

      if (!response.ok) {
        throw new SearchApiError(response.statusText);
      }

      const data = (await response.json()) as EnsureNamespaceResult;

      // Make sure the namespace is in our cache
      if (!this.namespaces.has(name)) {
        this.getNamespace(name);
      }

      return data;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "ensureNamespace");
      }
      throw err;
    }
  }

  async deleteNamespace(name: string): Promise<DeleteNamespaceResult> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/search/${encodeURIComponent(name)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "User-Agent": USER_AGENT,
          },
        },
      );

      if (!response.ok) {
        throw new SearchApiError(response.statusText);
      }

      const data = (await response.json()) as DeleteNamespaceResult;

      // Remove namespace from caches if it was successfully deleted
      if (data.deleted) {
        if (this.namespaces.has(name)) {
          const ns = this.namespaces.get(name);
          if (ns) {
            this.namespaces.delete(name);
          }
        }
      }

      return data;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "deleteNamespace");
      }
      throw err;
    }
  }

  async listNamespaces(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    namespaces: { name: string; createdAt: Date }[];
    nextCursor?: string;
  }> {
    try {
      // Normalize prefix by removing trailing slash
      const normalizedPrefix = options?.prefix?.replace(/\/$/, "");

      const url = new URL(
        `${this.apiBaseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/search`,
      );

      if (normalizedPrefix) {
        url.searchParams.append("prefix", normalizedPrefix);
      }

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
          "User-Agent": USER_AGENT,
        },
      });

      if (!response.ok) {
        throw new SearchApiError(response.statusText);
      }

      const data = (await response.json()) as {
        namespaces: { name: string; createdAt: string }[];
        nextCursor?: string;
      };

      return {
        namespaces: data.namespaces.map((ns) => ({
          name: ns.name,
          createdAt: new Date(ns.createdAt),
        })),
        nextCursor: data.nextCursor,
      };
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "listNamespaces");
      }
      throw err;
    }
  }

  hasEnsuredNamespace(name: string): boolean {
    return this.namespaces.has(name);
  }

  /**
   * Check if a namespace exists
   * @param name The namespace name to check
   * @returns Promise that resolves to true if the namespace exists
   */
  async namespaceExists(name: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/search/${encodeURIComponent(name)}`,
        {
          method: "HEAD",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "User-Agent": USER_AGENT,
          },
        },
      );

      return response.ok;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "namespaceExists");
      }
      throw err;
    }
  }
}
