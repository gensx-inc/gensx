import { afterEach, expect, it, suite, vi } from "vitest";

import { handleSelectEnvironment } from "../../../src/commands/environment/select.js";
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

suite("environment select command", () => {
  it("should select environment for an existing project", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock validate and select environment
    vi.mocked(envConfig.validateAndSelectEnvironment).mockResolvedValue(true);

    await handleSelectEnvironment("development", { project: "test-project" });

    // Verify environment was selected
    expect(envConfig.validateAndSelectEnvironment).toHaveBeenCalledWith(
      "test-project",
      "development",
    );
  });

  it("should use project name from config when not specified", async () => {
    // Mock project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "config-project",
    });

    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock validate and select environment
    vi.mocked(envConfig.validateAndSelectEnvironment).mockResolvedValue(true);

    await handleSelectEnvironment("staging", {});

    // Verify environment was selected with config project name
    expect(envConfig.validateAndSelectEnvironment).toHaveBeenCalledWith(
      "config-project",
      "staging",
    );
  });

  it("should throw error when no project is specified and none in config", async () => {
    // Mock empty project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue(null);

    await expect(handleSelectEnvironment("production", {})).rejects.toThrow(
      "No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field.",
    );
  });

  it("should display message when project does not exist", async () => {
    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    await handleSelectEnvironment("development", { project: "non-existent" });

    // Verify environment selection was not attempted
    expect(envConfig.validateAndSelectEnvironment).not.toHaveBeenCalled();
  });

  it("should handle case when environment does not exist", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock environment doesn't exist
    vi.mocked(envConfig.validateAndSelectEnvironment).mockResolvedValue(false);

    await handleSelectEnvironment("non-existent-env", {
      project: "test-project",
    });

    // Verify environment selection was attempted
    expect(envConfig.validateAndSelectEnvironment).toHaveBeenCalledWith(
      "test-project",
      "non-existent-env",
    );
  });

  it("should handle errors during environment selection", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock error during environment selection
    vi.mocked(envConfig.validateAndSelectEnvironment).mockRejectedValue(
      new Error("Failed to select environment"),
    );

    await handleSelectEnvironment("development", { project: "test-project" });

    // Verify environment selection was attempted
    expect(envConfig.validateAndSelectEnvironment).toHaveBeenCalledWith(
      "test-project",
      "development",
    );
  });
});
