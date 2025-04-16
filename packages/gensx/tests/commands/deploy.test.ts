import fs from "node:fs";

import axios from "axios";
import enquirer from "enquirer";
import { Definition } from "typescript-json-schema";
import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import * as buildCommand from "../../src/commands/build.js";
import { deploy } from "../../src/commands/deploy.js";
import * as environmentModel from "../../src/models/environment.js";
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

  it("should prompt for environment selection when no environment is selected", async () => {
    // Mock no selected environment
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(null);

    // Mock available environments
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue([
      { id: "1", name: "dev", projectId: "p1", createdAt: "", updatedAt: "" },
      { id: "2", name: "prod", projectId: "p1", createdAt: "", updatedAt: "" },
    ]);

    // Mock user selects existing environment
    vi.mocked(enquirer.prompt).mockResolvedValueOnce({ environment: "dev" } as {
      environment: string;
    });

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

    interface PromptOptions {
      type: string;
      name: string;
      message: string;
      choices?: { name: string; value: string }[];
      initial?: boolean;
    }

    expect(enquirer.prompt).toHaveBeenCalledWith(
      expect.objectContaining<PromptOptions>({
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

  it("should allow creating new environment during deployment", async () => {
    // Mock no selected environment
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(null);

    // Mock available environments
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue([
      { id: "1", name: "dev", projectId: "p1", createdAt: "", updatedAt: "" },
    ]);

    // Mock user chooses to create new environment
    vi.mocked(enquirer.prompt)
      .mockResolvedValueOnce({ environment: "Create a new environment" } as {
        environment: string;
      })
      .mockResolvedValueOnce({ name: "staging" } as { name: string });

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

  it("should create first environment if none exist", async () => {
    // Mock no selected environment
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(null);

    // Mock no existing environments
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue([]);

    // Mock user creates first environment
    vi.mocked(enquirer.prompt).mockResolvedValueOnce({ name: "production" } as {
      name: string;
    });

    // Mock environment creation
    vi.mocked(environmentModel.createEnvironment).mockResolvedValue({
      id: "env-1",
      name: "production",
    });

    await deploy("workflow.ts", { project: "test-project" });

    // Verify new environment was created
    expect(environmentModel.createEnvironment).toHaveBeenCalledWith(
      "test-project",
      "production",
    );

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
      "\nError: No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field.",
    );
  });
});
