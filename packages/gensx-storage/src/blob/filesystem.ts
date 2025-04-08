/* eslint-disable @typescript-eslint/only-throw-error */

import * as crypto from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Readable } from "node:stream";

import {
  Blob,
  BlobConflictError,
  BlobError,
  BlobInternalError,
  BlobNotFoundError,
  BlobOptions,
  BlobPermissionDeniedError,
  BlobResponse,
  BlobStorage,
} from "./types.js";

/**
 * Helper to convert between filesystem errors and BlobErrors
 * @param err The error to convert
 * @param operation The operation that failed
 * @param path The path where the error occurred
 * @throws BlobError with appropriate error code and message
 */
function handleFsError(err: unknown, operation: string, path: string): never {
  if (err instanceof Error) {
    const nodeErr = err as NodeJS.ErrnoException;

    if (nodeErr.code === "ENOENT") {
      throw new BlobNotFoundError(`Blob not found at path: ${path}`, err);
    } else if (nodeErr.code === "EACCES") {
      throw new BlobPermissionDeniedError(
        `Permission denied for operation ${operation} on path: ${path}`,
        err,
      );
    } else if (nodeErr.code === "EEXIST") {
      throw new BlobConflictError(`File already exists at path: ${path}`, err);
    } else if (nodeErr.code === "ENOTEMPTY") {
      throw new BlobConflictError(`Directory not empty at path: ${path}`, err);
    } else if (nodeErr.code === "ENOTDIR") {
      throw new BlobInternalError(`Path is not a directory: ${path}`, err);
    }
  }

  // Default error case
  throw new BlobInternalError(
    `Error during ${operation}: ${String(err)}`,
    err as Error,
  );
}

/**
 * Calculate an MD5 hash of the content for use as an ETag
 * @param content The content to hash
 * @returns The MD5 hash as a hex string
 */
function calculateEtag(content: string | Buffer): string {
  return crypto.createHash("md5").update(content).digest("hex");
}

/**
 * Generate a unique filename for metadata
 * @param filePath The path to the blob file
 * @returns The path to the metadata file
 */
function getMetadataPath(filePath: string): string {
  return `${filePath}.metadata.json`;
}

/**
 * Implementation of Blob interface for filesystem storage
 * @template T The type of data stored in the blob
 */
class FileSystemBlob<T> implements Blob<T> {
  private filePath: string;
  private metadataPath: string;

  /**
   * Create a new FileSystemBlob
   * @param filePath The path to the blob file
   */
  constructor(filePath: string) {
    this.filePath = filePath;
    this.metadataPath = getMetadataPath(filePath);
  }

  /**
   * Get JSON data from the blob
   * @returns The JSON data or null if the blob doesn't exist
   * @throws BlobError if there's an error reading the blob
   */
  async getJSON<R>(): Promise<R | null> {
    try {
      const content = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(content) as R;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw handleFsError(err, "getJSON", this.filePath);
    }
  }

