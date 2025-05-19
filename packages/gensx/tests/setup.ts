import path from "node:path";

import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";

import {
  cleanupProjectFiles,
  cleanupTestEnvironment,
  setupTestEnvironment,
} from "./test-helpers.js";

// Setup test variables that will be shared across tests
export let tempDir: string;
export let origCwd: typeof process.cwd;
export let origConfigDir: string | undefined;

// Set up and tear down the test environment
beforeAll(async () => {
  const setup = await setupTestEnvironment("gensx-tests");
  tempDir = setup.tempDir;
  origCwd = setup.origCwd;
  origConfigDir = setup.origConfigDir;
});

afterAll(async () => {
  await cleanupTestEnvironment(tempDir, origCwd, origConfigDir);
});

beforeEach(() => {
  // Set working directory to our test project
  process.cwd = vi.fn().mockReturnValue(path.join(tempDir, "project"));
});

afterEach(async () => {
  vi.resetAllMocks();
  await cleanupProjectFiles(tempDir);
});
