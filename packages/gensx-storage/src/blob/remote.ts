/* eslint-disable @typescript-eslint/only-throw-error */

import { Readable } from "stream";

import { readConfig } from "@gensx/core";

import {
  APIResponse,
  Blob,
  BlobError,
  BlobErrorCode,
  BlobOptions,
  BlobResponse,
  BlobStorage,
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
    throw new BlobError(
      BlobErrorCode.NETWORK_ERROR,
      `Error during ${operation}: ${err.message}`,
      err,
    );
  }
  throw new BlobError(
    BlobErrorCode.NETWORK_ERROR,
    `Error during ${operation}: ${String(err)}`,
  );
}

/**
 * Implementation of Blob interface for remote cloud storage
 */
export class RemoteBlob<T> implements Blob<T> {
  private key: string;
  private baseUrl: string;
  private apiKey: string;
  private org: string;

  constructor(key: string, baseUrl: string, apiKey: string, org: string) {
    this.key = key;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.org = org;
  }

  async getJSON(): Promise<T | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/blob/${this.key}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to get blob: ${response.statusText}`,
        );
      }

      const apiResponse = (await response.json()) as APIResponse<
        BlobResponse<T>
      >;

      if (apiResponse.status === "error") {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        return null;
      }

      return apiResponse.data.content;
    } catch (err) {
      throw handleApiError(err, "getJSON");
    }
  }

  async getString(): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/blob/${this.key}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to get blob: ${response.statusText}`,
        );
      }

      const apiResponse = (await response.json()) as APIResponse<
        BlobResponse<string>
      >;

      if (apiResponse.status === "error") {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      if (!apiResponse.data) {
        return null;
      }

      return apiResponse.data.content;
    } catch (err) {
      throw handleApiError(err, "getString");
    }
  }

  async getRaw(): Promise<BlobResponse<Buffer> | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/blob/${this.key}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to get blob: ${response.statusText}`,
        );
      }

      const apiResponse = (await response.json()) as APIResponse<{
        content: string;
        contentType?: string;
        etag?: string;
        lastModified?: string;
        size?: number;
        metadata?: Record<string, string>;
      }>;

      if (apiResponse.status === "error" || !apiResponse.data) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `API error: ${apiResponse.error ?? "Unknown error"}`,
        );
      }

      const {
        content,
        contentType,
        etag,
        lastModified,
        size,
        metadata = {},
      } = apiResponse.data;

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
        `${this.baseUrl}/org/${this.org}/blob/${this.key}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to get blob: ${response.statusText}`,
        );
      }

      if (!response.body) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          "Response body is null",
        );
      }

      return Readable.from(response.body);
    } catch (err) {
      throw handleApiError(err, "getStream");
    }
  }

  async putJSON(value: T, options?: BlobOptions): Promise<{ etag: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/blob/${this.key}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...(options?.etag && { "If-Match": options.etag }),
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
          throw new BlobError(BlobErrorCode.CONFLICT, "ETag mismatch");
        }
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to put blob: ${response.statusText}`,
        );
      }

      const etag = response.headers.get("etag");
      if (!etag) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          "No ETag returned from server",
        );
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
        `${this.baseUrl}/org/${this.org}/blob/${this.key}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...(options?.etag && { "If-Match": options.etag }),
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
          throw new BlobError(BlobErrorCode.CONFLICT, "ETag mismatch");
        }
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to put blob: ${response.statusText}`,
        );
      }

      const etag = response.headers.get("etag");
      if (!etag) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          "No ETag returned from server",
        );
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
    options?: {
      contentType?: string;
      metadata?: Record<string, string>;
      etag?: string;
    },
  ): Promise<{ etag: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/blob/${this.key}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...(options?.etag && { "If-Match": options.etag }),
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
          throw new BlobError(BlobErrorCode.CONFLICT, "ETag mismatch");
        }
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to put blob: ${response.statusText}`,
        );
      }

      const etag = response.headers.get("etag");
      if (!etag) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          "No ETag returned from server",
        );
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
        `${this.baseUrl}/org/${this.org}/blob/${this.key}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...(options?.etag && { "If-Match": options.etag }),
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
          throw new BlobError(BlobErrorCode.CONFLICT, "ETag mismatch");
        }
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to put blob: ${response.statusText}`,
        );
      }

      const etag = response.headers.get("etag");
      if (!etag) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          "No ETag returned from server",
        );
      }

      return { etag };
    } catch (err) {
      throw handleApiError(err, "putStream");
    }
  }

  async delete(options?: { etag?: string }): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/blob/${this.key}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            ...(options?.etag && { "If-Match": options.etag }),
          },
        },
      );

      if (!response.ok && response.status !== 404) {
        if (response.status === 412) {
          throw new BlobError(BlobErrorCode.CONFLICT, "ETag mismatch");
        }
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to delete blob: ${response.statusText}`,
        );
      }
    } catch (err) {
      throw handleApiError(err, "delete");
    }
  }

  async exists(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/blob/${this.key}`,
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
        `${this.baseUrl}/org/${this.org}/blob/${this.key}`,
        {
          method: "HEAD",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to get metadata: ${response.statusText}`,
        );
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
    options?: { etag?: string },
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/org/${this.org}/blob/${this.key}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...(options?.etag && { "If-Match": options.etag }),
          },
          body: JSON.stringify({
            metadata,
          }),
        },
      );

      if (!response.ok) {
        if (response.status === 412) {
          throw new BlobError(BlobErrorCode.CONFLICT, "ETag mismatch");
        }
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to update metadata: ${response.statusText}`,
        );
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

  constructor(
    private defaultPrefix?: string,
    organizationId?: string,
  ) {
    // readConfig has internal error handling and always returns a GensxConfig object
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const config = readConfig();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    this.apiKey = process.env.GENSX_API_KEY ?? config.api?.token ?? "";
    if (!this.apiKey) {
      throw new Error(
        "GENSX_API_KEY environment variable must be set for cloud storage",
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    this.org = organizationId ?? process.env.GENSX_ORG ?? config.api?.org ?? "";
    if (!this.org) {
      throw new Error(
        "Organization ID must be provided via props or GENSX_ORG environment variable",
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.apiBaseUrl =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      process.env.GENSX_API_BASE_URL ?? config.api?.baseUrl ?? API_BASE_URL;
  }

  getBlob<T>(key: string): Blob<T> {
    return new RemoteBlob<T>(key, this.apiBaseUrl, this.apiKey, this.org);
  }

  async listBlobs(prefix?: string): Promise<string[]> {
    try {
      // Apply default prefix if specified
      const searchPrefix = this.defaultPrefix
        ? prefix
          ? `${this.defaultPrefix}/${prefix}`
          : this.defaultPrefix
        : (prefix ?? "");

      const response = await fetch(
        `${this.apiBaseUrl}/org/${this.org}/blob?prefix=${encodeURIComponent(searchPrefix)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        handleApiError(response, "listBlobs");
      }

      const data = (await response.json()) as { keys: string[] };
      const keys = data.keys;

      // Remove default prefix from results if it exists
      if (this.defaultPrefix) {
        return keys
          .filter((key) => key.startsWith(`${this.defaultPrefix}/`))
          .map((key) => key.slice((this.defaultPrefix?.length ?? 0) + 1));
      }

      return keys;
    } catch (err) {
      if (err instanceof BlobError) {
        throw err;
      }
      throw new BlobError(
        BlobErrorCode.NETWORK_ERROR,
        `Error during listBlobs operation: ${String(err)}`,
        err as Error,
      );
    }
  }
}
