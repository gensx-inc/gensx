import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import { FileSystemBlobStorage } from "../src/blob/filesystem.js";
import { RemoteBlobStorage } from "../src/blob/remote.js";
import { BlobError, BlobErrorCode } from "../src/index.js";

// Helper to create temporary test directories
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

suite("Blob Storage Error Handling", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();

    // Mock environment variables for cloud provider tests
    process.env.GENSX_API_KEY = "test-api-key";
    process.env.GENSX_ORG = "test-org";
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
    // Clear environment variables
    delete process.env.GENSX_API_KEY;
    delete process.env.GENSX_ORG;
  });

  suite("FileSystemBlobStorage Errors", () => {
    test("should handle NOT_FOUND errors", async () => {
      const storage = new FileSystemBlobStorage(tempDir);
      const blob = storage.getBlob<string>("non-existent");

      // Mock fs.readFile to throw ENOENT
      vi.spyOn(fs, "readFile").mockImplementation(() => {
        const error = new Error(
          "ENOENT: no such file or directory",
        ) as NodeJS.ErrnoException;
        error.code = "ENOENT";
        throw error;
      });

      // getJSON should return null for non-existent files
      const result = await blob.getJSON();
      expect(result).toBeNull();

      // If we try to get with an operation that doesn't handle null
      try {
        await blob.getMetadata();
        // It should have thrown before getting here
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BlobError);
        expect((err as BlobError).code).toBe(BlobErrorCode.NOT_FOUND);
      }
    });

    test("should handle PERMISSION_DENIED errors", async () => {
      const storage = new FileSystemBlobStorage(tempDir);
      const blob = storage.getBlob<string>("permission-denied");

      // Mock fs.writeFile to throw EACCES
      vi.spyOn(fs, "writeFile").mockImplementation(() => {
        const error = new Error(
          "EACCES: permission denied",
        ) as NodeJS.ErrnoException;
        error.code = "EACCES";
        throw error;
      });

      try {
        await blob.putString("test content");
        // It should have thrown before getting here
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BlobError);
        expect((err as BlobError).code).toBe(BlobErrorCode.PERMISSION_DENIED);
      }
    });

    test("should handle CONFLICT errors", async () => {
      const storage = new FileSystemBlobStorage(tempDir);
      const blob = storage.getBlob<string>("conflict-test");

      // Mock fs.mkdir to throw EEXIST
      vi.spyOn(fs, "mkdir").mockImplementation(() => {
        const error = new Error(
          "EEXIST: file already exists",
        ) as NodeJS.ErrnoException;
        error.code = "EEXIST";
        throw error;
      });

      try {
        await blob.putString("test content");
        // It should have thrown before getting here
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BlobError);
        expect((err as BlobError).code).toBe(BlobErrorCode.CONFLICT);
      }
    });

    test("should handle unknown file system errors", async () => {
      const storage = new FileSystemBlobStorage(tempDir);
      const blob = storage.getBlob<string>("unknown-error");

      // Mock fs.readFile to throw an unknown error
      vi.spyOn(fs, "readFile").mockImplementation(() => {
        throw new Error("Unknown error");
      });

      try {
        await blob.getJSON();
        // It should have thrown before getting here
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BlobError);
        expect((err as BlobError).code).toBe(BlobErrorCode.INTERNAL_ERROR);
      }
    });
  });

  suite("RemoteBlobStorage Errors", () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

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
