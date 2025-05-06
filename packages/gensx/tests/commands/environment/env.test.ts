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

import { ShowEnvironmentUI } from "../../../src/commands/environment/show.js";
import * as projectModel from "../../../src/models/projects.js";

// Create a temporary directory for our tests
let tempDir: string;
let origConfigDir: string | undefined;
let origCwd: typeof process.cwd;

// Mock only the dependencies we need to control
vi.mock("../../../src/models/projects.js", () => ({
  checkProjectExists: vi.fn(),
}));

// Set up and tear down the test environment
beforeAll(async () => {
  // Save original process.cwd
  origCwd = process.cwd;

  // Create a temp directory for our tests
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gensx-env-test-"));

  // Create project and config directories
  await fs.mkdir(path.join(tempDir, "project"), { recursive: true });
  await fs.mkdir(path.join(tempDir, ".gensx", "projects"), { recursive: true });

  // Override the config directory by mocking getConfigPaths
  origConfigDir = process.env.GENSX_CONFIG_DIR;
  process.env.GENSX_CONFIG_DIR = path.join(tempDir, ".gensx");
});

afterAll(async () => {
  // Restore original environment
  process.cwd = origCwd;
  if (origConfigDir) {
    process.env.GENSX_CONFIG_DIR = origConfigDir;
  } else {
    delete process.env.GENSX_CONFIG_DIR;
  }

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

suite("env command", () => {
  it("should show selected environment for a specified project", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Create a real environment config file
    const projectsDir = path.join(tempDir, ".gensx", "projects");
    await fs.writeFile(
      path.join(projectsDir, "test-project.json"),
      JSON.stringify({ selectedEnvironment: "development" }),
      "utf-8",
    );

    const { lastFrame } = render(
      React.createElement(ShowEnvironmentUI, { projectName: "test-project" }),
    );

    // Verify selected environment is shown
    await waitForText(
      lastFrame,
      /Active environment for project\s+test-project/,
    );
    await waitForText(lastFrame, /development/);
  });

  it("should use project name from config when not specified", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Create a real gensx.yaml file in the project directory
    await fs.writeFile(
      path.join(tempDir, "project", "gensx.yaml"),
      `# GenSX Project Configuration
projectName: config-project
`,
      "utf-8",
    );

    // Create a real environment config file
    const projectsDir = path.join(tempDir, ".gensx", "projects");
    await fs.writeFile(
      path.join(projectsDir, "config-project.json"),
      JSON.stringify({ selectedEnvironment: "staging" }),
      "utf-8",
    );

    const { lastFrame } = render(React.createElement(ShowEnvironmentUI, {}));

    // Verify project name was pulled from config
    await waitForText(
      lastFrame,
      /Active environment for project\s+config-project/,
    );
    await waitForText(lastFrame, /staging/);
  });

  it("should show error when no project is specified and none in config", async () => {
    // No gensx.yaml file, so it will fail to find a project

    const { lastFrame } = render(React.createElement(ShowEnvironmentUI, {}));

    await waitForText(
      lastFrame,
      /No project name found\. Either specify --project or create a gensx\.yaml file with a 'projectName' field\./,
    );
  });

  it("should show error when project does not exist", async () => {
    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    const { lastFrame } = render(
      React.createElement(ShowEnvironmentUI, { projectName: "non-existent" }),
    );

    await waitForText(lastFrame, /Project non-existent does not exist/);
  });

  it("should show message when no environment is selected", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Create an empty environment config file (no selection)
    const projectsDir = path.join(tempDir, ".gensx", "projects");
    await fs.writeFile(
      path.join(projectsDir, "test-project.json"),
      JSON.stringify({}),
      "utf-8",
    );

    const { lastFrame } = render(
      React.createElement(ShowEnvironmentUI, { projectName: "test-project" }),
    );

    // Verify message about no active environment
    await waitForText(
      lastFrame,
      /No active environment set for project\s+test-project/,
    );
    await waitForText(lastFrame, /Run\s+gensx env select/);
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
      React.createElement(ShowEnvironmentUI, { projectName: "test-project" }),
    );

    // Check for spinner indicator
    expect(lastFrame()).toBeTruthy();
    expect(lastFrame()?.length).toBeGreaterThan(0);
  });
});
