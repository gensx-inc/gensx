/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Readable } from "node:stream";

import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import { RemoteBlobStorage } from "../src/blob/remote.js";
import { BlobError, BlobErrorCode } from "../src/index.js";

// Helper to create a clean test environment
async function createTempDir(): Promise<string> {
  const tempDir = path.join(
    os.tmpdir(),
    `gensx-storage-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  );
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

// Helper to clean up temporary test directories
async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (err) {
    console.warn(`Failed to clean up temp directory ${tempDir}:`, err);
  }
}

suite("RemoteBlobStorage", () => {
  // Save original environment
  const originalEnv = { ...process.env };
  let mockFetch: ReturnType<typeof vi.fn>;
  let tempDir: string;

  beforeEach(async () => {
    // Setup mock environment variables
    process.env.GENSX_API_KEY = "test-api-key";
    process.env.GENSX_ORG = "test-org";

    // Reset and setup fetch mock
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Create temp directory for any file operations
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    // Restore original environment
    process.env = { ...originalEnv };
    vi.clearAllMocks();

    // Clean up temp directory
    await cleanupTempDir(tempDir);
  });

  test("should initialize with environment variables", () => {
    expect(() => new RemoteBlobStorage()).not.toThrow();
  });

  test("should throw if API key is missing", () => {
    delete process.env.GENSX_API_KEY;
    expect(() => new RemoteBlobStorage()).toThrow("GENSX_API_KEY");
  });

  test("should throw if organization ID is missing", () => {
    delete process.env.GENSX_ORG;
    expect(() => new RemoteBlobStorage()).toThrow("Organization ID");
  });

  test("should get JSON from a blob", async () => {
    const storage = new RemoteBlobStorage();
    const mockData = { foo: "bar" };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: {
          content: mockData,
          etag: "mock-etag",
        },
      }),
    });

    const blob = storage.getBlob<typeof mockData>("test-key");
    const result = await blob.getJSON();

    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/blob/test-key",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should handle non-existent blobs", async () => {
    const storage = new RemoteBlobStorage();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const blob = storage.getBlob("non-existent");
    const result = await blob.getJSON();

    expect(result).toBeNull();
  });

  test("should put JSON to a blob", async () => {
    const storage = new RemoteBlobStorage();
    const data = { foo: "bar" };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (name: string) => (name === "etag" ? "mock-etag" : null),
      },
      body: JSON.stringify({
        content: JSON.stringify(data),
        contentType: "application/json",
        etag: "mock-etag",
      }),
    });

    const blob = storage.getBlob<typeof data>("test-key");
    const result = await blob.putJSON(data);

    expect(result.etag).toBe("mock-etag");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/blob/test-key",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    // Verify the body contains the serialized content
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      content: JSON.stringify(data),
      contentType: "application/json",
    });
  });

  test("should list blobs with prefix", async () => {
    const storage = new RemoteBlobStorage();
    const mockKeys = ["key1", "key2", "key3"];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ keys: mockKeys }),
    });

    const result = await storage.listBlobs("test-prefix");

    expect(result).toEqual(mockKeys);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/blob?prefix=test-prefix",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should delete a blob", async () => {
    const storage = new RemoteBlobStorage();

    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    const blob = storage.getBlob("test-key");
    await blob.delete();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/blob/test-key",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should check if a blob exists", async () => {
    const storage = new RemoteBlobStorage();

    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    const blob = storage.getBlob("exists-key");
    const exists = await blob.exists();

    expect(exists).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/blob/exists-key",
      expect.objectContaining({
        method: "HEAD",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should put string to a blob", async () => {
    const storage = new RemoteBlobStorage();
    const data = "Hello, remote world!";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (name: string) => (name === "etag" ? "mock-etag" : null),
      },
    });

    const blob = storage.getBlob<string>("string-key");
    const result = await blob.putString(data);

    expect(result.etag).toBe("mock-etag");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/blob/string-key",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    // Verify the body contains the string content
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      content: data,
      contentType: "text/plain",
    });
  });

  test("should get string from a blob", async () => {
    const storage = new RemoteBlobStorage();
    const mockData = "Hello, world!";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: {
          content: mockData,
          etag: "mock-etag",
        },
      }),
    });

    const blob = storage.getBlob<string>("test-key");
    const result = await blob.getString();

    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/blob/test-key",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should get raw data from a blob", async () => {
    const storage = new RemoteBlobStorage();
    const mockData = Buffer.from("Hello, world!");
    const base64Data = mockData.toString("base64");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: {
          content: base64Data,
          contentType: "application/octet-stream",
          etag: "mock-etag",
          lastModified: "2024-01-01T00:00:00Z",
          size: mockData.length,
          metadata: { isBase64: "true" },
        },
      }),
    });

    const blob = storage.getBlob<Buffer>("test-key");
    const result = await blob.getRaw();

    expect(result).toEqual({
      content: mockData,
      contentType: "application/octet-stream",
      etag: "mock-etag",
      lastModified: new Date("2024-01-01T00:00:00Z"),
      size: mockData.length,
      metadata: {},
    });
  });

  test("should get stream from a blob", async () => {
    const storage = new RemoteBlobStorage();
    const mockData = "Hello, world!";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: Readable.from(mockData),
    });

    const blob = storage.getBlob<Readable>("test-key");
    const stream = await blob.getStream();

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const result = Buffer.concat(chunks).toString();

    expect(result).toEqual(mockData);
  });

  test("should put raw data to a blob", async () => {
    const storage = new RemoteBlobStorage();
    const data = Buffer.from("Hello, world!");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (name: string) => (name === "etag" ? "mock-etag" : null),
      },
    });

    const blob = storage.getBlob<Buffer>("test-key");
    const result = await blob.putRaw(data, {
      contentType: "application/octet-stream",
      metadata: { test: "value" },
    });

    expect(result.etag).toBe("mock-etag");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/blob/test-key",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      content: data.toString("base64"),
      contentType: "application/octet-stream",
      metadata: {
        test: "value",
        isBase64: "true",
      },
    });
  });

  test("should put stream to a blob", async () => {
    const storage = new RemoteBlobStorage();
    const data = "Hello, world!";
    const stream = Readable.from(data);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (name: string) => (name === "etag" ? "mock-etag" : null),
      },
    });

    const blob = storage.getBlob<Readable>("test-key");
    const result = await blob.putStream(stream, {
      contentType: "text/plain",
      metadata: { test: "value" },
    });

    expect(result.etag).toBe("mock-etag");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/blob/test-key",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      content: Buffer.from(data).toString("base64"),
      contentType: "text/plain",
      metadata: {
        test: "value",
        isBase64: "true",
      },
    });
  });

  test("should get blob metadata", async () => {
    const storage = new RemoteBlobStorage();
    const _mockData = { foo: "bar" };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          switch (name) {
            case "x-blob-meta-content-type":
              return "application/json";
            case "etag":
              return "mock-etag";
            case "x-blob-meta-test":
              return "value";
            default:
              return null;
          }
        },
        [Symbol.iterator]: function* () {
          yield ["x-blob-meta-content-type", "application/json"];
          yield ["etag", "mock-etag"];
          yield ["x-blob-meta-test", "value"];
        },
      },
    });

    const blob = storage.getBlob<typeof _mockData>("test-key");
    const metadata = await blob.getMetadata();

    expect(metadata).toEqual({
      contentType: "application/json",
      etag: "mock-etag",
      test: "value",
    });
  });

  test("should update blob metadata", async () => {
    const storage = new RemoteBlobStorage();

    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    const blob = storage.getBlob("test-key");
    await blob.updateMetadata({ test: "value" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/blob/test-key",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          metadata: { test: "value" },
        }),
      }),
    );
  });

  suite("Error Handling", () => {
    test("should handle HTTP 404 errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const storage = new RemoteBlobStorage();
      const blob = storage.getBlob<string>("not-found");

      const result = await blob.getJSON();
      expect(result).toBeNull();
    });

    test("should handle API error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "error",
          error: "API error message",
        }),
      });

      const storage = new RemoteBlobStorage();
      const blob = storage.getBlob<string>("api-error");

      try {
        await blob.getJSON();
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BlobError);
        expect((err as BlobError).code).toBe(BlobErrorCode.INTERNAL_ERROR);
        expect((err as BlobError).message).toContain("API error");
      }
    });

    test("should handle HTTP error status codes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const storage = new RemoteBlobStorage();
      const blob = storage.getBlob<string>("server-error");

      try {
        await blob.getJSON();
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BlobError);
        expect((err as BlobError).code).toBe(BlobErrorCode.INTERNAL_ERROR);
      }
    });

    test("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const storage = new RemoteBlobStorage();
      const blob = storage.getBlob<string>("network-error");

      try {
        await blob.getJSON();
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BlobError);
        expect((err as BlobError).code).toBe(BlobErrorCode.NETWORK_ERROR);
        expect((err as BlobError).message).toContain("Network failure");
      }
    });

    test("should throw CONFLICT error when etag doesn't match", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 412, // Precondition Failed status code
        statusText: "Precondition Failed",
      });

      const storage = new RemoteBlobStorage();
      const blob = storage.getBlob<string>("etag-mismatch");
      const outdatedEtag = "outdated-etag-value";

      try {
        await blob.putString("test data", { etag: outdatedEtag });
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BlobError);
        expect((err as BlobError).code).toBe(BlobErrorCode.CONFLICT);
        expect((err as BlobError).message).toContain("ETag mismatch");
      }
    });

    test("should handle missing ETag in response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => null, // No ETag
        },
      });

      const storage = new RemoteBlobStorage();
      const blob = storage.getBlob<string>("no-etag");

      try {
        await blob.putString("test");
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BlobError);
        expect((err as BlobError).code).toBe(BlobErrorCode.INTERNAL_ERROR);
        expect((err as BlobError).message).toContain("No ETag");
      }
    });
  });

  test("should handle default prefix in listBlobs", async () => {
    const storage = new RemoteBlobStorage("default-prefix");
    const mockKeys = ["default-prefix/key1", "default-prefix/key2"];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ keys: mockKeys }),
    });

    const result = await storage.listBlobs();

    expect(result).toEqual(["key1", "key2"]);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/blob?prefix=default-prefix",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should combine default prefix with provided prefix in listBlobs", async () => {
    const storage = new RemoteBlobStorage("default-prefix");
    const mockKeys = ["default-prefix/sub/key1", "default-prefix/sub/key2"];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ keys: mockKeys }),
    });

    const result = await storage.listBlobs("sub");

    expect(result).toEqual(["sub/key1", "sub/key2"]);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/blob?prefix=default-prefix%2Fsub",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
        method: "GET",
      }),
    );
  });

  test("should handle content type in put operations", async () => {
    const storage = new RemoteBlobStorage();
    const data = Buffer.from("Hello, world!");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (name: string) => (name === "etag" ? "mock-etag" : null),
      },
    });

    const blob = storage.getBlob<Buffer>("test-key");
    const result = await blob.putRaw(data, {
      contentType: "application/octet-stream",
      metadata: { test: "value" },
    });

    expect(result.etag).toBe("mock-etag");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/blob/test-key",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      content: data.toString("base64"),
      contentType: "application/octet-stream",
      metadata: {
        test: "value",
        isBase64: "true",
      },
    });
  });

  test("should handle stream operations with proper content type", async () => {
    const storage = new RemoteBlobStorage();
    const data = "Hello, world!";
    const stream = Readable.from(data);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (name: string) => (name === "etag" ? "mock-etag" : null),
      },
    });

    const blob = storage.getBlob<Readable>("test-key");
    const result = await blob.putStream(stream, {
      contentType: "text/plain",
      metadata: { test: "value" },
    });

    expect(result.etag).toBe("mock-etag");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/blob/test-key",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      content: Buffer.from(data).toString("base64"),
      contentType: "text/plain",
      metadata: {
        test: "value",
        isBase64: "true",
      },
    });
  });
});
