import { afterEach, expect, it, suite, vi } from "vitest";

import { handleUnselectEnvironment } from "../../../src/commands/environment/unselect.js";
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
  validateAndSelectEnvironment: vi.fn(),
}));

vi.mock("../../../src/utils/project-config.js", () => ({
  readProjectConfig: vi.fn(),
}));

// Reset mocks
afterEach(() => {
  vi.resetAllMocks();
});

suite("environment unselect command", () => {
  it("should unselect environment for an existing project", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock validate and unselect environment
    vi.mocked(envConfig.validateAndSelectEnvironment).mockResolvedValue(true);

    await handleUnselectEnvironment({ project: "test-project" });

    // Verify environment was unselected
    expect(envConfig.validateAndSelectEnvironment).toHaveBeenCalledWith(
      "test-project",
      null,
    );
  });

  it("should use project name from config when not specified", async () => {
    // Mock project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "config-project",
    });

    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock validate and unselect environment
    vi.mocked(envConfig.validateAndSelectEnvironment).mockResolvedValue(true);

    await handleUnselectEnvironment({});

    // Verify environment was unselected with config project name
    expect(envConfig.validateAndSelectEnvironment).toHaveBeenCalledWith(
      "config-project",
      null,
    );
  });

  it("should throw error when no project is specified and none in config", async () => {
    // Mock empty project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue(null);

    await expect(handleUnselectEnvironment({})).rejects.toThrow(
      "No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field.",
    );
  });

  it("should display message when project does not exist", async () => {
    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    await handleUnselectEnvironment({ project: "non-existent" });

    // Verify environment unselection was not attempted
    expect(envConfig.validateAndSelectEnvironment).not.toHaveBeenCalled();
  });

  it("should handle errors during environment unselection", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock error during environment unselection
    vi.mocked(envConfig.validateAndSelectEnvironment).mockRejectedValue(
      new Error("Failed to unselect environment"),
    );

    await handleUnselectEnvironment({ project: "test-project" });

    // Verify environment unselection was attempted
    expect(envConfig.validateAndSelectEnvironment).toHaveBeenCalledWith(
      "test-project",
      null,
    );
  });
});
