/* eslint-disable @typescript-eslint/only-throw-error */

import { Readable } from "stream";

import { readConfig } from "@gensx/core";

import { USER_AGENT } from "../utils/user-agent.js";
import { parseErrorResponse } from "../utils/parse-error.js";
import {
  Blob,
  BlobConflictError,
  BlobError,
  BlobInternalError,
  BlobNetworkError,
  BlobOptions,
  BlobResponse,
  BlobStorage,
  DeleteBlobResult,
  ListBlobsOptions,
  ListBlobsResponse,
} from "./types.js";
/**
 * Base URL for the GenSX Console API
 */
const API_BASE_URL = "https://api.gensx.com";

/**
 * Helper to convert between API errors and BlobErrors
 */
function handleApiError(err: unknown, operation: string): never {
  if (err instanceof BlobError) {
    throw err;
  }
  if (err instanceof Error) {
    throw new BlobNetworkError(
      `Error during ${operation}: ${err.message}`,
      err,
    );
  }
  throw new BlobNetworkError(`Error during ${operation}: ${String(err)}`);
}

/**
 * Implementation of Blob interface for remote cloud storage
 */
export class RemoteBlob<T> implements Blob<T> {
  private key: string;
  private baseUrl: string;
  private apiKey: string;
  private org: string;
  private project: string;
  private environment: string;

  constructor(
    key: string,
    baseUrl: string,
    apiKey: string,
    org: string,
    project: string,
    environment: string,
  ) {
    this.key = encodeURIComponent(key);
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.org = org;
    this.project = project;
    this.environment = environment;
  }

