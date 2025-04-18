import enquirer from "enquirer";
import { afterEach, expect, it, suite, vi } from "vitest";

import { handleCreateEnvironment } from "../../../src/commands/environment/create.js";
import * as environmentModel from "../../../src/models/environment.js";
import * as projectModel from "../../../src/models/projects.js";
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

vi.mock("enquirer", () => ({
  default: {
    prompt: vi.fn(),
  },
}));

vi.mock("../../../src/models/environment.js", () => ({
  createEnvironment: vi.fn(),
}));

vi.mock("../../../src/models/projects.js", () => ({
  checkProjectExists: vi.fn(),
  createProject: vi.fn(),
}));

vi.mock("../../../src/utils/project-config.js", () => ({
  readProjectConfig: vi.fn(),
}));

// Reset mocks
afterEach(() => {
  vi.resetAllMocks();
});

suite("environment create command", () => {
  it("should create environment for an existing project", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock create environment
    vi.mocked(environmentModel.createEnvironment).mockResolvedValue({
      id: "env-1",
      name: "development",
    });

    await handleCreateEnvironment("development", { project: "test-project" });

    // Verify environment was created
    expect(environmentModel.createEnvironment).toHaveBeenCalledWith(
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

    // Mock create environment
    vi.mocked(environmentModel.createEnvironment).mockResolvedValue({
      id: "env-1",
      name: "staging",
    });

    await handleCreateEnvironment("staging", {});

    // Verify environment was created with config project name
    expect(environmentModel.createEnvironment).toHaveBeenCalledWith(
      "config-project",
      "staging",
    );
  });

  it("should throw error when no project is specified and none in config", async () => {
    // Mock empty project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue(null);

    await expect(handleCreateEnvironment("production", {})).rejects.toThrow(
      "No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field.",
    );
  });

  it("should prompt to create project when project does not exist and user confirms", async () => {
    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    // Mock user confirms project creation
    vi.mocked(enquirer.prompt).mockResolvedValue({ confirm: true });

    // Mock create project
    vi.mocked(projectModel.createProject).mockResolvedValue({
      id: "project-1",
      name: "new-project",
    });

    await handleCreateEnvironment("development", { project: "new-project" });

    // Verify project was created with environment
    expect(projectModel.createProject).toHaveBeenCalledWith(
      "new-project",
      "development",
    );

    // Verify environment was not created separately (it's created with the project)
    expect(environmentModel.createEnvironment).not.toHaveBeenCalled();
  });

  it("should not create environment when project does not exist and user cancels", async () => {
    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    // Mock user cancels project creation
    vi.mocked(enquirer.prompt).mockResolvedValue({ confirm: false });

    await handleCreateEnvironment("development", { project: "non-existent" });

    // Verify project was not created
    expect(projectModel.createProject).not.toHaveBeenCalled();

    // Verify environment was not created
    expect(environmentModel.createEnvironment).not.toHaveBeenCalled();
  });

  it("should handle error when creating environment", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock environment creation fails
    vi.mocked(environmentModel.createEnvironment).mockRejectedValue(
      new Error("Failed to create environment"),
    );

    await handleCreateEnvironment("development", { project: "test-project" });

    // Verify environment creation was attempted
    expect(environmentModel.createEnvironment).toHaveBeenCalledWith(
      "test-project",
      "development",
    );
  });
});
