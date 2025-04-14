/* eslint-disable @typescript-eslint/only-throw-error */

import type {
  DistanceMetric,
  Filters,
  Id,
  NamespaceMetadata,
  QueryResults,
  Schema,
} from "@turbopuffer/turbopuffer";

import { readConfig } from "@gensx/core";

import {
  DeleteNamespaceResult,
  EnsureNamespaceResult,
  Namespace,
  QueryOptions,
  Search as ISearch,
  SearchAPIResponse,
  Vector,
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
  | "CONFLICT"
  | "INVALID_ARGUMENT"
  | "INTERNAL_ERROR"
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
 * Error class for conflict errors (e.g., concurrent modifications)
 */
export class SearchConflictError extends SearchError {
  constructor(message: string, cause?: Error) {
    super("CONFLICT", message, cause);
    this.name = "SearchConflictError";
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
 * Error class for internal errors
 */
export class SearchInternalError extends SearchError {
  constructor(message: string, cause?: Error) {
    super("INTERNAL_ERROR", message, cause);
    this.name = "SearchInternalError";
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
    public readonly id: string,
    private apiBaseUrl: string,
    private apiKey: string,
    private org: string,
  ) {}

  async upsert({
    vectors,
    distanceMetric,
    schema,
    batchSize = 1000,
  }: {
    vectors: Vector[];
    distanceMetric: DistanceMetric;
    schema?: Schema;
    batchSize?: number;
  }): Promise<void> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/search/${encodeURIComponent(this.id)}/vectors`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vectors,
            distanceMetric,
            schema,
            batchSize,
          }),
        },
      );

      if (!response.ok) {
        throw new SearchInternalError(
          `Failed to upsert vectors: ${response.statusText}`,
        );
      }
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "upsert");
      }
      throw err;
    }
  }

  async delete({ ids }: { ids: Id[] }): Promise<void> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/search/${encodeURIComponent(this.id)}/delete`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ids,
          }),
        },
      );

      if (!response.ok) {
        throw new SearchInternalError(
          `Failed to delete vectors: ${response.statusText}`,
        );
      }

      const apiResponse = (await response.json()) as SearchAPIResponse<{
        success: boolean;
      }>;
      if (apiResponse.status === "error") {
        throw new SearchInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "delete");
      }
      throw err;
    }
  }

  async deleteByFilter({ filters }: { filters: Filters }): Promise<number> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/search/${encodeURIComponent(this.id)}/deleteByFilter`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filters,
          }),
        },
      );

      if (!response.ok) {
        throw new SearchInternalError(
          `Failed to delete vectors by filter: ${response.statusText}`,
        );
      }

      const apiResponse = (await response.json()) as SearchAPIResponse<{
        message: string;
        rowsAffected: number;
      }>;
      if (apiResponse.status === "error") {
        throw new SearchInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new SearchInternalError("No data returned from API");
      }

      return apiResponse.data.rowsAffected;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "deleteByFilter");
      }
      throw err;
    }
  }

  async query({
    vector,
    distanceMetric,
    topK,
    includeVectors,
    includeAttributes,
    filters,
    rankBy,
    consistency,
  }: QueryOptions): Promise<QueryResults> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/search/${encodeURIComponent(this.id)}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vector,
            distanceMetric,
            topK: topK ?? 10,
            includeVectors: includeVectors ?? false,
            includeAttributes,
            filters,
            rankBy,
            consistency,
          }),
        },
      );

      if (!response.ok) {
        throw new SearchInternalError(
          `Failed to query vectors: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as SearchAPIResponse<QueryResults>;
      if (apiResponse.status === "error") {
        throw new SearchInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new SearchInternalError("No data returned from API");
      }

      return apiResponse.data;
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
        `${this.apiBaseUrl}/org/${this.org}/search/${encodeURIComponent(this.id)}/schema`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new SearchInternalError(
          `Failed to get schema: ${response.statusText}`,
        );
      }

      const apiResponse = (await response.json()) as SearchAPIResponse<Schema>;
      if (apiResponse.status === "error") {
        throw new SearchInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new SearchInternalError("No data returned from API");
      }

      return apiResponse.data;
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
        `${this.apiBaseUrl}/org/${this.org}/search/${encodeURIComponent(this.id)}/schema`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(schema),
        },
      );

      if (!response.ok) {
        throw new SearchInternalError(
          `Failed to update schema: ${response.statusText}`,
        );
      }

      const apiResponse = (await response.json()) as SearchAPIResponse<Schema>;
      if (apiResponse.status === "error") {
        throw new SearchInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new SearchInternalError("No data returned from API");
      }

      return apiResponse.data;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "updateSchema");
      }
      throw err;
    }
  }

  // async copyFromNamespace(sourceNamespace: string): Promise<void> {
  //   try {
  //     const response = await fetch(
  //       `${this.apiBaseUrl}/org/${this.org}/search/${encodeURIComponent(
  //         this.id,
  //       )}`,
  //       {
  //         method: "POST",
  //         headers: {
  //           Authorization: `Bearer ${this.apiKey}`,
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           copy_from_namespace: sourceNamespace,
  //         }),
  //       },
  //     );

  //     if (!response.ok) {
  //       throw new VectorInternalError(
  //         `Failed to copy namespace: ${response.statusText}`,
  //       );
  //     }
  //   } catch (err) {
  //     if (!(err instanceof VectorError)) {
  //       throw handleApiError(err, "copyFromNamespace");
  //     }
  //     throw err;
  //   }
  // }

  async getMetadata(): Promise<NamespaceMetadata> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/search/${encodeURIComponent(this.id)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new SearchInternalError(
          `Failed to get namespace metadata: ${response.statusText}`,
        );
      }

      const apiResponse = (await response.json()) as SearchAPIResponse<{
        metadata: NamespaceMetadata;
      }>;
      if (apiResponse.status === "error") {
        throw new SearchInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new SearchInternalError("No data returned from API");
      }

      return apiResponse.data.metadata;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "metadata");
      }
      throw err;
    }
  }
}

