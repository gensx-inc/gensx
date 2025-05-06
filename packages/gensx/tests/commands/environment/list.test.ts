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

import { ListEnvironmentsUI } from "../../../src/commands/environment/list.js";
import * as environmentModel from "../../../src/models/environment.js";
import * as projectModel from "../../../src/models/projects.js";

// Create a temporary directory for our tests
let tempDir: string;
let origConfigDir: string | undefined;
let origCwd: typeof process.cwd;

// Mock dependencies that would make API calls
vi.mock("../../../src/models/environment.js", () => ({
  listEnvironments: vi.fn(),
}));

vi.mock("../../../src/models/projects.js", () => ({
  checkProjectExists: vi.fn(),
}));

// Original process.exit to restore later
const originalExit = process.exit;

// Set up and tear down the test environment
beforeAll(async () => {
  // Save original process.cwd
  origCwd = process.cwd;

  // Create a temp directory for our tests
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gensx-list-test-"));

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

suite("environment list Ink UI", () => {
  it("should list environments for a specified project", async () => {
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Setup environment config with a selected environment
    const projectsDir = path.join(tempDir, ".gensx", "projects");
    await fs.writeFile(
      path.join(projectsDir, "test-project.json"),
      JSON.stringify({ selectedEnvironment: "development" }),
      "utf-8",
    );

    const mockEnvironments = [
      {
        id: "env-1",
        name: "development",
        projectId: "project-1",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-02T00:00:00.000Z",
      },
      {
        id: "env-2",
        name: "production",
        projectId: "project-1",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-03T00:00:00.000Z",
      },
    ];
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue(
      mockEnvironments,
    );

    const { lastFrame } = render(
      React.createElement(ListEnvironmentsUI, { projectName: "test-project" }),
    );

    await waitForText(
      lastFrame,
      /Found\s+2\s+environments for project\s+test-project/,
    );
    await waitForText(lastFrame, /development/);
    await waitForText(lastFrame, /production/);
    await waitForText(lastFrame, /Active environment:\s+development/);
  });

  it("should use project name from config when not specified", async () => {
    // Create a real gensx.yaml config file
    await fs.writeFile(
      path.join(tempDir, "project", "gensx.yaml"),
      `# GenSX Project Configuration
projectName: config-project
`,
      "utf-8",
    );

    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue([]);

    const { lastFrame } = render(React.createElement(ListEnvironmentsUI));

    await waitForText(
      lastFrame,
      /Found\s+0\s+environments for project\s+config-project/,
    );
    await waitForText(lastFrame, /No environments found/);
  });

  it("should show error when no project is specified and none in config", async () => {
    // No gensx.yaml file, so it will fail to find a project
    const { lastFrame } = render(React.createElement(ListEnvironmentsUI));

    await waitForText(
      lastFrame,
      /No project name found\. Either specify --project or create a gensx\.yaml file with a 'projectName' field\./,
    );

    // Verify process.exit was called
    await waitForProcessExit();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should show error when project does not exist", async () => {
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    const { lastFrame } = render(
      React.createElement(ListEnvironmentsUI, { projectName: "non-existent" }),
    );

    await waitForText(lastFrame, /Project non-existent does not exist/);

    // Verify process.exit was called
    await waitForProcessExit();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should show loading spinner initially", () => {
    // Mock checkProjectExists to never resolve, keeping component in loading state
    vi.mocked(projectModel.checkProjectExists).mockImplementation(
      () =>
        new Promise<boolean>(() => {
          /* never resolves */
        }),
    );

    const { lastFrame } = render(
      React.createElement(ListEnvironmentsUI, { projectName: "any-project" }),
    );

    // Check for spinner indicator
    expect(lastFrame()).toBeTruthy();
    expect(lastFrame()?.length).toBeGreaterThan(0);
  });
});
