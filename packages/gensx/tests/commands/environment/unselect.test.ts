import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { render } from "ink-testing-library";
import React from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  suite,
  vi,
} from "vitest";

import { UnselectEnvironmentUI } from "../../../src/commands/environment/unselect.js";
import * as projectModel from "../../../src/models/projects.js";
import * as envConfig from "../../../src/utils/env-config.js";
import * as projectConfig from "../../../src/utils/project-config.js";

// Create a temporary directory for our tests
let tempDir: string;
let origConfigDir: string | undefined;
let origCwd: typeof process.cwd;

// Mock dependencies
vi.mock("../../../src/models/projects.js", () => ({
  checkProjectExists: vi.fn(),
}));

vi.mock("../../../src/utils/env-config.js", () => ({
  validateAndSelectEnvironment: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../../src/utils/project-config.js", () => ({
  readProjectConfig: vi.fn(),
}));

// Original process.exit to restore later
const originalExit = process.exit;

// Set up and tear down the test environment
beforeAll(async () => {
  // Save original process.cwd
  origCwd = process.cwd;

  // Create a temp directory for our tests
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gensx-unselect-test-"));

  // Create project and config directories
  await fs.mkdir(path.join(tempDir, "project"), { recursive: true });
  await fs.mkdir(path.join(tempDir, ".gensx", "projects"), { recursive: true });

  // Override the config directory by mocking with environment variable
  origConfigDir = process.env.GENSX_CONFIG_DIR;
  process.env.GENSX_CONFIG_DIR = path.join(tempDir, ".gensx");

  // Mock process.exit
  process.exit = vi.fn() as unknown as typeof process.exit;
});

afterAll(async () => {
  // Restore original environment
  process.cwd = origCwd;
  if (origConfigDir) {
    process.env.GENSX_CONFIG_DIR = origConfigDir;
  } else {
    delete process.env.GENSX_CONFIG_DIR;
  }
  process.exit = originalExit;

  // Clean up temp directory
  await fs.rm(tempDir, { recursive: true, force: true });
});

beforeEach(() => {
  // Set working directory to our test project
  process.cwd = vi.fn().mockReturnValue(path.join(tempDir, "project"));
});

afterEach(async () => {
  vi.resetAllMocks();

  // Clean up any test files after each test
  try {
    const projectsDir = path.join(tempDir, ".gensx", "projects");
    const files = await fs.readdir(projectsDir);

    for (const file of files) {
      if (file !== ".gitkeep") {
        await fs.unlink(path.join(projectsDir, file));
      }
    }

    // Clean up project config file
    try {
      await fs.unlink(path.join(tempDir, "project", "gensx.yaml"));
    } catch (_error) {
      // Ignore if file doesn't exist
    }
  } catch (_error) {
    // Ignore cleanup errors
  }
});

function waitForText(
  getFrame: () => string | undefined,
  text: string | RegExp,
  timeout = 1000,
) {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    function check() {
      const frame = getFrame() ?? ""; // treat undefined as empty string
      if (typeof text === "string" ? frame.includes(text) : text.test(frame)) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error(`Timed out waiting for text: ${text}`));
      } else {
        setTimeout(check, 20);
      }
    }
    check();
  });
}

// Helper to wait for process.exit to be called
function waitForProcessExit(timeout = 200) {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    function check() {
      if (vi.mocked(process.exit).mock.calls.length > 0) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error(`Timed out waiting for process.exit to be called`));
      } else {
        setTimeout(check, 20);
      }
    }
    check();
  });
}

// Helper to wait for a mock function to be called
function waitForMockCall(
  mockFn: ReturnType<typeof vi.fn>,
  timeout = 200,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    function check() {
      if (mockFn.mock.calls.length > 0) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error(`Timed out waiting for mock function to be called`));
      } else {
        setTimeout(check, 20);
      }
    }
    check();
  });
}

suite("environment unselect command", () => {
  it("should unselect environment for an existing project", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    const { lastFrame } = render(
      React.createElement(UnselectEnvironmentUI, {
        projectName: "test-project",
      }),
    );

    // Verify UI shows success message
    await waitForText(
      lastFrame,
      /Active environment cleared for project test-project/,
    );

    // Verify the mock was called with the right parameters
    await waitForMockCall(vi.mocked(envConfig.validateAndSelectEnvironment));
    expect(envConfig.validateAndSelectEnvironment).toHaveBeenCalledWith(
      "test-project",
      null,
    );
  });

  it("should use project name from config when not specified", async () => {
    // Mock project config with projectName
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "config-project",
    });

    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    const { lastFrame } = render(
      React.createElement(UnselectEnvironmentUI, {}),
    );

    // Verify UI shows success message
    await waitForText(
      lastFrame,
      /Active environment cleared for project config-project/,
    );

    // Verify the mock was called with the right parameters
    await waitForMockCall(vi.mocked(envConfig.validateAndSelectEnvironment));
    expect(envConfig.validateAndSelectEnvironment).toHaveBeenCalledWith(
      "config-project",
      null,
    );
  });

  it("should show error when no project is specified and none in config", async () => {
    // Mock empty project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue(null);

    const { lastFrame } = render(
      React.createElement(UnselectEnvironmentUI, {}),
    );

    await waitForText(
      lastFrame,
      /No project name found\. Either specify --project or create a gensx\.yaml file with a 'projectName' field\./,
    );

    // Verify process.exit was called
    await waitForProcessExit();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should show error when project does not exist", async () => {
    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    const { lastFrame } = render(
      React.createElement(UnselectEnvironmentUI, {
        projectName: "non-existent",
      }),
    );

    await waitForText(lastFrame, /Project non-existent does not exist/);

    // Verify process.exit was called
    await waitForProcessExit();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should show loading spinner initially", () => {
    // Mock project exists but never completes to simulate loading state
    vi.mocked(projectModel.checkProjectExists).mockImplementation(
      () =>
        new Promise<boolean>(() => {
          /* never resolves */
        }),
    );

    const { lastFrame } = render(
      React.createElement(UnselectEnvironmentUI, {
        projectName: "test-project",
      }),
    );

    // Check for spinner indicator
    expect(lastFrame()).toBeTruthy();
    expect(lastFrame()?.length).toBeGreaterThan(0);
  });
});
