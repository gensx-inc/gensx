import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Readable } from "node:stream";

import { afterEach, beforeEach, expect, suite, test } from "vitest";

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

  test("should initialize with default parameters", () => {
    expect(() => new FileSystemBlobStorage(tempDir)).not.toThrow();
  });

  test("should get JSON from a blob", async () => {
    const key = "test-json";
    const data = { foo: "bar", num: 42 };

    const blob = storage.getBlob<typeof data>(key);
    const result = await blob.putJSON(data);

    expect(result).toHaveProperty("etag");
    expect(typeof result.etag).toBe("string");

    const retrieved = await blob.getJSON();
    expect(retrieved).toEqual(data);
  });

  test("should handle non-existent blobs", async () => {
    const key = "non-existent";
    const blob = storage.getBlob(key);

    const jsonData = await blob.getJSON();
    expect(jsonData).toBeNull();

    const stringData = await blob.getString();
    expect(stringData).toBeNull();

    const rawData = await blob.getRaw();
    expect(rawData).toBeNull();
  });

  test("should put JSON to a blob", async () => {
    const key = "put-json-test";
    const data = { foo: "bar", num: 42 };

    const blob = storage.getBlob<typeof data>(key);
    const result = await blob.putJSON(data, { metadata: { test: "value" } });

    expect(result).toHaveProperty("etag");
    expect(typeof result.etag).toBe("string");

    // Verify the content was stored correctly
    const retrieved = await blob.getJSON();
    expect(retrieved).toEqual(data);

    // Verify the content type was set correctly
    const metadata = await blob.getMetadata();
    expect(metadata).not.toBeNull();
    if (metadata) {
      expect(metadata.test).toBe("value");
    }
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

  test("should delete a blob", async () => {
    const key = "delete-test";
    const blob = storage.getBlob(key);

    await blob.putString("to be deleted");
    let exists = await blob.exists();
    expect(exists).toBe(true);

    await blob.delete();
    exists = await blob.exists();
    expect(exists).toBe(false);
  });

  test("should check if a blob exists", async () => {
    const key = "existence-test";
    const blob = storage.getBlob(key);

    let exists = await blob.exists();
    expect(exists).toBe(false);

    await blob.putString("exists now");

    exists = await blob.exists();
    expect(exists).toBe(true);
  });

  test("should put string to a blob", async () => {
    const key = "string-key";
    const data = "Hello, world!";

    const blob = storage.getBlob<string>(key);
    const result = await blob.putString(data, { metadata: { test: "value" } });

    expect(result).toHaveProperty("etag");
    expect(typeof result.etag).toBe("string");

    // Verify the content was stored correctly
    const retrieved = await blob.getString();
    expect(retrieved).toBe(data);

    // Verify the content type was set correctly
    const metadata = await blob.getMetadata();
    expect(metadata).not.toBeNull();
    if (metadata) {
      expect(metadata.test).toBe("value");
    }
  });

  test("should get string from a blob", async () => {
    const key = "string-get-test";
    const data = "Hello, world!";

    const blob = storage.getBlob<string>(key);
    await blob.putString(data);

    const result = await blob.getString();
    expect(result).toBe(data);
  });

  test("should get raw data from a blob", async () => {
    const key = "raw-get-test";
    const data = Buffer.from("Hello, world!");

    const blob = storage.getBlob<Buffer>(key);

    await blob.putRaw(data, {
      contentType: "application/octet-stream",
      metadata: { test: "value" },
    });

    const result = await blob.getRaw();
    expect(result).not.toBeNull();
    if (result) {
      expect(result.content).toEqual(data);
      expect(result.contentType).toBe("application/octet-stream");
      expect(result.metadata).toEqual({ test: "value" });
      expect(result).toHaveProperty("etag");
      expect(result).toHaveProperty("lastModified");
      expect(result).toHaveProperty("size");
    }
  });

  test("should get stream from a blob", async () => {
    const key = "stream-get-test";
    const data = "Hello, world!";

    const blob = storage.getBlob(key);
    await blob.putString(data);

    const stream = await blob.getStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk as ArrayBufferLike));
    }
    const result = Buffer.concat(chunks).toString();

    expect(result).toBe(data);
  });

  test("should put raw data to a blob", async () => {
    const key = "raw-test";
    const data = Buffer.from("Hello, world!");
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

  test("should put stream to a blob", async () => {
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
      chunks.push(Buffer.from(chunk as ArrayBufferLike));
    }
    const retrievedData = Buffer.concat(chunks).toString();
    expect(retrievedData).toBe(data);
  });

  test("should get blob metadata", async () => {
    const key = "metadata-get-test";
    const data = { foo: "bar" };
    const metadata = {
      test: "value",
    };

    const blob = storage.getBlob<typeof data>(key);
    const result = await blob.putJSON(data, { metadata });

    const retrievedMetadata = await blob.getMetadata();
    expect(retrievedMetadata).toEqual({
      test: "value",
      etag: result.etag,
      contentType: "application/json",
    });
  });

  test("should update blob metadata", async () => {
    const key = "metadata-update-test";
    const blob = storage.getBlob<string>(key);

    // Create the blob first
    await blob.putString("test content");

    // Update its metadata
    await blob.updateMetadata({ test: "value" });

    const metadata = await blob.getMetadata();
    expect(metadata).not.toBeNull();
    if (metadata) {
      expect(metadata.test).toBe("value");
      expect(metadata.contentType).toBe("text/plain"); // Should preserve original content type
      expect(metadata).toHaveProperty("etag");
    }
  });

  test("should handle metadata", async () => {
    const key = "metadata-test";
    const blob = storage.getBlob(key);
    const metadata = { customKey: "customValue" };

    await blob.putString("with metadata", { metadata });

    const retrievedMetadata = await blob.getMetadata();
    expect(retrievedMetadata).not.toBeNull();
    if (retrievedMetadata) {
      expect(retrievedMetadata.customKey).toEqual("customValue");
    }

    const updatedMetadata = { ...metadata, newKey: "newValue" };
    await blob.updateMetadata(updatedMetadata);

    const latestMetadata = await blob.getMetadata();
    expect(latestMetadata).not.toBeNull();
    if (latestMetadata) {
      expect(latestMetadata.customKey).toEqual("customValue");
      expect(latestMetadata.newKey).toEqual("newValue");
    }
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

  test("should handle default prefix in listBlobs", async () => {
    const prefixedStorage = new FileSystemBlobStorage(
      tempDir,
      "default-prefix",
    );

    // Create test blobs
    await prefixedStorage.getBlob("key1").putString("content1");
    await prefixedStorage.getBlob("key2").putString("content2");

    const result = await prefixedStorage.listBlobs();
    expect(result).toHaveLength(2);
    expect(result).toContain("key1");
    expect(result).toContain("key2");
  });

  test("should combine default prefix with provided prefix in listBlobs", async () => {
    const prefixedStorage = new FileSystemBlobStorage(
      tempDir,
      "default-prefix",
    );

    // Create test blobs with sub-prefix
    await prefixedStorage.getBlob("sub/key1").putString("content1");
    await prefixedStorage.getBlob("sub/key2").putString("content2");
    await prefixedStorage.getBlob("other/key3").putString("content3");

    const result = await prefixedStorage.listBlobs("sub");
    expect(result).toHaveLength(2);
    expect(result).toContain("sub/key1");
    expect(result).toContain("sub/key2");
    expect(result).not.toContain("other/key3");
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

  test("should handle stream operations with proper content type", async () => {
    const key = "stream-content-type-test";
    const data = "Hello, world!";
    const stream = Readable.from(data);
    const blob = storage.getBlob<Readable>(key);

    await blob.putStream(stream, {
      contentType: "text/plain",
      metadata: { test: "value" },
    });

    const metadata = await blob.getMetadata();
    expect(metadata).not.toBeNull();
    if (metadata) {
      expect(metadata.contentType).toBe("text/plain");
      expect(metadata.test).toBe("value");
    }

    // Verify content was stored correctly
    const retrievedStream = await blob.getStream();
    const chunks: Buffer[] = [];
    for await (const chunk of retrievedStream) {
      chunks.push(Buffer.from(chunk as ArrayBufferLike));
    }
    const retrievedData = Buffer.concat(chunks).toString();
    expect(retrievedData).toBe(data);
  });

  // suite("Error Handling", () => {
  //   test("should handle NOT_FOUND errors", async () => {
  //     const blob = storage.getBlob<string>("non-existent");

  //     // Mock fs.readFile to throw ENOENT
  //     vi.spyOn(fs, "readFile").mockImplementation(() => {
  //       const error = new Error(
  //         "ENOENT: no such file or directory",
  //       ) as NodeJS.ErrnoException;
  //       error.code = "ENOENT";
  //       throw error;
  //     });

  //     // getJSON should return null for non-existent files
  //     const result = await blob.getJSON();
  //     expect(result).toBeNull();

  //     // If we try to get with an operation that doesn't handle null
  //     try {
  //       await blob.getMetadata();
  //       // It should have thrown before getting here
  //       expect(true).toBe(false);
  //     } catch (err) {
  //       expect(err).toBeInstanceOf(BlobError);
  //       expect((err as BlobError).code).toBe(BlobErrorCode.NOT_FOUND);
  //     }
  //   });

  //   test("should handle PERMISSION_DENIED errors", async () => {
  //     const blob = storage.getBlob<string>("permission-denied");

  //     // Mock fs.writeFile to throw EACCES
  //     vi.spyOn(fs, "writeFile").mockImplementation(() => {
  //       const error = new Error(
  //         "EACCES: permission denied",
  //       ) as NodeJS.ErrnoException;
  //       error.code = "EACCES";
  //       throw error;
  //     });

  //     try {
  //       await blob.putString("test content");
  //       // It should have thrown before getting here
  //       expect(true).toBe(false);
  //     } catch (err) {
  //       expect(err).toBeInstanceOf(BlobError);
  //       expect((err as BlobError).code).toBe(BlobErrorCode.PERMISSION_DENIED);
  //     }
  //   });

  //   test("should handle CONFLICT errors", async () => {
  //     const blob = storage.getBlob<string>("conflict-test");

  //     // Mock fs.mkdir to throw EEXIST
  //     vi.spyOn(fs, "mkdir").mockImplementation(() => {
  //       const error = new Error(
  //         "EEXIST: file already exists",
  //       ) as NodeJS.ErrnoException;
  //       error.code = "EEXIST";
  //       throw error;
  //     });

  //     try {
  //       await blob.putString("test content");
  //       // It should have thrown before getting here
  //       expect(true).toBe(false);
  //     } catch (err) {
  //       expect(err).toBeInstanceOf(BlobError);
  //       expect((err as BlobError).code).toBe(BlobErrorCode.CONFLICT);
  //     }
  //   });

  //   test("should handle unknown file system errors", async () => {
  //     const blob = storage.getBlob<string>("unknown-error");

  //     // Mock fs.readFile to throw an unknown error
  //     vi.spyOn(fs, "readFile").mockImplementation(() => {
  //       throw new Error("Unknown error");
  //     });

  //     try {
  //       await blob.getJSON();
  //       // It should have thrown before getting here
  //       expect(true).toBe(false);
  //     } catch (err) {
  //       expect(err).toBeInstanceOf(BlobError);
  //       expect((err as BlobError).code).toBe(BlobErrorCode.INTERNAL_ERROR);
  //     }
  //   });

  //   test("should throw CONFLICT error when etag doesn't match", async () => {
  //     const key = "etag-mismatch";
  //     const blob = storage.getBlob<string>(key);

  //     // First write something
  //     await blob.putString("initial data");

  //     // Then try to update with invalid etag
  //     const outdatedEtag = "outdated-etag-value";

  //     try {
  //       await blob.putString("test data", { etag: outdatedEtag });
  //       // Should have thrown
  //       expect(true).toBe(false);
  //     } catch (err) {
  //       expect(err).toBeInstanceOf(BlobError);
  //       expect((err as BlobError).code).toBe(BlobErrorCode.CONFLICT);
  //       expect((err as BlobError).message).toContain("ETag mismatch");
  //     }
  //   });

  //   test("should handle missing ETag in response", async () => {
  //     const blob = storage.getBlob<string>("no-etag");

  //     // Mock fs.writeFile to not set ETag
  //     vi.spyOn(fs, "writeFile").mockImplementation(() => {
  //       // Simulate successful write without ETag
  //       return Promise.resolve();
  //     });

  //     try {
  //       await blob.putString("test");
  //       // Should have thrown
  //       expect(true).toBe(false);
  //     } catch (err) {
  //       expect(err).toBeInstanceOf(BlobError);
  //       expect((err as BlobError).code).toBe(BlobErrorCode.INTERNAL_ERROR);
  //       expect((err as BlobError).message).toContain("No ETag");
  //     }
  //   });
  // });
});
