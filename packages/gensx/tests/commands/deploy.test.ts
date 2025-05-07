import axios from "axios";
import { Definition } from "typescript-json-schema";
import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import * as buildCommand from "../../src/commands/build.js";
import { deploy } from "../../src/commands/deploy.js";
import * as configUtils from "../../src/utils/config.js";
import * as envConfig from "../../src/utils/env-config.js";
import * as projectConfig from "../../src/utils/project-config.js";

// Mock dependencies
vi.mock("node:fs", async () => {
  const actual = (await vi.importActual("node:fs")) as unknown;
  const actualTyped = actual as typeof import("node:fs") & {
    default?: Record<string, unknown>;
  };
  return {
    ...actualTyped,
    default: {
      ...(actualTyped.default ?? {}),
      createReadStream: vi.fn().mockReturnValue({ pipe: vi.fn() }),
      readFileSync: vi
        .fn()
        .mockReturnValue(JSON.stringify({ version: "1.0.0" })),
    },
    createReadStream: vi.fn().mockReturnValue({ pipe: vi.fn() }),
    readFileSync: vi.fn().mockReturnValue(JSON.stringify({ version: "1.0.0" })),
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
  getEnvironmentForOperation: vi.fn(),
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
        id: "deploy-1",
        projectId: "project-1",
        projectName: "test-project",
        deploymentId: "deployment-1",
        bundleSize: 1000,
        workflows: [],
      },
    });
  });

  it("should use specified environment from options", async () => {
    // Mock getEnvironmentForOperation to return the specified environment
    vi.mocked(envConfig.getEnvironmentForOperation).mockResolvedValue(
      "production",
    );

    await deploy("workflow.ts", {
      project: "test-project",
      env: "production",
    });

    // Verify getEnvironmentForOperation was called with correct arguments
    expect(envConfig.getEnvironmentForOperation).toHaveBeenCalledWith(
      "test-project",
      "production",
      expect.any(Object),
      true,
      undefined,
    );

    // Verify deployment was made with correct environment
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/environments/production/deploy"),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("should use selected environment after user confirms", async () => {
    // Mock getEnvironmentForOperation to return the selected environment
    vi.mocked(envConfig.getEnvironmentForOperation).mockResolvedValue(
      "staging",
    );

    await deploy("workflow.ts", { project: "test-project" });

    // Verify getEnvironmentForOperation was called with correct arguments
    expect(envConfig.getEnvironmentForOperation).toHaveBeenCalledWith(
      "test-project",
      undefined,
      expect.any(Object),
      true,
      undefined,
    );

    // Verify deployment was made with selected environment
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/environments/staging/deploy"),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("should prompt for environment selection when no environment is selected and project exists", async () => {
    // Mock getEnvironmentForOperation to return the selected environment
    vi.mocked(envConfig.getEnvironmentForOperation).mockResolvedValue("dev");

    await deploy("workflow.ts", { project: "test-project" });

    // Verify getEnvironmentForOperation was called with correct arguments
    expect(envConfig.getEnvironmentForOperation).toHaveBeenCalledWith(
      "test-project",
      undefined,
      expect.any(Object),
      true,
      undefined,
    );

    // Verify deployment was made with selected environment
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/environments/dev/deploy"),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("should allow creating new environment during deployment when project exists", async () => {
    // Mock getEnvironmentForOperation to return the new environment
    vi.mocked(envConfig.getEnvironmentForOperation).mockResolvedValue(
      "staging",
    );

    await deploy("workflow.ts", { project: "test-project" });

    // Verify getEnvironmentForOperation was called with correct arguments
    expect(envConfig.getEnvironmentForOperation).toHaveBeenCalledWith(
      "test-project",
      undefined,
      expect.any(Object),
      true,
      undefined,
    );

    // Verify deployment was made with new environment
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/environments/staging/deploy"),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("should create new project and environment when project doesn't exist", async () => {
    // Mock getEnvironmentForOperation to return the new environment
    vi.mocked(envConfig.getEnvironmentForOperation).mockResolvedValue(
      "staging",
    );

    await deploy("workflow.ts", { project: "test-project" });

    // Verify getEnvironmentForOperation was called with correct arguments
    expect(envConfig.getEnvironmentForOperation).toHaveBeenCalledWith(
      "test-project",
      undefined,
      expect.any(Object),
      true,
      undefined,
    );

    // Verify deployment was made with new environment
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/environments/staging/deploy"),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("should create first environment if none exist", async () => {
    // Mock getEnvironmentForOperation to return the first environment
    vi.mocked(envConfig.getEnvironmentForOperation).mockResolvedValue(
      "production",
    );

    await deploy("workflow.ts", { project: "test-project" });

    // Verify getEnvironmentForOperation was called with correct arguments
    expect(envConfig.getEnvironmentForOperation).toHaveBeenCalledWith(
      "test-project",
      undefined,
      expect.any(Object),
      true,
      undefined,
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

    // Mock getEnvironmentForOperation to return the specified environment
    vi.mocked(envConfig.getEnvironmentForOperation).mockResolvedValue(
      "production",
    );

    await deploy("workflow.ts", { env: "production" });

    // Verify getEnvironmentForOperation was called with correct arguments
    expect(envConfig.getEnvironmentForOperation).toHaveBeenCalledWith(
      "config-project",
      "production",
      expect.any(Object),
      true,
      undefined,
    );

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

    // Mock getEnvironmentForOperation to return the new environment
    vi.mocked(envConfig.getEnvironmentForOperation).mockResolvedValue(
      "development",
    );

    await deploy("workflow.ts", {});

    // Verify getEnvironmentForOperation was called with correct arguments
    expect(envConfig.getEnvironmentForOperation).toHaveBeenCalledWith(
      "new-project",
      undefined,
      expect.any(Object),
      true,
      undefined,
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

    // Mock getEnvironmentForOperation to return the default environment
    vi.mocked(envConfig.getEnvironmentForOperation).mockResolvedValue(
      "default",
    );

    await deploy("workflow.ts", {});

    // Verify getEnvironmentForOperation was called with correct arguments
    expect(envConfig.getEnvironmentForOperation).toHaveBeenCalledWith(
      "new-project",
      undefined,
      expect.any(Object),
      true,
      undefined,
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

  it("should skip prompts when yes flag is set", async () => {
    // Mock project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "test-project",
    });

    // Mock getEnvironmentForOperation to return the specified environment
    vi.mocked(envConfig.getEnvironmentForOperation).mockResolvedValue(
      "production",
    );

    await deploy("workflow.ts", { yes: true });

    // Verify getEnvironmentForOperation was called with yes flag
    expect(envConfig.getEnvironmentForOperation).toHaveBeenCalledWith(
      "test-project",
      undefined,
      expect.any(Object),
      true,
      true,
    );

    // Verify deployment was made with correct environment
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/environments/production/deploy"),
      expect.any(Object),
      expect.any(Object),
    );
  });
});
