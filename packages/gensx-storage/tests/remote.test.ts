/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

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
      // eslint-disable-next-line @typescript-eslint/require-await
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
      // eslint-disable-next-line @typescript-eslint/require-await
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
        // eslint-disable-next-line @typescript-eslint/require-await
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
});
