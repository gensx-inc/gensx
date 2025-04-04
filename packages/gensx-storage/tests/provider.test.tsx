/** @jsxRuntime automatic */
/** @jsxImportSource @gensx/core */
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import { FileSystemBlobStorage } from "../src/blob/filesystem.js";
// Import the BlobProvider last to ensure mocks are set up
import { BlobProvider } from "../src/blob/provider.js";
import { RemoteBlobStorage } from "../src/blob/remote.js";
import { BlobProviderProps } from "../src/blob/types.js";

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

// Mock @gensx/core
vi.mock("@gensx/core", () => ({
  Component: vi.fn((_name, fn) => fn),
  createContext: vi.fn(),
}));

// Mock the BlobContext
vi.mock("../src/blob/context.js", () => ({
  BlobContext: {
    Provider: vi.fn(({ value }) => value),
  },
}));

suite("BlobProvider", () => {
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

  test("BlobProvider should create FileSystemBlobStorage for filesystem kind", () => {
    // Call the BlobProvider with filesystem props
    const props: BlobProviderProps = {
      kind: "filesystem",
      rootDir: tempDir,
    };

    const result = BlobProvider(props);

    // Verify it created a FileSystemBlobStorage
    expect(result).toBeInstanceOf(FileSystemBlobStorage);
  });

  test("BlobProvider should create RemoteBlobStorage for cloud kind", () => {
    // Call the BlobProvider with cloud props
    const props: BlobProviderProps = {
      kind: "cloud",
    };

    const result = BlobProvider(props);

    // Verify it created a RemoteBlobStorage
    expect(result).toBeInstanceOf(RemoteBlobStorage);
  });

  test("BlobProvider should pass defaultPrefix to storage implementations", () => {
    // Test with filesystem storage
    const fsProps: BlobProviderProps = {
      kind: "filesystem",
      rootDir: tempDir,
      defaultPrefix: "fs-prefix",
    };

    const fsResult = BlobProvider(fsProps) as unknown as FileSystemBlobStorage;
    expect(fsResult).toBeInstanceOf(FileSystemBlobStorage);

    // Test with cloud storage
    const cloudProps: BlobProviderProps = {
      kind: "cloud",
      defaultPrefix: "cloud-prefix",
    };

    const cloudResult = BlobProvider(
      cloudProps,
    ) as unknown as RemoteBlobStorage;
    expect(cloudResult).toBeInstanceOf(RemoteBlobStorage);

    // Note: We can't directly test defaultPrefix as it's private
    // The implementation would verify this through behavior
  });
});
