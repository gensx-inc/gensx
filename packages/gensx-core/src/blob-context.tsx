/** @jsxRuntime automatic */
/** @jsxImportSource @gensx/core */
import { Readable } from "stream";

import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type S3ServiceException,
} from "@aws-sdk/client-s3";

import { Component } from "./component.js";
import { createContext, useContext } from "./context.js";

/**
 * Interface for a typed blob object
 */
export interface Blob<T = unknown> {
  /**
   * Get the blob's content
   * @returns The blob content or null if it doesn't exist
   */
  get(): Promise<T | null>;

  /**
   * Store data to the blob
   * @param value The data to store
   */
  put(value: T): Promise<void>;

  /**
   * Delete the blob
   */
  delete(): Promise<void>;

  /**
   * Check if the blob exists
   */
  exists(): Promise<boolean>;

  /**
   * Get metadata associated with the blob
   */
  getMetadata(): Promise<Record<string, string> | null>;

  /**
   * Store data with associated metadata
   */
  putWithMetadata(value: T, metadata: Record<string, string>): Promise<void>;
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
 * Base provider props
 */
interface BaseBlobProviderProps {
  /**
   * Storage kind
   */
  kind: "filesystem" | "cloud";

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
   * AWS region
   */
  region?: string;

  /**
   * S3 bucket name
   */
  bucket?: string;
}

/**
 * Union type for blob provider props
 */
export type BlobProviderProps =
  | FilesystemBlobProviderProps
  | CloudBlobProviderProps;

/**
 * Create the blob storage context
 */
export const BlobContext = createContext<BlobStorage | null>(null);

/**
 * Filesystem implementation of blob storage
 */
class FilesystemBlobStorage implements BlobStorage {
  constructor(
    private rootDir: string,
    private defaultPrefix?: string,
  ) {
    // Ensure rootDir exists
    void this.ensureRootDir();
  }

  private async ensureRootDir(): Promise<void> {
    try {
      await fs.mkdir(this.rootDir, { recursive: true });
    } catch (err) {
      console.error(`Error creating root directory: ${String(err)}`);
    }
  }

  private getFullPath(key: string): string {
    // Apply default prefix if specified
    const prefixedKey = this.defaultPrefix
      ? `${this.defaultPrefix}/${key}`
      : key;
    return path.join(this.rootDir, prefixedKey);
  }

  getBlob<T>(key: string): Blob<T> {
    const fullPath = this.getFullPath(key);
    const metadataPath = `${fullPath}.metadata.json`;

    return {
      async get(): Promise<T | null> {
        try {
          const content = await fs.readFile(fullPath, "utf8");
          return JSON.parse(content) as T;
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            return null; // File doesn't exist
          }
          throw err;
        }
      },

      async put(value: T): Promise<void> {
        try {
          // Ensure directory exists
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          // Write the file
          await fs.writeFile(fullPath, JSON.stringify(value, null, 2), "utf8");
        } catch (err) {
          throw new Error(`Failed to write blob: ${String(err)}`);
        }
      },

      async delete(): Promise<void> {
        try {
          await fs.unlink(fullPath);
          // Delete metadata file if it exists
          try {
            await fs.unlink(metadataPath);
          } catch {
            // Ignore errors if metadata file doesn't exist
          }
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            throw err;
          }
        }
      },

      async exists(): Promise<boolean> {
        try {
          await fs.access(fullPath);
          return true;
        } catch {
          return false;
        }
      },

      async getMetadata(): Promise<Record<string, string> | null> {
        try {
          const content = await fs.readFile(metadataPath, "utf8");
          return JSON.parse(content) as Record<string, string>;
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            return null; // Metadata file doesn't exist
          }
          throw err;
        }
      },

      async putWithMetadata(
        value: T,
        metadata: Record<string, string>,
      ): Promise<void> {
        try {
          // Ensure directory exists
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          // Write the data file
          await fs.writeFile(fullPath, JSON.stringify(value, null, 2), "utf8");
          // Write the metadata file
          await fs.writeFile(
            metadataPath,
            JSON.stringify(metadata, null, 2),
            "utf8",
          );
        } catch (err) {
          throw new Error(`Failed to write blob with metadata: ${String(err)}`);
        }
      },
    };
  }

  async listBlobs(prefix?: string): Promise<string[]> {
    // Apply default prefix if specified
    const searchPrefix = this.defaultPrefix
      ? prefix
        ? `${this.defaultPrefix}/${prefix}`
        : this.defaultPrefix
      : (prefix ?? "");

    const searchPath = path.join(this.rootDir, searchPrefix);

    try {
      // Check if directory exists
      await fs.access(searchPath);

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
      if (this.defaultPrefix) {
        return allFiles.map((file) => {
          if (this.defaultPrefix && file.startsWith(`${this.defaultPrefix}/`)) {
            return file.slice(this.defaultPrefix.length + 1);
          }
          return file;
        });
      }

      return allFiles;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return []; // Directory doesn't exist
      }
      throw err;
    }
  }
}

