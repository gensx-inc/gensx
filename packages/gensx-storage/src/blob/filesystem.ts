/* eslint-disable @typescript-eslint/only-throw-error */

import * as crypto from "node:crypto";
import * as fss from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Readable } from "node:stream";

import {
  Blob,
  BlobError,
  BlobErrorCode,
  BlobOptions,
  BlobResponse,
  BlobStorage,
} from "./types.js";

/**
 * Helper to convert between filesystem errors and BlobErrors
 */
function handleFsError(err: unknown, operation: string, path: string): never {
  if (err instanceof Error) {
    const nodeErr = err as NodeJS.ErrnoException;

    if (nodeErr.code === "ENOENT") {
      throw new BlobError(
        BlobErrorCode.NOT_FOUND,
        `Blob not found at path: ${path}`,
        err,
      );
    } else if (nodeErr.code === "EACCES") {
      throw new BlobError(
        BlobErrorCode.PERMISSION_DENIED,
        `Permission denied for operation ${operation} on path: ${path}`,
        err,
      );
    } else if (nodeErr.code === "EEXIST") {
      throw new BlobError(
        BlobErrorCode.CONFLICT,
        `File already exists at path: ${path}`,
        err,
      );
    }
  }

  // Default error case
  throw new BlobError(
    BlobErrorCode.INTERNAL_ERROR,
    `Error during ${operation}: ${String(err)}`,
    err as Error,
  );
}

/**
 * Calculate an MD5 hash of the content
 */
function calculateEtag(content: string | Buffer): string {
  return crypto.createHash("md5").update(content).digest("hex");
}

/**
 * Generate a unique filename for metadata
 */
function getMetadataPath(filePath: string): string {
  return `${filePath}.metadata.json`;
}

/**
 * Implementation of Blob interface for filesystem storage
 */
