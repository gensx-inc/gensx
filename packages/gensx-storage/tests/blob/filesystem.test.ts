import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Readable } from "node:stream";

import { afterEach, beforeEach, expect, suite, test } from "vitest";

import { FileSystemBlobStorage } from "../../src/blob/filesystem.js";
import { BlobConflictError, BlobError, BlobStorage } from "../../src/index.js";

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

    const result = await storage.listBlobs({ prefix: "prefix1" });
    expect(result.keys).toHaveLength(2);
    expect(result.keys).toContain("prefix1/a");
    expect(result.keys).toContain("prefix1/b");

    const prefix2Result = await storage.listBlobs({ prefix: "prefix2" });
    expect(prefix2Result.keys).toHaveLength(1);
    expect(prefix2Result.keys).toContain("prefix2/c");

    const allBlobs = await storage.listBlobs();
    expect(allBlobs.keys).toHaveLength(3);
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
    expect(blobs.keys).toHaveLength(2);
    expect(blobs.keys).toContain("test1");
    expect(blobs.keys).toContain("test2");

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
    expect(result.keys).toHaveLength(2);
    expect(result.keys).toContain("key1");
    expect(result.keys).toContain("key2");
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

    const result = await prefixedStorage.listBlobs({ prefix: "sub" });
    expect(result.keys).toHaveLength(2);
    expect(result.keys).toContain("sub/key1");
    expect(result.keys).toContain("sub/key2");
    expect(result.keys).not.toContain("other/key3");
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
      expect(error).toBeInstanceOf(BlobConflictError);
      expect((error as BlobError).code).toBe("CONFLICT");
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

  test("should handle pagination with limit", async () => {
    // Create test blobs
    const blobKeys = Array.from({ length: 5 }, (_, i) => `test${i + 1}`);
    for (const key of blobKeys) {
      await storage.getBlob(key).putString(key);
    }

    // Get first page
    const firstPage = await storage.listBlobs({ limit: 2 });
    expect(firstPage.keys).toHaveLength(2);
    expect(firstPage.keys).toEqual(["test1", "test2"]);
    expect(firstPage.nextCursor).not.toBeNull();

    // Get second page
    const secondPage = await storage.listBlobs({
      limit: 2,
      cursor: firstPage.nextCursor!,
    });
    expect(secondPage.keys).toHaveLength(2);
    expect(secondPage.keys).toEqual(["test3", "test4"]);
    expect(secondPage.nextCursor).not.toBeNull();

    // Get last page
    const lastPage = await storage.listBlobs({
      limit: 2,
      cursor: secondPage.nextCursor!,
    });
    expect(lastPage.keys).toHaveLength(1);
    expect(lastPage.keys).toEqual(["test5"]);
    expect(lastPage.nextCursor).toBeNull();
  });

  test("should handle pagination with prefix", async () => {
    // Create test blobs with different prefixes
    await storage.getBlob("prefix1/a").putString("a");
    await storage.getBlob("prefix1/b").putString("b");
    await storage.getBlob("prefix1/c").putString("c");
    await storage.getBlob("prefix2/d").putString("d");

    // Get first page of prefix1
    const firstPage = await storage.listBlobs({
      prefix: "prefix1",
      limit: 2,
    });
    expect(firstPage.keys).toHaveLength(2);
    expect(firstPage.keys).toEqual(["prefix1/a", "prefix1/b"]);
    expect(firstPage.nextCursor).not.toBeNull();

    // Get second page of prefix1
    const secondPage = await storage.listBlobs({
      prefix: "prefix1",
      limit: 2,
      cursor: firstPage.nextCursor!,
    });
    expect(secondPage.keys).toHaveLength(1);
    expect(secondPage.keys).toEqual(["prefix1/c"]);
    expect(secondPage.nextCursor).toBeNull();
  });

  test("should handle empty results with pagination", async () => {
    const result = await storage.listBlobs({ limit: 10 });
    expect(result.keys).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  test("should handle default limit in pagination", async () => {
    // Create more than the default number of blobs
    const blobKeys = Array.from({ length: 150 }, (_, i) => `test${i + 1}`);
    for (const key of blobKeys) {
      await storage.getBlob(key).putString(key);
    }

    // Get first page with default limit
    const firstPage = await storage.listBlobs();
    expect(firstPage.keys.length).toBe(100); // Default limit
    expect(firstPage.nextCursor).not.toBeNull();

    // Get remaining items
    const secondPage = await storage.listBlobs({
      cursor: firstPage.nextCursor!,
    });
    expect(secondPage.keys.length).toBe(50);
    expect(secondPage.nextCursor).toBeNull();
  });
});
