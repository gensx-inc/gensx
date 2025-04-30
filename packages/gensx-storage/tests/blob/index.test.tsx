import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import { FileSystemBlobStorage } from "../../src/blob/filesystem.js";
import { RemoteBlobStorage } from "../../src/blob/remote.js";
import { BlobProvider } from "../../src/index.js";

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

suite("GenSX Storage", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();

    // Setup environment variables for remote storage
    process.env.GENSX_API_KEY = "test-api-key";
    process.env.GENSX_ORG = "test-org";
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
    delete process.env.GENSX_API_KEY;
    delete process.env.GENSX_ORG;
  });

  test("FileSystemBlobStorage should implement BlobStorage interface", () => {
    const storage = new FileSystemBlobStorage(tempDir);

    // Check if it implements the BlobStorage interface
    expect(storage).toBeDefined();
    expect(typeof storage.getBlob).toBe("function");
    expect(typeof storage.listBlobs).toBe("function");

    // Check that it returns a valid blob
    const blob = storage.getBlob("test");
    expect(blob).toBeDefined();
    expect(typeof blob.getJSON).toBe("function");
    expect(typeof blob.getString).toBe("function");
    expect(typeof blob.putJSON).toBe("function");
    expect(typeof blob.putString).toBe("function");
    expect(typeof blob.delete).toBe("function");
    expect(typeof blob.exists).toBe("function");
    expect(typeof blob.getMetadata).toBe("function");
    expect(typeof blob.updateMetadata).toBe("function");
  });

  test("RemoteBlobStorage should implement BlobStorage interface when properly configured", () => {
    // Mock fetch for RemoteBlobStorage to prevent actual API calls
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        headers: { get: () => null },
        status: 200,
        statusText: "OK",
        text: () => Promise.resolve(""),
        json: () => Promise.resolve({}),
      } as unknown as Response),
    );

    const storage = new RemoteBlobStorage("test-project", "test-environment");

    // Check if it implements the BlobStorage interface
    expect(storage).toBeDefined();
    expect(typeof storage.getBlob).toBe("function");
    expect(typeof storage.listBlobs).toBe("function");

    // Check that it returns a valid blob
    const blob = storage.getBlob("test");
    expect(blob).toBeDefined();
    expect(typeof blob.getJSON).toBe("function");
    expect(typeof blob.getString).toBe("function");
    expect(typeof blob.putJSON).toBe("function");
    expect(typeof blob.putString).toBe("function");
    expect(typeof blob.delete).toBe("function");
    expect(typeof blob.exists).toBe("function");
    expect(typeof blob.getMetadata).toBe("function");
    expect(typeof blob.updateMetadata).toBe("function");
  });

  test("Should be able to import and use BlobProvider", () => {
    expect(BlobProvider).toBeDefined();
  });
});
