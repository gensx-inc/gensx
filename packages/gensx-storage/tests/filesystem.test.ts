import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Readable } from "node:stream";

import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import { FileSystemBlobStorage } from "../src/blob/filesystem.js";
import { BlobError, BlobErrorCode, BlobStorage } from "../src/index.js";

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

suite("FileSystemBlobStorage", () => {
  let tempDir: string;
  let storage: BlobStorage;

  beforeEach(async () => {
    tempDir = await createTempDir();
    storage = new FileSystemBlobStorage(tempDir);
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  test("should store and retrieve JSON data", async () => {
    const key = "test-json";
    const data = { foo: "bar", num: 42 };

    const blob = storage.getBlob<typeof data>(key);
    const result = await blob.putJSON(data);

    expect(result).toHaveProperty("etag");
    expect(typeof result.etag).toBe("string");

    const retrieved = await blob.getJSON();
    expect(retrieved).toEqual(data);
  });

  test("should store and retrieve string data", async () => {
    const key = "test-string";
    const data = "Hello, world!";

    const blob = storage.getBlob<string>(key);
    const result = await blob.putString(data);

    expect(result).toHaveProperty("etag");

    const retrieved = await blob.getString();
    expect(retrieved).toBe(data);
  });

  test("should handle non-existent blobs", async () => {
    const key = "non-existent";
    const blob = storage.getBlob(key);

    const jsonData = await blob.getJSON();
    expect(jsonData).toBeNull();

    const stringData = await blob.getString();
    expect(stringData).toBeNull();
  });

  test("should check if blob exists", async () => {
    const key = "existence-test";
    const blob = storage.getBlob(key);

    let exists = await blob.exists();
    expect(exists).toBe(false);

    await blob.putString("exists now");

    exists = await blob.exists();
    expect(exists).toBe(true);
  });

  test("should delete blobs", async () => {
    const key = "delete-test";
    const blob = storage.getBlob(key);

    await blob.putString("to be deleted");
    let exists = await blob.exists();
    expect(exists).toBe(true);

    await blob.delete();
    exists = await blob.exists();
    expect(exists).toBe(false);
  });

  test("should handle metadata", async () => {
    const key = "metadata-test";
    const blob = storage.getBlob(key);
    const metadata = { contentType: "text/plain", customKey: "customValue" };

    await blob.putString("with metadata", { metadata });

    const retrievedMetadata = await blob.getMetadata();
    expect(retrievedMetadata).toEqual(metadata);

    const updatedMetadata = { ...metadata, newKey: "newValue" };
    await blob.updateMetadata(updatedMetadata);

    const latestMetadata = await blob.getMetadata();
    expect(latestMetadata).toEqual(updatedMetadata);
  });

  test("should list blobs with prefix", async () => {
    // Create some test blobs
    await storage.getBlob("prefix1/a").putString("a");
    await storage.getBlob("prefix1/b").putString("b");
    await storage.getBlob("prefix2/c").putString("c");

    const prefix1Blobs = await storage.listBlobs("prefix1");
    expect(prefix1Blobs).toHaveLength(2);
    expect(prefix1Blobs).toContain("prefix1/a");
    expect(prefix1Blobs).toContain("prefix1/b");

    const prefix2Blobs = await storage.listBlobs("prefix2");
    expect(prefix2Blobs).toHaveLength(1);
    expect(prefix2Blobs).toContain("prefix2/c");

    const allBlobs = await storage.listBlobs();
    expect(allBlobs).toHaveLength(3);
  });

  test("should respect default prefix", async () => {
    const prefixedStorage = new FileSystemBlobStorage(
      tempDir,
      "default-prefix",
    );

    await prefixedStorage.getBlob("test1").putString("test1");
    await prefixedStorage.getBlob("test2").putString("test2");

    const blobs = await prefixedStorage.listBlobs();
    expect(blobs).toHaveLength(2);
    expect(blobs).toContain("test1");
    expect(blobs).toContain("test2");

    // The actual files should be under the default prefix
    const filesExist = await fs
      .access(path.join(tempDir, "default-prefix", "test1"))
      .then(() => true)
      .catch(() => false);
    expect(filesExist).toBe(true);
  });

  test("should handle concurrent updates with ETags", async () => {
    const key = "concurrency-test";
    const blob = storage.getBlob<{ value: number }>(key);

    // Initial save
    const initialData = { value: 1 };
    const { etag: initialEtag } = await blob.putJSON(initialData);

    // Update with correct ETag
    const updatedData = { value: 2 };
    const { etag: _updatedEtag } = await blob.putJSON(updatedData, {
      etag: initialEtag,
    });

    // Try to update with outdated ETag
    try {
      await blob.putJSON({ value: 3 }, { etag: initialEtag });
      // Should not reach here
      expect(false).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(BlobError);
      expect((error as BlobError).code).toBe(BlobErrorCode.CONFLICT);
    }

    // Verify the current value
    const finalData = await blob.getJSON();
    expect(finalData).toEqual(updatedData);
  });

  test("should handle raw data operations", async () => {
    const key = "raw-test";
    const data = Buffer.from("Hello, world!", "utf-8") as Buffer;
    const blob = storage.getBlob<Buffer>(key);

    const result = await blob.putRaw(data, {
      contentType: "application/octet-stream",
      metadata: { test: "value" },
    });

    expect(result).toHaveProperty("etag");

    const retrieved = await blob.getRaw();
    expect(retrieved).not.toBeNull();
    if (retrieved) {
      expect(retrieved.content).toEqual(data);
      expect(retrieved.contentType).toBe("application/octet-stream");
      expect(retrieved.metadata).toEqual({ test: "value" });
    }
  });

  test("should handle stream operations", async () => {
    const key = "stream-test";
    const data = "Hello, world!";
    const stream = Readable.from(data);
    const blob = storage.getBlob<Readable>(key);

    const result = await blob.putStream(stream, {
      contentType: "text/plain",
      metadata: { test: "value" },
    });

    expect(result).toHaveProperty("etag");

    const retrievedStream = await blob.getStream();
    const chunks: Buffer[] = [];
    for await (const chunk of retrievedStream) {
      chunks.push(Buffer.from(chunk));
    }
    const retrievedData = Buffer.concat(chunks).toString();
    expect(retrievedData).toBe(data);
  });

  test("should handle content type in put operations", async () => {
    const key = "content-type-test";
    const data = Buffer.from("Hello, world!");
    const blob = storage.getBlob<Buffer>(key);

    await blob.putRaw(data, {
      contentType: "application/octet-stream",
      metadata: { test: "value" },
    });

    const metadata = await blob.getMetadata();
    expect(metadata).not.toBeNull();
    if (metadata) {
      expect(metadata.contentType).toBe("application/octet-stream");
      expect(metadata.test).toBe("value");
    }
  });

  suite("Error Handling", () => {
    test("should handle NOT_FOUND errors", async () => {
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

    test("should handle missing ETag in response", async () => {
      const blob = storage.getBlob<string>("no-etag");

      // Mock fs.writeFile to not set ETag
      vi.spyOn(fs, "writeFile").mockImplementation(() => {
        // Simulate successful write without ETag
        return Promise.resolve();
      });

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