  /**
   * Get string data from the blob
   * @returns The string data or null if the blob doesn't exist
   * @throws BlobError if there's an error reading the blob
   */
  async getString(): Promise<string | null> {
    try {
      return await fs.readFile(this.filePath, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw handleFsError(err, "getString", this.filePath);
    }
  }

  /**
   * Get a readable stream from the blob
   * @returns A readable stream of the blob content
   * @throws BlobError if there's an error creating the stream
   */
  async getStream(): Promise<Readable> {
    try {
      // Check if file exists first
      try {
        await fs.access(this.filePath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          throw new BlobNotFoundError(
            `Blob not found at path: ${this.filePath}`,
          );
        }
        throw err;
      }

      // Create and return readable stream
      const stream = createReadStream(this.filePath);

      // Handle stream errors
      stream.on("error", (err) => {
        throw handleFsError(err, "getStream:read", this.filePath);
      });

      return stream;
    } catch (err) {
      throw handleFsError(err, "getStream", this.filePath);
    }
  }

  /**
   * Get raw binary data from the blob
   * @returns The raw data and metadata or null if the blob doesn't exist
   * @throws BlobError if there's an error reading the blob
   */
  async getRaw(): Promise<BlobResponse<Buffer> | null> {
    try {
      // Read the raw buffer
      const content = await fs.readFile(this.filePath);
      const stats = await fs.stat(this.filePath);
      const metadataResult = await this.getMetadata();

      const etag = calculateEtag(content);

      // Check if content is base64 encoded
      const isBase64 = metadataResult?.isBase64 === "true";
      const decodedContent = isBase64
        ? Buffer.from(content.toString(), "base64")
        : content;

      // Remove contentType and etag from metadata if they exist
      const { contentType, etag: _, ...metadata } = metadataResult ?? {};

      return {
        content: decodedContent,
        etag,
        lastModified: stats.mtime,
        size: stats.size,
        contentType: metadataResult?.contentType ?? "application/octet-stream",
        metadata: metadataResult
          ? Object.keys(metadata).length > 0
            ? metadata
            : undefined
          : undefined,
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw handleFsError(err, "getRaw", this.filePath);
    }
  }

  /**
   * Put JSON data into the blob
   * @param value The JSON data to store
   * @param options Optional metadata and ETag
   * @returns The ETag of the stored data
   * @throws BlobError if there's an error storing the data
   */
  async putJSON(value: T, options?: BlobOptions): Promise<{ etag: string }> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const content = JSON.stringify(value);
      const newEtag = calculateEtag(content);

      if (options?.etag) {
        try {
          const existingContent = await fs.readFile(this.filePath, "utf8");
          const existingEtag = calculateEtag(existingContent);

          if (existingEtag !== options.etag) {
            throw new BlobConflictError(
              `ETag mismatch: expected ${options.etag} but found ${existingEtag}`,
            );
          }
        } catch (err) {
          // If the error is already a BlobError, rethrow it
          if (err instanceof BlobError) {
            throw err;
          }
          // Only use handleFsError for filesystem errors
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            throw handleFsError(err, "putJSON:etag-check", this.filePath);
          }
        }
      }

      await fs.writeFile(this.filePath, content, "utf8");

      // Always create metadata file with content type
      const metadata = {
        ...(options?.metadata ?? {}),
        contentType: options?.contentType ?? "application/json",
      };
      await this.updateMetadata(metadata);

      return { etag: newEtag };
    } catch (err) {
      // If the error is already a BlobError, rethrow it
      if (err instanceof BlobError) {
        throw err;
      }
      throw handleFsError(err, "putJSON", this.filePath);
    }
  }

  /**
   * Put string data into the blob
   * @param value The string data to store
   * @param options Optional metadata and ETag
   * @returns The ETag of the stored data
   * @throws BlobError if there's an error storing the data
   */
  async putString(
    value: string,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const newEtag = calculateEtag(value);

      if (options?.etag) {
        try {
          const existingContent = await fs.readFile(this.filePath, "utf8");
          const existingEtag = calculateEtag(existingContent);

          if (existingEtag !== options.etag) {
            throw new BlobConflictError(
              `ETag mismatch: expected ${options.etag} but found ${existingEtag}`,
            );
          }
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            throw handleFsError(err, "putString:etag-check", this.filePath);
          }
        }
      }

      await fs.writeFile(this.filePath, value, "utf8");

      // Always create metadata file with content type
      const metadata = {
        ...(options?.metadata ?? {}),
        contentType: options?.contentType ?? "text/plain",
      };
      await this.updateMetadata(metadata);

      return { etag: newEtag };
    } catch (err) {
      throw handleFsError(err, "putString", this.filePath);
    }
  }

  /**
   * Put raw binary data into the blob
   * @param value The binary data to store
   * @param options Optional metadata and ETag
   * @returns The ETag of the stored data
   * @throws BlobError if there's an error storing the data
   */
  async putRaw(
    value: Buffer,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const newEtag = calculateEtag(value);

      if (options?.etag) {
        try {
          const existingContent = await fs.readFile(this.filePath);
          const existingEtag = calculateEtag(existingContent);

          if (existingEtag !== options.etag) {
            throw new BlobConflictError(
              `ETag mismatch: expected ${options.etag} but found ${existingEtag}`,
            );
          }
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            throw handleFsError(err, "putRaw:etag-check", this.filePath);
          }
        }
      }

      // Write the raw buffer
      await fs.writeFile(this.filePath, value);

      // Always create metadata file with content type
      const metadata = {
        ...(options?.metadata ?? {}),
        contentType: options?.contentType ?? "application/octet-stream",
      };
      await this.updateMetadata(metadata);

      return { etag: newEtag };
    } catch (err) {
      throw handleFsError(err, "putRaw", this.filePath);
    }
  }

  /**
   * Get the blob content and metadata
   * @returns The blob content and metadata or null if the blob doesn't exist
   * @throws BlobError if there's an error reading the blob
   */
  async get(): Promise<BlobResponse<T> | null> {
    try {
      const content = await fs.readFile(this.filePath, "utf8");
      const stats = await fs.stat(this.filePath);
      const metadata = await this.getMetadata();

      const etag = calculateEtag(content);

      return {
        content: JSON.parse(content) as T,
        etag,
        lastModified: stats.mtime,
        size: stats.size,
        contentType: metadata?.contentType ?? "application/json",
        metadata: metadata ?? undefined,
      };
    } catch (err) {
      if (
        err instanceof Error &&
        (err as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return null; // File doesn't exist
      }
      throw handleFsError(err, "get", this.filePath);
    }
  }

  /**
   * Put data from a stream into the blob
   * @param stream The stream to read from
   * @param options Optional metadata and ETag
   * @returns The ETag of the stored data
   * @throws BlobError if there's an error storing the data
   */
  async putStream(
    stream: Readable,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });

      // Create write stream
      const writeStream = createWriteStream(this.filePath);
      const chunks: Buffer[] = [];

      // Handle stream errors
      stream.on("error", (err) => {
        writeStream.destroy();
        throw handleFsError(err, "putStream:read", this.filePath);
      });

      writeStream.on("error", (err) => {
        stream.destroy();
        throw handleFsError(err, "putStream:write", this.filePath);
      });

      // Collect chunks and write to file
      for await (const chunk of stream) {
        const buffer = Buffer.from(chunk as ArrayBufferLike);
        chunks.push(buffer);
        writeStream.write(buffer);
      }

      // Wait for write to complete
      await new Promise<void>((resolve, reject) => {
        writeStream.end((err?: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Calculate etag from all chunks
      const buffer = Buffer.concat(chunks);
      const etag = calculateEtag(buffer);

      // Always create metadata file with content type
      const metadata = {
        ...(options?.metadata ?? {}),
        contentType: options?.contentType ?? "application/octet-stream",
      };
      await this.updateMetadata(metadata);

      return { etag };
    } catch (err) {
      throw handleFsError(err, "putStream", this.filePath);
    }
  }

  /**
   * Delete the blob
   * @throws BlobError if there's an error deleting the blob
   */
  async delete(): Promise<void> {
    try {
      try {
        await fs.unlink(this.filePath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          throw handleFsError(err, "delete:file", this.filePath);
        }
        // File already doesn't exist, continue to delete metadata
      }

      // Also delete metadata file if it exists
      try {
        await fs.unlink(this.metadataPath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          throw handleFsError(err, "delete:metadata", this.metadataPath);
        }
        // Metadata file doesn't exist, ignore
      }
    } catch (err) {
      throw handleFsError(err, "delete", this.filePath);
    }
  }

  /**
   * Check if the blob exists
   * @returns true if the blob exists, false otherwise
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the blob metadata
   * @returns The blob metadata or null if the blob doesn't exist
   * @throws BlobError if there's an error reading the metadata
   */
  async getMetadata(): Promise<Record<string, string> | null> {
    try {
      const content = await fs.readFile(this.metadataPath, "utf8");
      const metadata = JSON.parse(content) as Record<string, string>;

      // Calculate etag from the blob content instead of the metadata content
      try {
        const blobContent = await fs.readFile(this.filePath);
        const etag = calculateEtag(blobContent);
        return { ...metadata, etag };
      } catch (blobErr) {
        if ((blobErr as NodeJS.ErrnoException).code === "ENOENT") {
          // If blob doesn't exist but metadata does, return metadata without etag
          return metadata;
        }
        throw handleFsError(blobErr, "getMetadata:blob", this.filePath);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null; // Metadata file doesn't exist
      }
      throw handleFsError(err, "getMetadata", this.metadataPath);
    }
  }

  /**
   * Update metadata associated with the blob
   * @param metadata The new metadata to store
   * @param options Optional ETag for conditional update
   * @throws BlobError if there's an error updating the metadata
   */
  async updateMetadata(
    metadata: Record<string, string>,
    options?: BlobOptions,
  ): Promise<void> {
    try {
      // If etag is provided, verify it matches before updating
      if (options?.etag) {
        try {
          const existingContent = await fs.readFile(this.filePath);
          const existingEtag = calculateEtag(existingContent);

          if (existingEtag !== options.etag) {
            throw new BlobConflictError(
              `ETag mismatch: expected ${options.etag} but found ${existingEtag}`,
            );
          }
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            throw handleFsError(
              err,
              "updateMetadata:etag-check",
              this.filePath,
            );
          }
        }
      }

      await fs.mkdir(path.dirname(this.metadataPath), { recursive: true });

      // Get existing metadata to preserve contentType
      let existingMetadata: Record<string, string> = {};
      try {
        const content = await fs.readFile(this.metadataPath, "utf8");
        existingMetadata = JSON.parse(content) as Record<string, string>;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          throw handleFsError(err, "updateMetadata:read", this.metadataPath);
        }
      }

      // Preserve contentType if it exists in existing metadata
      const contentType = existingMetadata.contentType;
      const newMetadata = { ...metadata };
      if (contentType) {
        newMetadata.contentType = contentType;
      }

      await fs.writeFile(
        this.metadataPath,
        JSON.stringify(newMetadata),
        "utf8",
      );
    } catch (err) {
      throw handleFsError(err, "updateMetadata", this.metadataPath);
    }
  }
}