class FilesystemBlob<T> implements Blob<T> {
  private filePath: string;
  private metadataPath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.metadataPath = getMetadataPath(filePath);
  }

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

  async getBinary(): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw handleFsError(err, "getBinary", this.filePath);
    }
  }

  async getRaw(): Promise<BlobResponse<Buffer | string> | null> {
    try {
      const content = await fs.readFile(this.filePath);
      const stats = await fs.stat(this.filePath);
      const metadata = await this.getMetadata();
      const contentType = metadata?.contentType ?? "application/octet-stream";

      const etag = calculateEtag(content);

      // Determine if content should be returned as string or buffer
      const data: Buffer | string =
        contentType.startsWith("text/") || contentType.includes("json")
          ? content.toString("utf8")
          : content;

      return {
        data,
        etag,
        lastModified: stats.mtime,
        size: stats.size,
        contentType,
        metadata: metadata ?? undefined,
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw handleFsError(err, "getRaw", this.filePath);
    }
  }

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
            throw new BlobError(
              BlobErrorCode.CONFLICT,
              `ETag mismatch: expected ${options.etag} but found ${existingEtag}`,
            );
          }
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            throw handleFsError(err, "putJSON:etag-check", this.filePath);
          }
        }
      }

      await fs.writeFile(this.filePath, content, "utf8");

      if (options?.contentType) {
        const metadata = (await this.getMetadata()) ?? {};
        metadata.contentType = options.contentType;
        await this.updateMetadata(metadata);
      }

      return { etag: newEtag };
    } catch (err) {
      throw handleFsError(err, "putJSON", this.filePath);
    }
  }

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
            throw new BlobError(
              BlobErrorCode.CONFLICT,
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

      if (options?.contentType) {
        const metadata = (await this.getMetadata()) ?? {};
        metadata.contentType = options.contentType;
        await this.updateMetadata(metadata);
      }

      return { etag: newEtag };
    } catch (err) {
      throw handleFsError(err, "putString", this.filePath);
    }
  }

  async putBinary(
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
            throw new BlobError(
              BlobErrorCode.CONFLICT,
              `ETag mismatch: expected ${options.etag} but found ${existingEtag}`,
            );
          }
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            throw handleFsError(err, "putBinary:etag-check", this.filePath);
          }
        }
      }

      await fs.writeFile(this.filePath, value);

      if (options?.contentType) {
        const metadata = (await this.getMetadata()) ?? {};
        metadata.contentType = options.contentType;
        await this.updateMetadata(metadata);
      }

      return { etag: newEtag };
    } catch (err) {
      throw handleFsError(err, "putBinary", this.filePath);
    }
  }

  async putRaw(
    value: BlobResponse<Buffer | string>,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });

      // Convert string data to buffer if needed
      const content =
        typeof value.data === "string"
          ? Buffer.from(value.data, "utf8")
          : value.data;

      const newEtag = calculateEtag(content);

      if (options?.etag) {
        try {
          const existingContent = await fs.readFile(this.filePath);
          const existingEtag = calculateEtag(existingContent);

          if (existingEtag !== options.etag) {
            throw new BlobError(
              BlobErrorCode.CONFLICT,
              `ETag mismatch: expected ${options.etag} but found ${existingEtag}`,
            );
          }
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            throw handleFsError(err, "putRaw:etag-check", this.filePath);
          }
        }
      }

      await fs.writeFile(this.filePath, content);

      // Store metadata if present
      if (value.metadata) {
        await this.updateMetadata(value.metadata);
      }

      // Store content type if present
      if (value.contentType) {
        const metadata = (await this.getMetadata()) ?? {};
        metadata.contentType = value.contentType;
        await this.updateMetadata(metadata);
      }

      return { etag: newEtag };
    } catch (err) {
      throw handleFsError(err, "putRaw", this.filePath);
    }
  }

  async putJSONWithMetadata(
    value: T,
    metadata: Record<string, string>,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      const result = await this.putJSON(value, options);
      await this.updateMetadata(metadata);
      return result;
    } catch (err) {
      throw handleFsError(err, "putJSONWithMetadata", this.filePath);
    }
  }

  async putStringWithMetadata(
    value: string,
    metadata: Record<string, string>,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      const result = await this.putString(value, options);
      await this.updateMetadata(metadata);
      return result;
    } catch (err) {
      throw handleFsError(err, "putStringWithMetadata", this.filePath);
    }
  }

  async putBinaryWithMetadata(
    value: Buffer,
    metadata: Record<string, string>,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      const result = await this.putBinary(value, options);
      await this.updateMetadata(metadata);
      return result;
    } catch (err) {
      throw handleFsError(err, "putBinaryWithMetadata", this.filePath);
    }
  }

  async putRawWithMetadata(
    value: Buffer | string,
    metadata: Record<string, string>,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });

      // Convert string data to buffer if needed
      const content =
        typeof value === "string" ? Buffer.from(value, "utf8") : value;

      const newEtag = calculateEtag(content);

      if (options?.etag) {
        try {
          const existingContent = await fs.readFile(this.filePath);
          const existingEtag = calculateEtag(existingContent);

          if (existingEtag !== options.etag) {
            throw new BlobError(
              BlobErrorCode.CONFLICT,
              `ETag mismatch: expected ${options.etag} but found ${existingEtag}`,
            );
          }
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            throw handleFsError(
              err,
              "putRawWithMetadata:etag-check",
              this.filePath,
            );
          }
        }
      }

      await fs.writeFile(this.filePath, content);

      // Store metadata
      await this.updateMetadata(metadata);

      // Store content type if specified
      if (options?.contentType) {
        const currentMetadata = (await this.getMetadata()) ?? {};
        currentMetadata.contentType = options.contentType;
        await this.updateMetadata(currentMetadata);
      }

      return { etag: newEtag };
    } catch (err) {
      throw handleFsError(err, "putRawWithMetadata", this.filePath);
    }
  }

  async get(): Promise<BlobResponse<T> | null> {
    try {
      const content = await fs.readFile(this.filePath, "utf8");
      const stats = await fs.stat(this.filePath);
      const metadata = await this.getMetadata();

      const etag = calculateEtag(content);

      return {
        data: JSON.parse(content) as T,
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

  async getStream(): Promise<Readable> {
    try {
      // Check if file exists first
      try {
        await fs.access(this.filePath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          throw new BlobError(
            BlobErrorCode.NOT_FOUND,
            `Blob not found at path: ${this.filePath}`,
          );
        }
        throw err;
      }

      // Create and return readable stream
      return fss.createReadStream(this.filePath);
    } catch (err) {
      throw handleFsError(err, "getStream", this.filePath);
    }
  }

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

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(): Promise<Record<string, string> | null> {
    try {
      const content = await fs.readFile(this.metadataPath, "utf8");
      return JSON.parse(content) as Record<string, string>;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null; // Metadata file doesn't exist
      }
      throw handleFsError(err, "getMetadata", this.metadataPath);
    }
  }

  async updateMetadata(metadata: Record<string, string>): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.metadataPath), { recursive: true });
      await fs.writeFile(this.metadataPath, JSON.stringify(metadata), "utf8");
    } catch (err) {
      throw handleFsError(err, "updateMetadata", this.metadataPath);
    }
  }

  async putStream(
    stream: Readable,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });

      // Create write stream
      const writeStream = fss.createWriteStream(this.filePath);
      const chunks: Buffer[] = [];

      // Collect chunks and write to file
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk as ArrayBufferLike));
        writeStream.write(chunk);
      }

      // Wait for write to complete
      await new Promise<void>((resolve, reject) => {
        writeStream.end((err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Calculate etag from all chunks
      const buffer = Buffer.concat(chunks);
      const etag = calculateEtag(buffer);

      if (options?.contentType) {
        const metadata = (await this.getMetadata()) ?? {};
        metadata.contentType = options.contentType;
        await this.updateMetadata(metadata);
      }

      return { etag };
    } catch (err) {
      throw handleFsError(err, "putStream", this.filePath);
    }
  }
}

/**
 * Filesystem implementation of blob storage
 */
export class FilesystemBlobStorage implements BlobStorage {
  constructor(
    private rootDir: string,
    private defaultPrefix?: string,
  ) {
    // Ensure rootDir exists on instantiation
    void this.ensureRootDir();
  }

  private async ensureRootDir(): Promise<void> {
    try {
      await fs.mkdir(this.rootDir, { recursive: true });
    } catch (err) {
      throw handleFsError(err, "ensureRootDir", this.rootDir);
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
    return new FilesystemBlob<T>(this.getFullPath(key));
  }

  async listBlobs(prefix?: string): Promise<string[]> {
    try {
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
      throw handleFsError(err, "listBlobs", this.rootDir);
    }
  }

  async isReady(): Promise<boolean> {
    try {
      await this.ensureRootDir();
      return true;
    } catch {
      return false;
    }
  }
}
