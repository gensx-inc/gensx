import type { ReadStream } from "node:fs";

import * as fsSync from "node:fs";

import axios from "axios";
import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import * as buildCommand from "../../src/commands/build.js";
import { headlessDeploy } from "../../src/commands/headless-deploy.js";
import * as environmentModel from "../../src/models/environment.js";
import * as projectModel from "../../src/models/projects.js";
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
      existsSync: vi.fn().mockReturnValue(true),
    },
    createReadStream: vi.fn().mockReturnValue({ pipe: vi.fn() }),
    readFileSync: vi.fn().mockReturnValue(JSON.stringify({ version: "1.0.0" })),
    existsSync: vi.fn().mockReturnValue(true),
  };
});

vi.mock("axios");

vi.mock("../../src/commands/build.js", () => ({
  build: vi.fn(),
}));

vi.mock("../../src/utils/env-config.js", () => ({
  getSelectedEnvironment: vi.fn(),
  getEnvironmentForOperation: vi.fn(),
  validateAndSelectEnvironment: vi.fn(),
}));

vi.mock("../../src/utils/project-config.js", () => ({
  readProjectConfig: vi.fn(),
}));

vi.mock("../../src/models/projects.js", () => ({
  checkProjectExists: vi.fn(),
  createProject: vi.fn(),
}));

vi.mock("../../src/models/environment.js", () => ({
  checkEnvironmentExists: vi.fn(),
}));

// Mock FormData since it's not available in the test environment
vi.mock("form-data", () => {
  return {
    default: class MockFormData {
      append = vi.fn();
    },
  };
});

afterEach(() => {
  vi.resetAllMocks();
});

suite("headlessDeploy command", () => {
  const mockBuildResult = {
    bundleFile: "test-bundle.js",
    schemaFile: "test-schema.json",
    schemas: {
      workflow: {
        input: {
          type: "object" as const,
          properties: {},
          required: [],
        },
        output: {
          type: "object" as const,
          properties: {},
          required: [],
        },
      },
    },
  };

  beforeEach(() => {
    vi.mocked(buildCommand.build).mockResolvedValue(mockBuildResult);
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);
    vi.mocked(environmentModel.checkEnvironmentExists).mockResolvedValue(true);
    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: {
        id: "deploy-1",
        projectId: "project-1",
        projectName: "test-project",
        environmentId: "env-1",
        environmentName: "production",
        buildId: "build-1",
        bundleSize: 1000,
        workflows: [
          {
            id: "workflow-1",
            name: "test-workflow",
            inputSchema: {},
            outputSchema: {},
          },
        ],
      },
    });
    vi.spyOn(fsSync, "existsSync").mockReturnValue(true);
    vi.spyOn(fsSync, "createReadStream").mockReturnValue({ pipe: vi.fn() } as unknown as ReadStream);
  });

  it("should deploy successfully in headless mode", async () => {
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "test-project",
      environmentName: "production",
    });
    vi.mocked(envConfig.validateAndSelectEnvironment).mockResolvedValue(true);

    await headlessDeploy("workflow.ts", {
      project: "test-project",
      env: "production",
    });

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining(
        "/projects/test-project/environments/production/deploy",
      ),
      expect.any(Object),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("should throw if project is missing in headless mode", async () => {
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue(null);
    await expect(
      headlessDeploy("workflow.ts", { env: "production" }),
    ).rejects.toThrow(/No project name found/);
  });

  it("should throw if environment is missing in headless mode", async () => {
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "test-project",
    });
    await expect(
      headlessDeploy("workflow.ts", { project: "test-project" }),
    ).rejects.toThrow(/No environment specified/);
  });
});