/**
 * FileSystem implementation of blob storage
 */
export class FileSystemBlobStorage implements BlobStorage {
  /**
   * Create a new FileSystemBlobStorage
   * @param rootDir The root directory for blob storage
   * @param defaultPrefix Optional default prefix for all blob keys
   */
  constructor(
    private rootDir: string,
    private defaultPrefix?: string,
  ) {
    // Ensure rootDir exists on instantiation
    void this.ensureRootDir();
  }

  /**
   * Ensure the root directory exists
   * @throws BlobError if there's an error creating the directory
   */
  private async ensureRootDir(): Promise<void> {
    try {
      await fs.mkdir(this.rootDir, { recursive: true });
    } catch (err) {
      throw handleFsError(err, "ensureRootDir", this.rootDir);
    }
  }

  /**
   * Get the full path for a blob key
   * @param key The blob key
   * @returns The full path to the blob
   */
  private getFullPath(key: string): string {
    // Normalize key by removing leading/trailing slashes
    const normalizedKey = key.replace(/^\/+|\/+$/g, "");

    // Apply default prefix if specified
    const prefixedKey = this.defaultPrefix
      ? `${this.defaultPrefix}/${normalizedKey}`
      : normalizedKey;

    return path.join(this.rootDir, prefixedKey);
  }