/**
 * Remote implementation of search
 */
export class Search implements ISearch {
  private apiKey: string;
  private apiBaseUrl: string;
  private org: string;
  private defaultPrefix?: string;
  private namespaces: Map<string, SearchNamespace> = new Map<
    string,
    SearchNamespace
  >();

  constructor(defaultPrefix?: string) {
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

    this.defaultPrefix = defaultPrefix;
  }

  getNamespace(name: string): Namespace {
    const namespaceId = this.defaultPrefix
      ? `${this.defaultPrefix}/${name}`
      : name;

    if (!this.namespaces.has(namespaceId)) {
      this.namespaces.set(
        namespaceId,
        new SearchNamespace(
          namespaceId,
          this.apiBaseUrl,
          this.apiKey,
          this.org,
        ),
      );
    }

    return this.namespaces.get(namespaceId)!;
  }

  async ensureNamespace(name: string): Promise<EnsureNamespaceResult> {
    try {
      const namespaceId = this.defaultPrefix
        ? `${this.defaultPrefix}/${name}`
        : name;
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/search/${encodeURIComponent(namespaceId)}/ensure`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );
      if (!response.ok) {
        throw new SearchInternalError(
          `Failed to ensure namespace: ${response.statusText}`,
        );
      }
      const apiResponse =
        (await response.json()) as SearchAPIResponse<EnsureNamespaceResult>;

      if (apiResponse.status === "error") {
        throw new SearchInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new SearchInternalError("No data returned from API");
      }

      // Make sure the namespace is in our cache
      if (!this.namespaces.has(name)) {
        this.getNamespace(name);
      }

      return apiResponse.data;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "ensureNamespace");
      }
      throw err;
    }
  }

  // TODO: Implement this correctly
  async deleteNamespace(name: string): Promise<DeleteNamespaceResult> {
    try {
      const namespaceId = this.defaultPrefix
        ? `${this.defaultPrefix}/${name}`
        : name;
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/search/${encodeURIComponent(namespaceId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );
      if (!response.ok) {
        throw new SearchInternalError(
          `Failed to delete namespace: ${response.statusText}`,
        );
      }

      const apiResponse =
        (await response.json()) as SearchAPIResponse<DeleteNamespaceResult>;

      if (apiResponse.status === "error") {
        throw new SearchInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new SearchInternalError("No data returned from API");
      }

      // Remove namespace from caches if it was successfully deleted
      if (apiResponse.data.deleted) {
        if (this.namespaces.has(name)) {
          const ns = this.namespaces.get(name);
          if (ns) {
            this.namespaces.delete(name);
          }
        }
      }

      return apiResponse.data;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "deleteNamespace");
      }
      throw err;
    }
  }

  async listNamespaces(options?: { prefix?: string }): Promise<string[]> {
    try {
      // Normalize prefixes by removing trailing slashes
      const normalizedDefaultPrefix = this.defaultPrefix?.replace(/\/$/, "");
      const normalizedPrefix = options?.prefix?.replace(/\/$/, "");

      // Build the search prefix
      const searchPrefix = normalizedDefaultPrefix
        ? normalizedPrefix
          ? `${normalizedDefaultPrefix}/${normalizedPrefix}`
          : normalizedDefaultPrefix
        : (normalizedPrefix ?? "");

      const url = new URL(`${this.apiBaseUrl}/org/${this.org}/search`);

      if (searchPrefix) {
        url.searchParams.append("prefix", searchPrefix);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new SearchInternalError(
          `Failed to list namespaces: ${response.statusText}`,
        );
      }

      const apiResponse = (await response.json()) as SearchAPIResponse<{
        namespaces: string[];
      }>;
      if (apiResponse.status === "error") {
        throw new SearchInternalError(
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        throw new SearchInternalError("No data returned from API");
      }

      // Remove default prefix from results if it exists
      if (normalizedDefaultPrefix) {
        return apiResponse.data.namespaces
          .filter(
            (ns) =>
              ns === normalizedDefaultPrefix ||
              ns.startsWith(`${normalizedDefaultPrefix}/`),
          )
          .map((ns) =>
            ns === normalizedDefaultPrefix
              ? ""
              : ns.slice(normalizedDefaultPrefix.length + 1),
          );
      }

      return apiResponse.data.namespaces;
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
   * Create a new namespace with the given options
   * @param id The namespace ID to create
   * @param options Options for creating the namespace
   * @returns Promise that resolves when the operation is complete
   */
  // async createNamespace(id: string, options?: NamespaceOptions): Promise<void> {
  //   try {
  //     const namespaceId = this.defaultPrefix
  //       ? `${this.defaultPrefix}/${id}`
  //       : id;

  //     const response = await fetch(
  //       `${this.apiBaseUrl}/org/${this.org}/search/${encodeURIComponent(
  //         namespaceId,
  //       )}`,
  //       {
  //         method: "PUT",
  //         headers: {
  //           Authorization: `Bearer ${this.apiKey}`,
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           distanceMetric: options?.distanceMetric,
  //           schema: options?.schema,
  //         }),
  //       },
  //     );

  //     if (!response.ok) {
  //       throw new SearchInternalError(
  //         `Failed to create namespace: ${response.statusText}`,
  //       );
  //     }
  //   } catch (err) {
  //     if (!(err instanceof SearchError)) {
  //       throw handleApiError(err, "createNamespace");
  //     }
  //     throw err;
  //   }
  // }

  /**
   * Check if a namespace exists
   * @param name The namespace name to check
   * @returns Promise that resolves to true if the namespace exists
   */
  async namespaceExists(name: string): Promise<boolean> {
    try {
      const namespaceId = this.defaultPrefix
        ? `${this.defaultPrefix}/${name}`
        : name;

      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/search/${encodeURIComponent(
          namespaceId,
        )}`,
        {
          method: "HEAD",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
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
