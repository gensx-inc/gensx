import fs from "node:fs";

import axios from "axios";
import enquirer from "enquirer";
import { Definition } from "typescript-json-schema";
import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import * as buildCommand from "../../src/commands/build.js";
import { deploy } from "../../src/commands/deploy.js";
import * as environmentModel from "../../src/models/environment.js";
import * as projectModel from "../../src/models/projects.js";
import * as configUtils from "../../src/utils/config.js";
import * as envConfig from "../../src/utils/env-config.js";
import * as projectConfig from "../../src/utils/project-config.js";

// Mock dependencies
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof fs>();
  return {
    ...actual,
    default: {
      createReadStream: vi.fn().mockReturnValue({ pipe: vi.fn() }),
      readFileSync: vi
        .fn()
        .mockReturnValue(JSON.stringify({ version: "1.0.0" })),
    },
  };
});

vi.mock("ora", () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
  }),
}));

vi.mock("axios");

vi.mock("enquirer", () => ({
  default: {
    prompt: vi.fn(),
  },
}));

vi.mock("../../src/commands/build.js", () => ({
  build: vi.fn(),
}));

vi.mock("../../src/models/environment.js", () => ({
  listEnvironments: vi.fn(),
  createEnvironment: vi.fn(),
}));

vi.mock("../../src/utils/config.js", () => ({
  getAuth: vi.fn(),
}));

vi.mock("../../src/utils/env-config.js", () => ({
  getSelectedEnvironment: vi.fn(),
}));

vi.mock("../../src/utils/project-config.js", () => ({
  readProjectConfig: vi.fn(),
}));

vi.mock("../../src/models/projects.js", () => ({
  checkProjectExists: vi.fn(),
  createProject: vi.fn(),
}));

// Mock FormData since it's not available in the test environment
vi.mock("form-data", () => {
  return {
    default: class MockFormData {
      append = vi.fn();
    },
  };
});

// Mock process.exit
const mockExit = vi
  .spyOn(process, "exit")
  .mockImplementation(() => undefined as never);

// Mock console.error to prevent output during tests
// eslint-disable-next-line @typescript-eslint/no-empty-function
vi.spyOn(console, "error").mockImplementation(() => {});

// Reset mocks
afterEach(() => {
  vi.resetAllMocks();
  mockExit.mockReset();
});

