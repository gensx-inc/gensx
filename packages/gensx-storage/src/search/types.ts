import type {
  Consistency,
  DistanceMetric,
  Filters,
  Id,
  NamespaceMetadata,
  PatchColumns,
  PatchRows,
  QueryResults,
  RankBy,
  SchemaType,
  UpsertColumns,
  UpsertRows,
} from "@turbopuffer/turbopuffer";

/**
 * Query result from the vector search
 */
export type QueryResult = QueryResults[0];

/**
 * Options for namespace operations
 */
export interface NamespaceOptions {
  /**
   * Distance metric to use for vector similarity
   */
  distanceMetric?: DistanceMetric;

  /**
   * Schema for the namespace
   */
  schema?: Schema;
}

export interface WriteParams {
  /** Upserts documents in a column-based format. */
  upsertColumns?: UpsertColumns;
  /** Upserts documents in a row-based format. */
  upsertRows?: UpsertRows;
  /**
   * Patches documents in a column-based format. Identical to `upsert_columns`, but
   * instead of overwriting entire documents, only the specified keys are written.
   */
  patchColumns?: PatchColumns;
  /**
   * Patches documents in a row-based format. Identical to `upsert_rows`, but
   * instead of overwriting entire documents, only the specified keys are written.
   */
  patchRows?: PatchRows;
  /** Deletes documents by ID. */
  deletes?: Id[];
  /** Deletes documents that match a filter. */
  deleteByFilter?: Filters;
  distanceMetric?: DistanceMetric;
  schema?: Schema;
}

/**
 * Options for query operations
 */
export interface QueryOptions {
  /**
   * The query vector
   */
  vector?: number[];

  /**
   * Distance metric to use for this query
   */
  distanceMetric?: DistanceMetric;

  /**
   * Number of results to return
   */
  topK?: number;

  /**
   * Whether to include the original vectors in results
   */
  includeVectors?: boolean;

  /**
   * Whether to include attributes in results
   */
  includeAttributes?: boolean | string[];

  /**
   * Filter results by attribute values
   */
  filters?: Filters;

  /**
   * How to rank results
   */
  rankBy?: RankBy;

  /**
   * Consistency requirements for the query
   */
  consistency?: Consistency;
}

/**
 * Schema interface with camelCasing
 */
export type Schema = Record<
  string,
  {
    type?: SchemaType;
    filterable?: boolean;
    fullTextSearch?:
      | boolean
      | Partial<{
          k1: number;
          b: number;
          language: string;
          stemming: boolean;
          removeStopwords: boolean;
          caseSensitive: boolean;
          tokenizer: string;
        }>;
    ann?: boolean;
  }
>;

/**
 * Result of ensuring a namespace exists
 */
export interface EnsureNamespaceResult {
  exists: boolean;
  created: boolean;
}

/**
 * Result of deleting a namespace
 */
export interface DeleteNamespaceResult {
  deleted: boolean;
}

/**
 * Interface for a vector namespace
 */
export interface Namespace {
  /**
   * Get the namespace ID
   */
  namespaceId: string;

  /**
   * Upsert vectors into the namespace
   * @param vectors The vectors to upsert
   * @returns Promise that resolves when the operation is complete
   */
  // upsert({
  //   vectors,
  //   distanceMetric,
  //   schema,
  //   batchSize,
  // }: {
  //   vectors: Vector[];
  //   distanceMetric: DistanceMetric;
  //   schema?: Schema;
  //   batchSize?: number;
  // }): Promise<void>;

  /**
   * Upsert vectors into the namespace
   * @param vectors The vectors to upsert
   * @returns Promise that resolves when the operation is complete
   */
  write({
    upsertColumns,
    upsertRows,
    patchColumns,
    patchRows,
    deletes,
    deleteByFilter,
    distanceMetric,
    schema,
  }: WriteParams): Promise<number>;

  /**
   * Query vectors by similarity
   * @param options Query options
   * @returns Promise with query results
   */
  query({
    vector,
    distanceMetric,
    topK,
    includeVectors,
    includeAttributes,
    filters,
    rankBy,
    consistency,
  }: QueryOptions): Promise<QueryResults>;

  /**
   * Get metadata about the namespace
   * @returns Promise with namespace metadata
   */
  getMetadata(): Promise<NamespaceMetadata>;

  /**
   * Get the current schema for the namespace
   * @returns Promise with the current schema
   */
  getSchema(): Promise<Schema>;

  /**
   * Update the schema for the namespace
   * @param schema The new schema
   * @returns Promise with the updated schema
   */
  updateSchema({ schema }: { schema: Schema }): Promise<Schema>;
}

/**
 * Interface for vector search
 */
export interface SearchStorage {
  /**
   * Get a namespace object for a specific namespace ID
   * @param name The namespace name
   * @returns A namespace object
   */
  getNamespace(name: string): Namespace;

  /**
   * List all namespaces
   * @param options Options for listing namespaces
   * @returns Promise with array of namespace IDs and optional next cursor for pagination
   */
  listNamespaces(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    namespaces: { name: string; createdAt: Date }[];
    nextCursor?: string;
  }>;

  /**
   * Delete a namespace
   * @param name The namespace name
   * @returns Promise with the delete result
   */
  deleteNamespace(name: string): Promise<DeleteNamespaceResult>;

  /**
   * Check if a namespace exists
   * @param name The namespace name
   * @returns Promise that resolves to true if the namespace exists
   */
  namespaceExists(name: string): Promise<boolean>;

  /**
   * Ensure a namespace exists
   * @param name The namespace name
   * @returns Promise with the ensure result
   */
  ensureNamespace(name: string): Promise<EnsureNamespaceResult>;

  /**
   * Check if a namespace has been ensured
   */
  hasEnsuredNamespace(name: string): boolean;
}

/**
 * Provider configuration for search
 */
export interface SearchProviderProps {
  /**
   * Optional project name. By default, the GENSX_PROJECT environment variable will be used then the projectName from the gensx.yaml file.
   */
  project?: string;

  /**
   * Optional environment name. By default, the GENSX_ENV environment variable will be used then the currently selected environment in the CLI (e.g. `gensx env select`).
   */
  environment?: string;
}
