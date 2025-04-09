import type {
  Consistency,
  DistanceMetric,
  Filters,
  Id,
  NamespaceMetadata as TurbopufferNamespaceMetadata,
  QueryResults,
  RankBy,
  Schema,
  Vector as TurbopufferVector,
} from "@turbopuffer/turbopuffer";

/**
 * Vector with ID and optional metadata/attributes
 */
export type Vector = TurbopufferVector;

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
 * Interface for a vector namespace
 */
export interface Namespace {
  /**
   * Get the namespace ID
   */
  id: string;

  /**
   * Upsert vectors into the namespace
   * @param vectors The vectors to upsert
   * @returns Promise that resolves when the operation is complete
   */
  upsert(vectors: Vector[]): Promise<void>;

  /**
   * Delete vectors by IDs
   * @param ids The IDs of vectors to delete
   * @returns Promise that resolves when the operation is complete
   */
  delete(ids: Id[]): Promise<void>;

  /**
   * Delete vectors by filter
   * @param filters The filters to apply
   * @returns Promise with the number of vectors deleted
   */
  deleteByFilter(filters: Filters): Promise<number>;

  /**
   * Query vectors by similarity
   * @param options Query options
   * @returns Promise with query results
   */
  query(options: QueryOptions): Promise<QueryResults>;

  /**
   * Query vectors by similarity and return performance metrics
   * @param options Query options
   * @returns Promise with query results and metrics
   */
  // queryWithMetrics(options: QueryOptions): Promise<{
  //   results: QueryResults;
  //   metrics: QueryMetrics;
  // }>;

  /**
   * Get the approximate number of vectors in the namespace
   * @returns Promise with the approximate count
   */
  //approxNumVectors(): Promise<number>;

  /**
   * Get metadata about the namespace
   * @returns Promise with namespace metadata
   */
  metadata(): Promise<NamespaceMetadata>;

  /**
   * Delete the entire namespace
   * @returns Promise that resolves when the operation is complete
   */
  deleteAll(): Promise<void>;

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
  updateSchema(schema: Schema): Promise<Schema>;

  /**
   * Copy all documents from another namespace
   * @param sourceNamespace The source namespace ID
   */
  //copyFromNamespace(sourceNamespace: string): Promise<void>;

  /**
   * Evaluate recall performance of ANN queries
   */
  // recall(options: {
  //   num?: number;
  //   top_k?: number;
  //   filters?: Filters;
  //   queries?: number[][];
  // }): Promise<RecallMeasurement>;
}

/**
 * Metadata for a namespace
 */
export interface NamespaceMetadata extends TurbopufferNamespaceMetadata {
  // Extending the Turbopuffer namespace metadata
}

/**
 * Recall measurement result
 */
// export interface RecallMeasurement {
//   recall: number;
//   latency_ms: number;
//   num_queries: number;
// }

/**
 * Interface for vector search
 */
export interface Search {
  /**
   * Get a namespace object for a specific namespace ID
   * @param id The namespace ID
   * @returns A namespace object
   */
  getNamespace(id: string): Namespace;

  /**
   * List all namespaces
   * @param options Options for listing namespaces
   * @returns Promise with array of namespace IDs
   */
  listNamespaces(options?: {
    prefix?: string;
    pageSize?: number;
  }): Promise<string[]>;
}

/**
 * Provider props for cloud vector storage
 */
export interface SearchProviderProps {
  /**
   * Default prefix for all namespaces
   */
  defaultPrefix?: string;
}
