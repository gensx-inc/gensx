import { Readable } from "stream";

/**
 * Error types for blob storage operations
 */
export enum BlobErrorCode {
  NOT_FOUND = "NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  CONFLICT = "CONFLICT",
  INVALID_ARGUMENT = "INVALID_ARGUMENT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NOT_IMPLEMENTED = "NOT_IMPLEMENTED",
  NETWORK_ERROR = "NETWORK_ERROR",
}

/**
 * Custom error class for blob storage operations
 */
export class BlobError extends Error {
  constructor(
    public readonly code: BlobErrorCode,
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "BlobError";
  }
}

/**
 * Options for blob operations
 */
export interface BlobOptions {
  /**
   * ETag for conditional operations (optimistic concurrency control)
   */
  etag?: string;

  /**
   * Content type of the blob
   */
  contentType?: string;

  /**
   * Custom metadata associated with the blob
   */
  metadata?: Record<string, string>;
}

/**
 * A response from a blob operation that includes metadata
 */
export interface BlobResponse<T> {
  /**
   * The data content of the blob
   */
  data: T;

  /**
   * ETag of the blob
   */
  etag?: string;

  /**
   * Last modified timestamp
   */
  lastModified?: Date;

  /**
   * Size of the blob in bytes
   */
  size?: number;

  /**
   * Content type of the blob
   */
  contentType?: string;

  /**
   * Custom metadata associated with the blob
   */
  metadata?: Record<string, string>;
}

/**
 * Interface for a typed blob object
 */
export interface Blob<T> {
  /**
   * Get the blob as JSON data.
   * @returns The blob data as JSON, or null if not found.
   */
  getJSON(): Promise<T | null>;

  /**
   * Get the blob as a string.
   * @returns The blob data as a string, or null if not found.
   */
  getString(): Promise<string | null>;

  /**
   * Get the raw blob response with metadata.
   * @returns The blob response with metadata, or null if not found.
   */
  getRaw(): Promise<BlobResponse<Buffer | string> | null>;

  /**
   * Get a readable stream of the blob's content.
   * @returns A readable stream of the blob's content.
   */
  getStream(): Promise<Readable>;

  /**
   * Put JSON data into the blob.
   * @param value The JSON data to store.
   * @param options Optional metadata and etag for conditional updates.
   * @returns The etag of the stored blob.
   */
  putJSON(value: T, options?: BlobOptions): Promise<{ etag: string }>;

  /**
   * Put string data into the blob.
   * @param value The string data to store.
   * @param options Optional metadata and etag for conditional updates.
   * @returns The etag of the stored blob.
   */
  putString(value: string, options?: BlobOptions): Promise<{ etag: string }>;

  /**
   * Put raw data into the blob with metadata.
   * @param value The data to store.
   * @param options Optional metadata and etag for conditional updates.
   * @returns The etag of the stored blob.
   */
  putRaw(
    value: BlobResponse<Buffer | string>,
    options?: BlobOptions,
  ): Promise<{ etag: string }>;

  /**
   * Put a readable stream into the blob.
   * @param stream The readable stream to store.
   * @param options Optional metadata and etag for conditional updates.
   * @returns The etag of the stored blob.
   */
  putStream(stream: Readable, options?: BlobOptions): Promise<{ etag: string }>;

  /**
   * Delete the blob.
   */
  delete(): Promise<void>;

  /**
   * Check if the blob exists.
   * @returns True if the blob exists, false otherwise.
   */
  exists(): Promise<boolean>;

  /**
   * Get metadata associated with the blob
   */
  getMetadata(): Promise<Record<string, string> | null>;

  /**
   * Update metadata associated with the blob
   * @param metadata The new metadata to store
   */
  updateMetadata(metadata: Record<string, string>): Promise<void>;

  /**
   * Store JSON content with metadata
   */
  putJSONWithMetadata(
    value: T,
    metadata: Record<string, string>,
    options?: BlobOptions,
  ): Promise<{ etag: string }>;

  /**
   * Store string content with metadata
   */
  putStringWithMetadata(
    value: string,
    metadata: Record<string, string>,
    options?: BlobOptions,
  ): Promise<{ etag: string }>;

  /**
   * Store raw content with metadata
   */
  putRawWithMetadata(
    value: Buffer | string,
    metadata: Record<string, string>,
    options?: BlobOptions,
  ): Promise<{ etag: string }>;
}

/**
 * Interface for blob storage
 */
export interface BlobStorage {
  /**
   * Get a blob object for a specific key
   */
  getBlob<T>(key: string): Blob<T>;

  /**
   * List all blobs with the given prefix
   */
  listBlobs(prefix?: string): Promise<string[]>;
}

/**
 * Provider configuration kinds
 */
export type StorageKind = "filesystem" | "cloud";

/**
 * Base provider props
 */
export interface BaseBlobProviderProps {
  /**
   * Storage kind
   */
  kind: StorageKind;

  /**
   * Default prefix for all blob keys
   */
  defaultPrefix?: string;
}

/**
 * Filesystem provider props
 */
export interface FilesystemBlobProviderProps extends BaseBlobProviderProps {
  kind: "filesystem";

  /**
   * Root directory for storing blobs
   */
  rootDir?: string;
}

/**
 * Cloud provider props
 */
export interface CloudBlobProviderProps extends BaseBlobProviderProps {
  kind: "cloud";

  /**
   * Optional organization ID override (default: uses current org from context)
   */
  organizationId?: string;
}

/**
 * Union type for blob provider props
 */
export type BlobProviderProps =
  | FilesystemBlobProviderProps
  | CloudBlobProviderProps;