/**
 * Helper function to convert stream to string
 */
const streamToString = (stream: Readable): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
  });

/**
 * Cloud storage implementation using AWS S3
 */
class CloudBlobStorage implements BlobStorage {
  private s3Client: S3Client;

  constructor(
    private region = "us-west-2",
    private bucket = "default-bucket",
    private defaultPrefix?: string,
  ) {
    this.s3Client = new S3Client({ region: this.region });
  }

  private getFullKey(key: string): string {
    // Apply default prefix if specified
    return this.defaultPrefix ? `${this.defaultPrefix}/${key}` : key;
  }

  getBlob<T>(key: string): Blob<T> {
    const fullKey = this.getFullKey(key);
    const s3Client = this.s3Client;
    const bucket = this.bucket;

    return {
      async get(): Promise<T | null> {
        try {
          const command = new GetObjectCommand({
            Bucket: bucket,
            Key: fullKey,
          });

          const response = await s3Client.send(command);
          if (!response.Body) {
            return null;
          }

          // Convert stream to string
          const bodyContents = await streamToString(
            response.Body as unknown as Readable,
          );
          return JSON.parse(bodyContents) as T;
        } catch (error) {
          // Handle not found error
          const err = error as S3ServiceException;
          if (err.name === "NoSuchKey") {
            return null;
          }
          throw error;
        }
      },

      async put(value: T): Promise<void> {
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: fullKey,
          Body: JSON.stringify(value),
          ContentType: "application/json",
        });

        await s3Client.send(command);
      },

      async delete(): Promise<void> {
        const command = new DeleteObjectCommand({
          Bucket: bucket,
          Key: fullKey,
        });

        await s3Client.send(command);
      },

      async exists(): Promise<boolean> {
        try {
          const command = new HeadObjectCommand({
            Bucket: bucket,
            Key: fullKey,
          });

          await s3Client.send(command);
          return true;
        } catch (error) {
          // If the error is because the object doesn't exist, return false
          const err = error as S3ServiceException;
          if (err.name === "NotFound" || err.name === "NoSuchKey") {
            return false;
          }
          throw error;
        }
      },

      async getMetadata(): Promise<Record<string, string> | null> {
        try {
          const command = new HeadObjectCommand({
            Bucket: bucket,
            Key: fullKey,
          });

          const response = await s3Client.send(command);

          if (response.Metadata) {
            return response.Metadata;
          }

          return null;
        } catch (error) {
          // If the error is because the object doesn't exist, return null
          const err = error as S3ServiceException;
          if (err.name === "NotFound" || err.name === "NoSuchKey") {
            return null;
          }
          throw error;
        }
      },

      async putWithMetadata(
        value: T,
        metadata: Record<string, string>,
      ): Promise<void> {
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: fullKey,
          Body: JSON.stringify(value),
          ContentType: "application/json",
          Metadata: metadata,
        });

        await s3Client.send(command);
      },
    };
  }

  async listBlobs(prefix?: string): Promise<string[]> {
    // Apply default prefix if specified
    const searchPrefix = this.defaultPrefix
      ? prefix
        ? `${this.defaultPrefix}/${prefix}`
        : this.defaultPrefix
      : (prefix ?? "");

    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: searchPrefix,
    });

    const response = await this.s3Client.send(command);

    // Extract keys from the response
    const keys = (response.Contents ?? [])
      .map((item) => item.Key ?? "")
      .filter((key) => key !== "");

    // Remove default prefix from results if it exists
    if (this.defaultPrefix) {
      return keys
        .filter((key) => key.startsWith(`${this.defaultPrefix}/`))
        .map((key) => key.slice((this.defaultPrefix?.length ?? 0) + 1));
    }

    return keys;
  }
}

/**
 * BlobProvider component that provides blob storage to its children
 */
export const BlobProvider = Component<BlobProviderProps, never>(
  "BlobProvider",
  (props) => {
    // Create the appropriate storage implementation based on kind
    let storage: BlobStorage;

    if (props.kind === "filesystem") {
      const { rootDir = process.cwd(), defaultPrefix } = props;
      storage = new FilesystemBlobStorage(rootDir, defaultPrefix);
    } else {
      // Must be cloud based on our type definitions
      const { region, bucket, defaultPrefix } = props;
      storage = new CloudBlobStorage(region, bucket, defaultPrefix);
    }

    return <BlobContext.Provider value={storage} />;
  },
);

/**
 * Hook to access a blob
 * @param key The key of the blob to access
 * @returns A blob object for the given key
 */
export function useBlob<T = unknown>(key: string): Blob<T> {
  const storage = useContext(BlobContext);

  if (!storage) {
    throw new Error("useBlob must be used within a BlobProvider");
  }

  return storage.getBlob<T>(key);
}
