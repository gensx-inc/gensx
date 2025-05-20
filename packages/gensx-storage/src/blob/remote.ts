/* eslint-disable @typescript-eslint/only-throw-error */

import { Readable } from "stream";

import { readConfig } from "@gensx/core";

import { USER_AGENT } from "../utils/user-agent.js";
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
async function handleApiError(errorOrResponse: unknown, operation: string): Promise<never> {
  if (errorOrResponse instanceof BlobError) {
    throw errorOrResponse;
  }

  if (errorOrResponse instanceof Response) {
    const response = errorOrResponse;
    let detailedMessage = response.statusText; // Default message

    try {
      const errorBody = await response.clone().json();
      if (typeof errorBody.error === 'string' && errorBody.error.trim() !== '') {
        detailedMessage = errorBody.error;
      } else {
        // Fallback to full text if errorBody.error is not useful
        const textResponse = await response.clone().text();
        if (textResponse.trim() !== '') {
          detailedMessage = textResponse;
        }
      }
    } catch (e) {
      // JSON parsing failed or error field not present/useful.
      // Try to get text from a new clone if the first attempt (within the else) wasn't made or failed.
      if (detailedMessage === response.statusText) { // Only try .text() if JSON didn't yield a better message
          try {
              const textResponse = await response.clone().text();
              if (textResponse.trim() !== '') {
                  detailedMessage = textResponse;
              }
          } catch (textEx) {
              // console.warn(`Failed to get text from response body for ${operation}: ${textEx}`);
          }
      }
    }
    throw new BlobInternalError(`Failed to ${operation}: ${detailedMessage} (Status: ${response.status})`);
  }

  if (errorOrResponse instanceof Error) {
    throw new BlobNetworkError(`Network error during ${operation}: ${errorOrResponse.message}`, errorOrResponse);
  }

  throw new BlobNetworkError(`Unknown error during ${operation}: ${String(errorOrResponse)}`);
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
        await handleApiError(response, "get JSON blob");
      }

      const data = (await response.json()) as BlobResponse<string>;

      // Parse the content as JSON since it's stored as a string
      return JSON.parse(data.content) as T;
    } catch (err) {
      await handleApiError(err, "getJSON");
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
        await handleApiError(response, "get string blob");
      }

      const data = (await response.json()) as BlobResponse<string>;

      return data.content;
    } catch (err) {
      await handleApiError(err, "getString");
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
        await handleApiError(response, "get raw blob");
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
      await handleApiError(err, "getRaw");
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
        await handleApiError(response, "get blob stream");
      }

      if (!response.body) {
        // This specific check can remain as it's not directly an API error but a missing body.
        // However, a non-ok response would be caught by the above.
        // If response.ok is true but body is null, this is an internal issue.
        throw new BlobInternalError("Response body is null when getting stream");
      }

      return Readable.from(response.body);
    } catch (err) {
      await handleApiError(err, "getStream");
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
          // Specific error for 412, message can be more generic or use handleApiError if we want consistent format
          throw new BlobConflictError(`Failed to put JSON blob: ETag mismatch (Status: ${response.status})`);
        }
        await handleApiError(response, "put JSON blob");
      }

      const etag = response.headers.get("etag");
      if (!etag) {
        // This is a scenario where the server response is not as expected, even if status is 2xx
        throw new BlobInternalError("No ETag returned from server after putting JSON blob");
      }

      return { etag };
    } catch (err) {
      await handleApiError(err, "putJSON");
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
          throw new BlobConflictError(`Failed to put string blob: ETag mismatch (Status: ${response.status})`);
        }
        await handleApiError(response, "put string blob");
      }

      const etag = response.headers.get("etag");
      if (!etag) {
        throw new BlobInternalError("No ETag returned from server after putting string blob");
      }

      return { etag };
    } catch (err) {
      await handleApiError(err, "putString");
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
          throw new BlobConflictError(`Failed to put raw blob: ETag mismatch (Status: ${response.status})`);
        }
        await handleApiError(response, "put raw blob");
      }

      const etag = response.headers.get("etag");
      if (!etag) {
        throw new BlobInternalError("No ETag returned from server after putting raw blob");
      }

      return { etag };
    } catch (err) {
      await handleApiError(err, "putRaw");
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
          throw new BlobConflictError(`Failed to put blob stream: ETag mismatch (Status: ${response.status})`);
        }
        await handleApiError(response, "put blob stream");
      }

      const etag = response.headers.get("etag");
      if (!etag) {
        throw new BlobInternalError("No ETag returned from server after putting blob stream");
      }

      return { etag };
    } catch (err) {
      await handleApiError(err, "putStream");
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

      if (!response.ok && response.status !== 404) { // 404 is not an error for delete
        await handleApiError(response, "delete blob");
      }
    } catch (err) {
      await handleApiError(err, "delete");
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

      // For exists, a non-ok response (like 404) means it doesn't exist, not an error.
      // Any other non-ok response could be an issue.
      if (!response.ok && response.status !== 404) {
         await handleApiError(response, "check blob existence");
      }
      return response.ok; // True if 2xx, false if 404 or other non-2xx where fetch itself didn't throw
    } catch (err) {
      // Network errors or other unexpected issues from fetch itself
      await handleApiError(err, "exists");
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
        await handleApiError(response, "get blob metadata");
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
      await handleApiError(err, "getMetadata");
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
          throw new BlobConflictError(`Failed to update metadata: ETag mismatch (Status: ${response.status})`);
        }
        await handleApiError(response, "update blob metadata");
      }
    } catch (err) {
      await handleApiError(err, "updateMetadata");
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
        await handleApiError(response, "list blobs");
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
      // Errors from fetch itself or if handleApiError re-throws a BlobError
      await handleApiError(err, "list blobs");
    }
  }

  async blobExists(key: string): Promise<boolean> {
    const blob = this.getBlob(key);
    return blob.exists();
  }

  async deleteBlob(key: string): Promise<DeleteBlobResult> {
    try {
      const blob = this.getBlob(key);
      await blob.delete(); // RemoteBlob.delete() already uses handleApiError
      return { deleted: true };
    } catch (err) {
      // Catch errors from blob.delete() or getBlob() if it could throw BlobError directly
      await handleApiError(err, "deleteBlob");
    }
  }
}
