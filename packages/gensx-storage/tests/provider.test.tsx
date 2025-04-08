/** @jsxRuntime automatic */
/** @jsxImportSource @gensx/core */
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import * as gensx from "@gensx/core";
import { afterEach, beforeEach, expect, suite, test } from "vitest";

import { BlobContext } from "../src/blob/context.js";
import { FileSystemBlobStorage } from "../src/blob/filesystem.js";
import { BlobProvider } from "../src/blob/provider.js";
import { RemoteBlobStorage } from "../src/blob/remote.js";
import {
  BlobProviderProps,
  CloudBlobProviderProps,
  FileSystemBlobProviderProps,
} from "../src/blob/types.js";
import { BlobStorage } from "../src/blob/types.js";

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
    delete process.env.STORAGE_MODE;
  });

  test("provides filesystem storage to children", async () => {
    let capturedStorage: BlobStorage | undefined;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(BlobContext);
      if (!context) throw new Error("BlobContext not found");
      capturedStorage = context;
      return null;
    });

    const props: BlobProviderProps = {
      kind: "filesystem",
      rootDir: tempDir,
    };

    await gensx.execute(
      <BlobProvider {...props}>
        <TestComponent />
      </BlobProvider>,
    );

    expect(capturedStorage).toBeDefined();
    expect(capturedStorage).toHaveProperty("rootDir", tempDir);
    expect(capturedStorage).toBeInstanceOf(FileSystemBlobStorage);
  });

  test("provides cloud storage to children", async () => {
    let capturedStorage: BlobStorage | undefined;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(BlobContext);
      if (!context) throw new Error("BlobContext not found");
      capturedStorage = context;
      return null;
    });

    const props: BlobProviderProps = {
      kind: "cloud",
    };

    await gensx.execute(
      <BlobProvider {...props}>
        <TestComponent />
      </BlobProvider>,
    );

    expect(capturedStorage).toBeDefined();
    expect(capturedStorage).toHaveProperty("apiKey", "test-api-key");
    expect(capturedStorage).toBeInstanceOf(RemoteBlobStorage);
  });

  test("passes defaultPrefix to storage implementations", async () => {
    let capturedStorage: BlobStorage | undefined;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(BlobContext);
      if (!context) throw new Error("BlobContext not found");
      capturedStorage = context;
      return null;
    });

    // Test with filesystem storage
    const fsProps: BlobProviderProps = {
      kind: "filesystem",
      rootDir: tempDir,
      defaultPrefix: "fs-prefix",
    };

    await gensx.execute(
      <BlobProvider {...fsProps}>
        <TestComponent />
      </BlobProvider>,
    );

    expect(capturedStorage).toHaveProperty("defaultPrefix", "fs-prefix");
    expect(capturedStorage).toBeInstanceOf(FileSystemBlobStorage);

    // Test with cloud storage
    const cloudProps: BlobProviderProps = {
      kind: "cloud",
      defaultPrefix: "cloud-prefix",
    };

    await gensx.execute(
      <BlobProvider {...cloudProps}>
        <TestComponent />
      </BlobProvider>,
    );

    expect(capturedStorage).toHaveProperty("defaultPrefix", "cloud-prefix");
    expect(capturedStorage).toBeInstanceOf(RemoteBlobStorage);
  });

  test("defaults to filesystem storage when kind is not provided and STORAGE_MODE is not s3", async () => {
    let capturedStorage: BlobStorage | undefined;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(BlobContext);
      if (!context) throw new Error("BlobContext not found");
      capturedStorage = context;
      return null;
    });

    // Ensure STORAGE_MODE is not set
    delete process.env.STORAGE_MODE;

    const props: FileSystemBlobProviderProps = {
      rootDir: tempDir,
    };

    await gensx.execute(
      <BlobProvider {...props}>
        <TestComponent />
      </BlobProvider>,
    );

    expect(capturedStorage).toBeDefined();
    expect(capturedStorage).toHaveProperty("rootDir", tempDir);
    expect(capturedStorage).toBeInstanceOf(FileSystemBlobStorage);
  });

  test("defaults to cloud storage when kind is not provided and STORAGE_MODE is s3", async () => {
    let capturedStorage: BlobStorage | undefined;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(BlobContext);
      if (!context) throw new Error("BlobContext not found");
      capturedStorage = context;
      return null;
    });

    // Set STORAGE_MODE to s3
    process.env.STORAGE_MODE = "s3";

    const props: CloudBlobProviderProps = {
      defaultPrefix: "test-prefix",
    };

    await gensx.execute(
      <BlobProvider {...props}>
        <TestComponent />
      </BlobProvider>,
    );

    expect(capturedStorage).toBeDefined();
    expect(capturedStorage).toHaveProperty("defaultPrefix", "test-prefix");
    expect(capturedStorage).toHaveProperty("apiKey", "test-api-key");
    expect(capturedStorage).toBeInstanceOf(RemoteBlobStorage);
  });

  test("uses provided kind even when STORAGE_MODE is set", async () => {
    let capturedStorage: BlobStorage | undefined;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(BlobContext);
      if (!context) throw new Error("BlobContext not found");
      capturedStorage = context;
      return null;
    });

    // Set STORAGE_MODE to s3 but provide filesystem kind
    process.env.STORAGE_MODE = "s3";

    const props: FileSystemBlobProviderProps = {
      kind: "filesystem",
      rootDir: tempDir,
    };

    await gensx.execute(
      <BlobProvider {...props}>
        <TestComponent />
      </BlobProvider>,
    );

    expect(capturedStorage).toBeDefined();
    expect(capturedStorage).toHaveProperty("rootDir", tempDir);
    expect(capturedStorage).toBeInstanceOf(FileSystemBlobStorage);
  });
});
