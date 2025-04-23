import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import { handleListEnvironments } from "../../../src/commands/environment/list.js";
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

vi.mock("../../../src/models/environment.js", () => ({
  listEnvironments: vi.fn(),
}));

vi.mock("../../../src/models/projects.js", () => ({
  checkProjectExists: vi.fn(),
}));

vi.mock("../../../src/utils/project-config.js", () => ({
  readProjectConfig: vi.fn(),
}));

// Mock console output
const originalConsoleInfo = console.info;
beforeEach(() => {
  console.info = vi.fn();
});

afterEach(() => {
  console.info = originalConsoleInfo;
  vi.resetAllMocks();
});

suite("environment list command", () => {
  it("should list environments for a specified project", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock environment list response
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

    await handleListEnvironments({ project: "test-project" });

    // Verify environments were fetched
    expect(environmentModel.listEnvironments).toHaveBeenCalledWith(
      "test-project",
    );

    // Verify console output was called
    expect(console.info).toHaveBeenCalledTimes(3); // Header + 2 environments
  });

  it("should use project name from config when not specified", async () => {
    // Mock project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "config-project",
    });

    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock environment list response
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue([]);

    await handleListEnvironments({});

    // Verify project name was pulled from config
    expect(environmentModel.listEnvironments).toHaveBeenCalledWith(
      "config-project",
    );
  });

  it("should throw error when no project is specified and none in config", async () => {
    // Mock empty project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue(null);

    await expect(handleListEnvironments({})).rejects.toThrow(
      "No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field.",
    );
  });

  it("should display message when project does not exist", async () => {
    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    await handleListEnvironments({ project: "non-existent" });

    // Verify environments were not fetched
    expect(environmentModel.listEnvironments).not.toHaveBeenCalled();
  });

  it("should handle case with no environments", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock empty environment list
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue([]);

    await handleListEnvironments({ project: "test-project" });

    // Verify console output was not called after success message
    expect(console.info).not.toHaveBeenCalled();
  });
});