  async getJSON(): Promise<T | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/blob/${this.key}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "User-Agent": USER_AGENT,
          },
        },
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new BlobInternalError(`Failed to get blob: ${message}`);
      }

      const data = (await response.json()) as BlobResponse<string>;

      // Parse the content as JSON since it's stored as a string
      return JSON.parse(data.content) as T;
    } catch (err) {
      throw handleApiError(err, "getJSON");
    }
  }

  async getString(): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/blob/${this.key}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "User-Agent": USER_AGENT,
          },
        },
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new BlobInternalError(`Failed to get blob: ${message}`);
      }

      const data = (await response.json()) as BlobResponse<string>;

      return data.content;
    } catch (err) {
      throw handleApiError(err, "getString");
    }
  }

  async getRaw(): Promise<BlobResponse<Buffer> | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/blob/${this.key}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "User-Agent": USER_AGENT,
          },
        },
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new BlobInternalError(`Failed to get blob: ${message}`);
      }

      const data = (await response.json()) as {
        content: string;
        contentType?: string;
        etag?: string;
        lastModified?: string;
        size?: number;
        metadata?: Record<string, string>;
      };

      const {
        content,
        contentType,
        etag,
        lastModified,
        size,
        metadata = {},
      } = data;

      // Always decode base64 for raw data
      const buffer = Buffer.from(content, "base64");

      return {
        content: buffer,
        contentType,
        etag,
        lastModified: lastModified ? new Date(lastModified) : undefined,
        size,
        metadata: Object.fromEntries(
          Object.entries(metadata).filter(([key]) => key !== "isBase64"),
        ),
      };
    } catch (err) {
      throw handleApiError(err, "getRaw");
    }
  }

  async getStream(): Promise<Readable> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/blob/${this.key}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "User-Agent": USER_AGENT,
          },
        },
      );

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new BlobInternalError(`Failed to get blob: ${message}`);
      }

      if (!response.body) {
        throw new BlobInternalError("Response body is null");
      }

      return Readable.from(response.body);
    } catch (err) {
      throw handleApiError(err, "getStream");
    }
  }

  async putJSON(value: T, options?: BlobOptions): Promise<{ etag: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/blob/${this.key}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...(options?.etag && { "If-Match": options.etag }),
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify({
            content: JSON.stringify(value),
            contentType: "application/json",
            metadata: options?.metadata,
          }),
        },
      );

      if (!response.ok) {
        if (response.status === 412) {
          throw new BlobConflictError("ETag mismatch");
        }
        const message = await parseErrorResponse(response);
        throw new BlobInternalError(`Failed to put blob: ${message}`);
      }

      const etag = response.headers.get("etag");
      if (!etag) {
        throw new BlobInternalError("No ETag returned from server");
      }

      return { etag };
    } catch (err) {
      throw handleApiError(err, "putJSON");
    }
  }

  async putString(
    value: string,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/blob/${this.key}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...(options?.etag && { "If-Match": options.etag }),
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify({
            content: value,
            contentType: "text/plain",
            metadata: options?.metadata,
          }),
        },
      );

      if (!response.ok) {
        if (response.status === 412) {
          throw new BlobConflictError("ETag mismatch");
        }
        const message = await parseErrorResponse(response);
        throw new BlobInternalError(`Failed to put blob: ${message}`);
      }

      const etag = response.headers.get("etag");
      if (!etag) {
        throw new BlobInternalError("No ETag returned from server");
      }

      return { etag };
    } catch (err) {
      throw handleApiError(err, "putString");
    }
  }

  /**
   * Put raw binary data into the blob.
   * @param value The binary data to store
   * @param options Optional metadata and content type
   */
  async putRaw(
    value: Buffer,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/blob/${this.key}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...(options?.etag && { "If-Match": options.etag }),
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify({
            content: value.toString("base64"),
            contentType: options?.contentType ?? "application/octet-stream",
            metadata: {
              ...(options?.metadata ?? {}),
              isBase64: "true",
            },
          }),
        },
      );

      if (!response.ok) {
        if (response.status === 412) {
          throw new BlobConflictError("ETag mismatch");
        }
        const message = await parseErrorResponse(response);
        throw new BlobInternalError(`Failed to put blob: ${message}`);
      }

      const etag = response.headers.get("etag");
      if (!etag) {
        throw new BlobInternalError("No ETag returned from server");
      }

      return { etag };
    } catch (err) {
      throw handleApiError(err, "putRaw");
    }
  }

  async putStream(
    stream: Readable,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      // Convert stream to buffer - necessary for the current API implementation
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk as ArrayBufferLike));
      }
      const buffer = Buffer.concat(chunks);

      // Send the buffer as base64-encoded content
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/blob/${this.key}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...(options?.etag && { "If-Match": options.etag }),
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify({
            content: buffer.toString("base64"),
            contentType: options?.contentType ?? "application/octet-stream",
            metadata: {
              ...(options?.metadata ?? {}),
              isBase64: "true",
            },
          }),
        },
      );

      if (!response.ok) {
        if (response.status === 412) {
          throw new BlobConflictError("ETag mismatch");
        }
        const message = await parseErrorResponse(response);
        throw new BlobInternalError(`Failed to put blob: ${message}`);
      }

      const etag = response.headers.get("etag");
      if (!etag) {
        throw new BlobInternalError("No ETag returned from server");
      }

      return { etag };
    } catch (err) {
      throw handleApiError(err, "putStream");
    }
  }

  async delete(): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/blob/${this.key}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "User-Agent": USER_AGENT,
          },
        },
      );

      if (!response.ok && response.status !== 404) {
        const message = await parseErrorResponse(response);
        throw new BlobInternalError(`Failed to delete blob: ${message}`);
      }
    } catch (err) {
      throw handleApiError(err, "delete");
    }
  }

  async exists(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/blob/${this.key}`,
        {
          method: "HEAD",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      return response.ok;
    } catch (err) {
      throw handleApiError(err, "exists");
    }
  }

  async getMetadata(): Promise<Record<string, string> | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/blob/${this.key}`,
        {
          method: "HEAD",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "User-Agent": USER_AGENT,
          },
        },
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new BlobInternalError(`Failed to get metadata: ${message}`);
      }

      // Extract standard headers
      const metadata: Record<string, string> = {};

      // Get etag from standard headers
      const etag = response.headers.get("etag");
      if (etag) {
        metadata.etag = etag;
      }

      // Get custom metadata from individual x-blob-meta-* headers
      for (const [name, value] of Object.entries(
        Object.fromEntries(response.headers),
      )) {
        if (name.toLowerCase().startsWith("x-blob-meta-")) {
          const metaKey = name.substring("x-blob-meta-".length);
          if (metaKey === "content-type") {
            metadata.contentType = value;
          } else {
            metadata[metaKey] = value;
          }
        }
      }

      return Object.keys(metadata).length > 0 ? metadata : null;
    } catch (err) {
      throw handleApiError(err, "getMetadata");
    }
  }

  async updateMetadata(
    metadata: Record<string, string>,
    options?: BlobOptions,
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/blob/${this.key}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...(options?.etag && { "If-Match": options.etag }),
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify({
            metadata,
          }),
        },
      );

      if (!response.ok) {
        if (response.status === 412) {
          throw new BlobConflictError("ETag mismatch");
        }
        const message = await parseErrorResponse(response);
        throw new BlobInternalError(`Failed to update metadata: ${message}`);
      }
    } catch (err) {
      throw handleApiError(err, "updateMetadata");
    }
  }
}