  /**
   * Get a blob by key
   * @param key The blob key
   * @returns A Blob instance for the given key
   */
  getBlob<T>(key: string): Blob<T> {
    return new FileSystemBlob<T>(this.getFullPath(key));
  }

  /**
   * List all blobs with the given prefix
   * @param prefix Optional prefix to filter blobs
   * @returns An array of blob keys
   * @throws BlobError if there's an error listing blobs
   */
  async listBlobs(prefix?: string): Promise<string[]> {
    try {
      // Normalize prefixes by removing trailing slashes
      const normalizedDefaultPrefix = this.defaultPrefix?.replace(/\/$/, "");
      const normalizedPrefix = prefix?.replace(/\/$/, "");

      // Build the search prefix
      const searchPrefix = normalizedDefaultPrefix
        ? normalizedPrefix
          ? `${normalizedDefaultPrefix}/${normalizedPrefix}`
          : normalizedDefaultPrefix
        : (normalizedPrefix ?? "");

      const searchPath = path.join(this.rootDir, searchPrefix);

      try {
        // Check if directory exists
        await fs.access(searchPath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          return []; // Directory doesn't exist
        }
        throw handleFsError(err, "listBlobs:access", searchPath);
      }

      // Recursive function to list files
      const listFilesRecursively = async (
        dir: string,
        baseDir: string,
      ): Promise<string[]> => {
        const items = await fs.readdir(dir, { withFileTypes: true });
        const files: string[] = [];

        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          const relativePath = path.relative(baseDir, fullPath);

          if (item.isDirectory()) {
            const subFiles = await listFilesRecursively(fullPath, baseDir);
            files.push(...subFiles);
          } else if (!item.name.endsWith(".metadata.json")) {
            files.push(relativePath);
          }
        }

        return files;
      };

      const allFiles = await listFilesRecursively(searchPath, this.rootDir);

      // Remove default prefix from results if it exists
      if (normalizedDefaultPrefix) {
        return allFiles
          .filter(
            (file) =>
              file === normalizedDefaultPrefix ||
              file.startsWith(`${normalizedDefaultPrefix}/`),
          )
          .map((file) =>
            file === normalizedDefaultPrefix
              ? ""
              : file.slice(normalizedDefaultPrefix.length + 1),
          );
      }

      return allFiles;
    } catch (err) {
      throw handleFsError(err, "listBlobs", this.rootDir);
    }
  }
}
