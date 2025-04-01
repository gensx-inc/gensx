/* eslint-disable @typescript-eslint/only-throw-error */

/* eslint-disable @typescript-eslint/no-unsafe-argument */
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

  constructor(key: string, baseUrl: string, apiKey: string) {
    this.key = key;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async getJSON(): Promise<T | null> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to get blob: ${response.statusText}`,
        );
      }

      const data = await response.json();
      return data as T;
    } catch (err) {
      throw handleApiError(err, "getJSON");
    }
  }

  async getString(): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to get blob: ${response.statusText}`,
        );
      }

      return await response.text();
    } catch (err) {
      throw handleApiError(err, "getString");
    }
  }

  async getBinary(): Promise<Buffer | null> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to get blob: ${response.statusText}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      throw handleApiError(err, "getBinary");
    }
  }

  async getRaw(): Promise<BlobResponse<Buffer | string> | null> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to get blob: ${response.statusText}`,
        );
      }

      const contentType = response.headers.get("content-type") ?? undefined;
      let data: Buffer | string;

      if (contentType?.startsWith("text/") || contentType?.includes("json")) {
        data = await response.text();
      } else {
        const arrayBuffer = await response.arrayBuffer();
        data = Buffer.from(arrayBuffer);
      }

      const etag = response.headers.get("etag") ?? undefined;
      const lastModified = response.headers.get("last-modified")
        ? new Date(response.headers.get("last-modified")!)
        : undefined;
      const size = response.headers.get("content-length")
        ? parseInt(response.headers.get("content-length")!, 10)
        : undefined;
      const metadata = response.headers.get("x-blob-metadata")
        ? (JSON.parse(response.headers.get("x-blob-metadata")!) as Record<
            string,
            string
          >)
        : undefined;

      return {
        data,
        etag,
        lastModified,
        size,
        contentType,
        metadata,
      };
    } catch (err) {
      throw handleApiError(err, "getRaw");
    }
  }

  async getStream(): Promise<Readable> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

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
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...(options?.etag && { "If-Match": options.etag }),
          ...(options?.metadata && {
            "x-blob-metadata": JSON.stringify(options.metadata),
          }),
        },
        body: JSON.stringify(value),
      });

      if (!response.ok) {
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
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "text/plain",
          ...(options?.etag && { "If-Match": options.etag }),
          ...(options?.metadata && {
            "x-blob-metadata": JSON.stringify(options.metadata),
          }),
        },
        body: value,
      });

      if (!response.ok) {
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

  async putBinary(
    value: Buffer,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/octet-stream",
          ...(options?.etag && { "If-Match": options.etag }),
          ...(options?.metadata && {
            "x-blob-metadata": JSON.stringify(options.metadata),
          }),
        },
        body: value,
      });

      if (!response.ok) {
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
      throw handleApiError(err, "putBinary");
    }
  }

  async putRaw(
    value: BlobResponse<Buffer | string>,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": value.contentType ?? "application/octet-stream",
          ...(options?.etag && { "If-Match": options.etag }),
          ...(options?.metadata && {
            "x-blob-metadata": JSON.stringify(options.metadata),
          }),
        },
        body: value.data,
      });

      if (!response.ok) {
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
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/octet-stream",
          ...(options?.etag && { "If-Match": options.etag }),
          ...(options?.metadata && {
            "x-blob-metadata": JSON.stringify(options.metadata),
          }),
        },
        body: buffer,
      });

      if (!response.ok) {
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

  async delete(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok && response.status !== 404) {
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
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        method: "HEAD",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return response.ok;
    } catch (err) {
      throw handleApiError(err, "exists");
    }
  }

  async getMetadata(): Promise<Record<string, string> | null> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        method: "HEAD",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to get metadata: ${response.statusText}`,
        );
      }

      const metadataHeader = response.headers.get("x-blob-metadata");
      if (!metadataHeader) {
        return null;
      }

      return JSON.parse(metadataHeader) as Record<string, string>;
    } catch (err) {
      throw handleApiError(err, "getMetadata");
    }
  }

  async updateMetadata(metadata: Record<string, string>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "x-blob-metadata": JSON.stringify(metadata),
        },
      });

      if (!response.ok) {
        throw new BlobError(
          BlobErrorCode.INTERNAL_ERROR,
          `Failed to update metadata: ${response.statusText}`,
        );
      }
    } catch (err) {
      throw handleApiError(err, "updateMetadata");
    }
  }

  async putJSONWithMetadata(
    value: T,
    metadata: Record<string, string>,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "x-blob-metadata": JSON.stringify(metadata),
          ...(options?.etag && { "If-Match": options.etag }),
        },
        body: JSON.stringify(value),
      });

      if (!response.ok) {
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
      throw handleApiError(err, "putJSONWithMetadata");
    }
  }

  async putStringWithMetadata(
    value: string,
    metadata: Record<string, string>,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "text/plain",
          "x-blob-metadata": JSON.stringify(metadata),
          ...(options?.etag && { "If-Match": options.etag }),
        },
        body: value,
      });

      if (!response.ok) {
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
      throw handleApiError(err, "putStringWithMetadata");
    }
  }

  async putBinaryWithMetadata(
    value: Buffer,
    metadata: Record<string, string>,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/octet-stream",
          "x-blob-metadata": JSON.stringify(metadata),
          ...(options?.etag && { "If-Match": options.etag }),
        },
        body: value,
      });

      if (!response.ok) {
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
      throw handleApiError(err, "putBinaryWithMetadata");
    }
  }

  async putRawWithMetadata(
    value: Buffer | string,
    metadata: Record<string, string>,
    options?: BlobOptions,
  ): Promise<{ etag: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/blobs/${this.key}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type":
            typeof value === "string"
              ? "text/plain"
              : "application/octet-stream",
          "x-blob-metadata": JSON.stringify(metadata),
          ...(options?.etag && { "If-Match": options.etag }),
        },
        body: value,
      });

      if (!response.ok) {
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
      throw handleApiError(err, "putRawWithMetadata");
    }
  }
}

/**
 * Remote implementation of blob storage using GenSX Console API
 */
export class RemoteBlobStorage implements BlobStorage {
  private apiKey: string;
  private apiBaseUrl: string;
  private orgId: string;

  constructor(
    private defaultPrefix?: string,
    organizationId?: string,
  ) {
    // Get API key from environment or throw
    this.apiKey = process.env.GENSX_API_KEY ?? "";
    if (!this.apiKey) {
      throw new Error(
        "GENSX_API_KEY environment variable must be set for cloud storage",
      );
    }

    // Get organization ID from environment, parameter, or throw
    this.orgId = organizationId ?? process.env.GENSX_ORG ?? "";
    if (!this.orgId) {
      throw new Error(
        "Organization ID must be provided via props or GENSX_ORG environment variable",
      );
    }

    // Use API base URL from environment or default
    this.apiBaseUrl = process.env.GENSX_API_BASE_URL ?? API_BASE_URL;
  }

  getBlob<T>(key: string): Blob<T> {
    return new RemoteBlob<T>(key, this.apiBaseUrl, this.apiKey);
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
        `${this.apiBaseUrl}/storage/blob/${this.orgId}/list?prefix=${encodeURIComponent(searchPrefix)}`,
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

  async isReady(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/storage/blob/${this.orgId}/status`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      return response.ok;
    } catch {
      return false;
    }
  }
}