/**
 * Remote implementation of blob storage using GenSX Console API
 */
export class RemoteBlobStorage implements BlobStorage {
  private apiKey: string;
  private apiBaseUrl: string;
  private org: string;
  private project: string;
  private environment: string;
  private defaultPrefix?: string;
  constructor(project: string, environment: string, defaultPrefix?: string) {
    this.project = project;
    this.environment = environment;
    this.defaultPrefix = defaultPrefix;
    // readConfig has internal error handling and always returns a GensxConfig object
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
        "Organization must be provided via props or GENSX_ORG environment variable",
      );
    }

    this.apiBaseUrl =
      process.env.GENSX_API_BASE_URL ?? config.api?.baseUrl ?? API_BASE_URL;
  }

  getBlob<T>(key: string): Blob<T> {
    const fullKey = this.defaultPrefix ? `${this.defaultPrefix}/${key}` : key;
    return new RemoteBlob<T>(
      fullKey,
      this.apiBaseUrl,
      this.apiKey,
      this.org,
      this.project,
      this.environment,
    );
  }

  async listBlobs(options?: ListBlobsOptions): Promise<ListBlobsResponse> {
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

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (searchPrefix) {
        queryParams.append("prefix", searchPrefix);
      }

      // Default to 100 documents if no limit is specified
      queryParams.append("limit", (options?.limit ?? 100).toString());

      if (options?.cursor) {
        queryParams.append("cursor", options.cursor);
      }

      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/projects/${this.project}/environments/${this.environment}/blob?${queryParams.toString()}`,
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
        throw new BlobInternalError(`Failed to list blobs: ${message}`);
      }

      const data = (await response.json()) as {
        blobs: { key: string; lastModified: string; size: number }[];
        nextCursor?: string;
      };

      // Process blob keys to handle the default prefix
      let processedBlobs: {
        key: string;
        lastModified: string;
        size: number;
      }[] = [];
      if (normalizedDefaultPrefix) {
        processedBlobs = data.blobs
          .filter(
            (blob) =>
              blob.key === normalizedDefaultPrefix ||
              blob.key.startsWith(`${normalizedDefaultPrefix}/`),
          )
          .map((blob) => ({
            ...blob,
            key:
              blob.key === normalizedDefaultPrefix
                ? ""
                : blob.key.slice(normalizedDefaultPrefix.length + 1),
          }));
      } else {
        processedBlobs = data.blobs;
      }

      return {
        blobs: processedBlobs,
        nextCursor: data.nextCursor,
      };
    } catch (err) {
      if (err instanceof BlobError) {
        throw err;
      }
      throw new BlobNetworkError(
        `Error during listBlobs operation: ${String(err)}`,
        err as Error,
      );
    }
  }

  async blobExists(key: string): Promise<boolean> {
    const blob = this.getBlob(key);
    return blob.exists();
  }

  async deleteBlob(key: string): Promise<DeleteBlobResult> {
    try {
      const blob = this.getBlob(key);
      await blob.delete();
      return { deleted: true };
    } catch (err) {
      if (err instanceof BlobError) {
        throw err;
      }
      throw new BlobNetworkError(
        `Error during deleteBlob operation: ${String(err)}`,
        err as Error,
      );
    }
  }
}
