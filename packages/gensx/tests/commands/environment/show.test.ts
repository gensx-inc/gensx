import { afterEach, expect, it, suite, vi } from "vitest";

import { handleShowEnvironment } from "../../../src/commands/environment/show.js";
import * as projectModel from "../../../src/models/projects.js";
import * as envConfig from "../../../src/utils/env-config.js";
import * as projectConfig from "../../../src/utils/project-config.js";

// Mock dependencies
vi.mock("ora", () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
  }),
}));

vi.mock("../../../src/models/projects.js", () => ({
  checkProjectExists: vi.fn(),
}));

vi.mock("../../../src/utils/env-config.js", () => ({
  getSelectedEnvironment: vi.fn(),
}));

vi.mock("../../../src/utils/project-config.js", () => ({
  readProjectConfig: vi.fn(),
}));

// Reset mocks
afterEach(() => {
  vi.resetAllMocks();
});

suite("environment show command", () => {
  it("should show selected environment for a specified project", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock selected environment
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(
      "development",
    );

    await handleShowEnvironment({ project: "test-project" });

    // Verify selected environment was fetched
    expect(envConfig.getSelectedEnvironment).toHaveBeenCalledWith(
      "test-project",
    );
  });

  it("should use project name from config when not specified", async () => {
    // Mock project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "config-project",
    });

    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock selected environment
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue("staging");

    await handleShowEnvironment({});

    // Verify project name was pulled from config
    expect(envConfig.getSelectedEnvironment).toHaveBeenCalledWith(
      "config-project",
    );
  });

  it("should throw error when no project is specified and none in config", async () => {
    // Mock empty project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue(null);

    await expect(handleShowEnvironment({})).rejects.toThrow(
      "No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field.",
    );
  });

  it("should handle case when project does not exist", async () => {
    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    await handleShowEnvironment({ project: "non-existent" });

    // Verify environment was not fetched
    expect(envConfig.getSelectedEnvironment).not.toHaveBeenCalled();
  });

  it("should handle case when no environment is selected", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock no selected environment
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(null);

    await handleShowEnvironment({ project: "test-project" });

    // Verify selected environment was fetched
    expect(envConfig.getSelectedEnvironment).toHaveBeenCalledWith(
      "test-project",
    );
  });

  it("should handle errors when getting selected environment", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock error when getting selected environment
    vi.mocked(envConfig.getSelectedEnvironment).mockRejectedValue(
      new Error("Test error"),
    );

    await handleShowEnvironment({ project: "test-project" });

    // Verify selected environment was fetched
    expect(envConfig.getSelectedEnvironment).toHaveBeenCalledWith(
      "test-project",
    );
  });
});