suite("deploy command", () => {
  const mockAuth = {
    token: "test-token",
    org: "test-org",
    apiBaseUrl: "https://api.test.com",
    consoleBaseUrl: "https://console.test.com",
  };

  const mockBuildResult = {
    bundleFile: "test-bundle.js",
    schemaFile: "test-schema.json",
    schemas: {
      workflow: {
        input: {
          type: "object" as const,
          properties: {},
          required: [],
        } satisfies Definition,
        output: {
          type: "object" as const,
          properties: {},
          required: [],
        } satisfies Definition,
      },
    },
  };

  beforeEach(() => {
    // Setup common mocks
    vi.mocked(configUtils.getAuth).mockResolvedValue(mockAuth);
    vi.mocked(buildCommand.build).mockResolvedValue(mockBuildResult);
    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: {
        status: "ok",
        data: {
          id: "deploy-1",
          projectId: "project-1",
          projectName: "test-project",
          deploymentId: "deployment-1",
          bundleSize: 1000,
          workflows: [],
        },
      },
    });
  });

  it("should use specified environment from options", async () => {
    await deploy("workflow.ts", {
      project: "test-project",
      environment: "production",
    });

    // Verify environment selection was not needed
    expect(environmentModel.listEnvironments).not.toHaveBeenCalled();
    expect(enquirer.prompt).not.toHaveBeenCalled();

    // Verify deployment was made with correct environment
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/environments/production/deploy"),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("should use selected environment after user confirms", async () => {
    // Mock selected environment exists
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue("staging");

    // Mock user confirms using selected environment
    vi.mocked(enquirer.prompt).mockResolvedValueOnce({ confirm: true } as {
      confirm: boolean;
    });

    await deploy("workflow.ts", { project: "test-project" });

    // Verify user was prompted to confirm
    expect(enquirer.prompt).toHaveBeenCalledWith({
      type: "confirm",
      name: "confirm",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      message: expect.stringMatching(/staging/),
      initial: true,
    });

    // Verify deployment was made with selected environment
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/environments/staging/deploy"),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("should prompt for environment selection when no environment is selected and project exists", async () => {
    // Mock no selected environment
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(null);

    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock available environments
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue([
      { id: "1", name: "dev", projectId: "p1", createdAt: "", updatedAt: "" },
      { id: "2", name: "prod", projectId: "p1", createdAt: "", updatedAt: "" },
    ]);

    // Mock user selects existing environment
    vi.mocked(enquirer.prompt).mockResolvedValueOnce({ environment: "dev" });

    await deploy("workflow.ts", { project: "test-project" });

    // Verify environments were listed
    expect(environmentModel.listEnvironments).toHaveBeenCalledWith(
      "test-project",
    );

    // Verify user was shown selection prompt
    const expectedChoices = [
      { name: "dev", value: "dev" },
      { name: "prod", value: "prod" },
      { name: "Create a new environment", value: "Create a new environment" },
    ];

    expect(enquirer.prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "select",
        name: "environment",
        message: "Select an environment to use:",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        choices: expect.arrayContaining(expectedChoices),
      }),
    );

    // Verify deployment was made with selected environment
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/environments/dev/deploy"),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("should allow creating new environment during deployment when project exists", async () => {
    // Mock no selected environment
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(null);

    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock available environments
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue([
      { id: "1", name: "dev", projectId: "p1", createdAt: "", updatedAt: "" },
    ]);

    // Mock user chooses to create new environment
    vi.mocked(enquirer.prompt)
      .mockResolvedValueOnce({ environment: "Create a new environment" })
      .mockResolvedValueOnce({ name: "staging" });

    // Mock environment creation
    vi.mocked(environmentModel.createEnvironment).mockResolvedValue({
      id: "env-1",
      name: "staging",
    });

    await deploy("workflow.ts", { project: "test-project" });

    // Verify new environment was created
    expect(environmentModel.createEnvironment).toHaveBeenCalledWith(
      "test-project",
      "staging",
    );

    // Verify deployment was made with new environment
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/environments/staging/deploy"),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("should create new project and environment when project doesn't exist", async () => {
    // Mock no selected environment
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(null);

    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    // Mock no existing environments (not needed since project doesn't exist)
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue([]);

    // Mock user provides environment name
    vi.mocked(enquirer.prompt).mockResolvedValueOnce({ name: "staging" });

    // Mock project creation
    vi.mocked(projectModel.createProject).mockResolvedValue({
      id: "project-1",
      name: "test-project",
    });

    await deploy("workflow.ts", { project: "test-project" });

    // Verify project was created with new environment
    expect(projectModel.createProject).toHaveBeenCalledWith(
      "test-project",
      "staging",
    );

    // Verify environment was not created separately
    expect(environmentModel.createEnvironment).not.toHaveBeenCalled();

    // Verify deployment was made with new environment
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/environments/staging/deploy"),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("should create first environment if none exist", async () => {
    // Mock no selected environment
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(null);

    // Mock no existing environments
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue([]);

    // Mock project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "test-project",
    });

    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    // Mock user creates first environment
    vi.mocked(enquirer.prompt).mockResolvedValueOnce({ name: "production" });

    // Mock project creation
    vi.mocked(projectModel.createProject).mockResolvedValue({
      id: "project-1",
      name: "test-project",
    });

    // Mock successful deployment
    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: {
        status: "ok",
        data: {
          id: "deploy-1",
          projectId: "project-1",
          projectName: "test-project",
          deploymentId: "deployment-1",
          bundleSize: 1000,
          workflows: [],
        },
      },
    });

    await deploy("workflow.ts", { project: "test-project" });

    // Verify project was created with first environment
    expect(projectModel.createProject).toHaveBeenCalledWith(
      "test-project",
      "production",
    );

    // Verify environment was not created separately (it's created with the project)
    expect(environmentModel.createEnvironment).not.toHaveBeenCalled();

    // Verify deployment was made with new environment
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/environments/production/deploy"),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("should use project name from config when not specified", async () => {
    // Mock project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "config-project",
    });

    // Mock environment is specified
    await deploy("workflow.ts", { environment: "production" });

    // Verify deployment was made with config project name
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/projects/config-project/"),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("should throw error when no project is specified and none in config", async () => {
    // Mock empty project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue(null);

    await deploy("workflow.ts", {});

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(
        "No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field",
      ),
    );
  });

  it("should create new project and environment when project doesn't exist and user confirms", async () => {
    // Mock project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "new-project",
    });

    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    // Mock user confirms project creation and provides environment name
    vi.mocked(enquirer.prompt).mockResolvedValueOnce({ name: "development" });

    // Mock project creation
    vi.mocked(projectModel.createProject).mockResolvedValue({
      id: "project-1",
      name: "new-project",
    });

    // Mock successful deployment
    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: {
        status: "ok",
        data: {
          id: "deploy-1",
          projectId: "project-1",
          projectName: "new-project",
          deploymentId: "deployment-1",
          bundleSize: 1000,
          workflows: [],
        },
      },
    });

    await deploy("workflow.ts", {});

    // Verify project existence was checked
    expect(projectModel.checkProjectExists).toHaveBeenCalledWith("new-project");

    // Verify project was created with the new environment
    expect(projectModel.createProject).toHaveBeenCalledWith(
      "new-project",
      "development",
    );

    // Verify deployment was made with new project and environment
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining(
        "/projects/new-project/environments/development/deploy",
      ),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("should handle project creation when no environments exist", async () => {
    // Mock project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "new-project",
    });

    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    // Mock user provides environment name with default value
    vi.mocked(enquirer.prompt).mockResolvedValueOnce({ name: "default" });

    // Mock project creation
    vi.mocked(projectModel.createProject).mockResolvedValue({
      id: "project-1",
      name: "new-project",
    });

    // Mock successful deployment
    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: {
        status: "ok",
        data: {
          id: "deploy-1",
          projectId: "project-1",
          projectName: "new-project",
          deploymentId: "deployment-1",
          bundleSize: 1000,
          workflows: [],
        },
      },
    });

    await deploy("workflow.ts", {});

    // Verify project was created with default environment
    expect(projectModel.createProject).toHaveBeenCalledWith(
      "new-project",
      "default",
    );

    // Verify deployment was made with new project and default environment
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining(
        "/projects/new-project/environments/default/deploy",
      ),
      expect.any(Object),
      expect.any(Object),
    );
  });
});
