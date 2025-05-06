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
import {
  cleanupProjectFiles,
  cleanupTestEnvironment,
  setupTestEnvironment,
  waitForMockCall,
  waitForText,
} from "../../test-helpers.js";

// Setup test variables
let tempDir: string;
let origCwd: typeof process.cwd;
let origConfigDir: string | undefined;

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

// Set up and tear down the test environment
beforeAll(async () => {
  const setup = await setupTestEnvironment("unselect-test");
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
