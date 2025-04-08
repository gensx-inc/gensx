/* eslint-disable @typescript-eslint/only-throw-error */

import type {
  Filters,
  Id,
  QueryResults,
  Schema,
} from "@turbopuffer/turbopuffer";

import { readConfig } from "@gensx/core";

import {
  Namespace,
  NamespaceMetadata,
  NamespaceOptions,
  QueryOptions,
  QueryResult,
  Search as ISearch,
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

  async upsert(vectors: Vector[]): Promise<void> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/vector/namespaces/${encodeURIComponent(
          this.id,
        )}/vectors`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vectors,
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

  async delete(ids: Id[]): Promise<void> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/vector/namespaces/${encodeURIComponent(
          this.id,
        )}/vectors`,
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
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "delete");
      }
      throw err;
    }
  }

  async deleteByFilter(filters: Filters): Promise<number> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/vector/namespaces/${encodeURIComponent(
          this.id,
        )}/vectors/filter`,
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

      const data = (await response.json()) as { deleted: number };
      return data.deleted;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "deleteByFilter");
      }
      throw err;
    }
  }

  async query(options: QueryOptions): Promise<QueryResult[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/vector/namespaces/${encodeURIComponent(
          this.id,
        )}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vector: options.vector,
            distanceMetric: options.distanceMetric,
            topK: options.topK ?? 10,
            includeVectors: options.includeVectors ?? false,
            includeAttributes: options.includeAttributes,
            filters: options.filters,
            rankBy: options.rankBy,
            consistency: options.consistency,
          }),
        },
      );

      if (!response.ok) {
        throw new SearchInternalError(
          `Failed to query vectors: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as { results: QueryResults };
      return data.results;
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
        `${this.apiBaseUrl}/org/${this.org}/vector/namespaces/${encodeURIComponent(
          this.id,
        )}/schema`,
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

      return (await response.json()) as Schema;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "schema");
      }
      throw err;
    }
  }

  async updateSchema(schema: Schema): Promise<Schema> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/vector/namespaces/${encodeURIComponent(
          this.id,
        )}/schema`,
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

      return (await response.json()) as Schema;
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
  //       `${this.apiBaseUrl}/org/${this.org}/vector/namespaces/${encodeURIComponent(
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

  // async recall(options: {
  //   num?: number;
  //   top_k?: number;
  //   filters?: Filters;
  //   queries?: number[][];
  // }): Promise<RecallMeasurement> {
  //   try {
  //     const response = await fetch(
  //       `${this.apiBaseUrl}/org/${this.org}/vector/namespaces/${encodeURIComponent(
  //         this.id,
  //       )}/_debug/recall`,
  //       {
  //         method: "POST",
  //         headers: {
  //           Authorization: `Bearer ${this.apiKey}`,
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           num: options.num,
  //           top_k: options.top_k,
  //           filters: options.filters,
  //           queries: options.queries
  //             ? options.queries.reduce((acc, value) => acc.concat(value), [])
  //             : undefined,
  //         }),
  //       },
  //     );

  //     if (!response.ok) {
  //       throw new VectorInternalError(
  //         `Failed to measure recall: ${response.statusText}`,
  //       );
  //     }

  //     return (await response.json()) as RecallMeasurement;
  //   } catch (err) {
  //     if (!(err instanceof VectorError)) {
  //       throw handleApiError(err, "recall");
  //     }
  //     throw err;
  //   }
  // }

  // async approxNumVectors(): Promise<number> {
  //   try {
  //     const response = await fetch(
  //       `${this.apiBaseUrl}/org/${this.org}/vector/namespaces/${encodeURIComponent(
  //         this.id,
  //       )}/stats`,
  //       {
  //         method: "GET",
  //         headers: {
  //           Authorization: `Bearer ${this.apiKey}`,
  //         },
  //       },
  //     );

  //     if (!response.ok) {
  //       throw new VectorInternalError(
  //         `Failed to get namespace stats: ${response.statusText}`,
  //       );
  //     }

  //     const data = (await response.json()) as { count: number };
  //     return data.count;
  //   } catch (err) {
  //     if (!(err instanceof VectorError)) {
  //       throw handleApiError(err, "approxNumVectors");
  //     }
  //     throw err;
  //   }
  // }

  async metadata(): Promise<NamespaceMetadata> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/vector/namespaces/${encodeURIComponent(
          this.id,
        )}`,
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

      const data = (await response.json()) as { metadata: NamespaceMetadata };
      return data.metadata;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "metadata");
      }
      throw err;
    }
  }

  async deleteAll(): Promise<void> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/vector/namespaces/${encodeURIComponent(
          this.id,
        )}`,
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
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "deleteAll");
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

  constructor(organizationId?: string, defaultPrefix?: string) {
    // readConfig has internal error handling and always returns a GensxConfig object
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const config = readConfig();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    this.apiKey = process.env.GENSX_API_KEY ?? config.api?.token ?? "";
    if (!this.apiKey) {
      throw new Error(
        "GENSX_API_KEY environment variable must be set for search",
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    this.org = organizationId ?? process.env.GENSX_ORG ?? config.api?.org ?? "";
    if (!this.org) {
      throw new Error(
        "Organization ID must be provided via constructor or GENSX_ORG environment variable",
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.apiBaseUrl =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      process.env.GENSX_API_BASE_URL ?? config.api?.baseUrl ?? API_BASE_URL;

    this.defaultPrefix = defaultPrefix;
  }

  getNamespace(id: string): Namespace {
    const namespaceId = this.defaultPrefix ? `${this.defaultPrefix}/${id}` : id;
    return new SearchNamespace(
      namespaceId,
      this.apiBaseUrl,
      this.apiKey,
      this.org,
    );
  }

  async listNamespaces(options?: {
    prefix?: string;
    pageSize?: number;
  }): Promise<string[]> {
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

      const url = new URL(
        `${this.apiBaseUrl}/org/${this.org}/vector/namespaces`,
      );

      if (searchPrefix) {
        url.searchParams.append("prefix", searchPrefix);
      }

      if (options?.pageSize) {
        url.searchParams.append("pageSize", options.pageSize.toString());
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

      const data = (await response.json()) as { namespaces: string[] };

      // Remove default prefix from results if it exists
      if (normalizedDefaultPrefix) {
        return data.namespaces
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

      return data.namespaces;
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "listNamespaces");
      }
      throw err;
    }
  }

  /**
   * Create a new namespace with the given options
   * @param id The namespace ID to create
   * @param options Options for creating the namespace
   * @returns Promise that resolves when the operation is complete
   */
  async createNamespace(id: string, options?: NamespaceOptions): Promise<void> {
    try {
      const namespaceId = this.defaultPrefix
        ? `${this.defaultPrefix}/${id}`
        : id;

      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/vector/namespaces/${encodeURIComponent(
          namespaceId,
        )}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            distanceMetric: options?.distanceMetric,
            schema: options?.schema,
          }),
        },
      );

      if (!response.ok) {
        throw new SearchInternalError(
          `Failed to create namespace: ${response.statusText}`,
        );
      }
    } catch (err) {
      if (!(err instanceof SearchError)) {
        throw handleApiError(err, "createNamespace");
      }
      throw err;
    }
  }

  /**
   * Check if a namespace exists
   * @param id The namespace ID to check
   * @returns Promise that resolves to true if the namespace exists
   */
  async namespaceExists(id: string): Promise<boolean> {
    try {
      const namespaceId = this.defaultPrefix
        ? `${this.defaultPrefix}/${id}`
        : id;

      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/vector/namespaces/${encodeURIComponent(
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
