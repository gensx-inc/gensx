import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import axios from "axios";
import { render } from "ink-testing-library";
import React from "react";
import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import * as buildCommand from "../../src/commands/build.js";
import { DeployUI } from "../../src/commands/deploy.js";
import { headlessDeploy } from "../../src/commands/headless-deploy.js";
import * as projectModel from "../../src/models/projects.js";
import * as envConfig from "../../src/utils/env-config.js";
import * as projectConfig from "../../src/utils/project-config.js";
import { waitForText } from "../test-helpers.js";

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

// Mock EnvironmentResolver component
vi.mock("../../src/components/EnvironmentResolver.js", () => ({
  EnvironmentResolver: ({
    onResolved,
  }: {
    onResolved: (env: string) => void;
  }) => {
    // Call onResolved immediately with the environment
    onResolved("production");
    return null;
  },
}));

// Mock FormData since it's not available in the test environment
vi.mock("form-data", () => {
  return {
    default: class MockFormData {
      append = vi.fn();
    },
  };
});

// Reset mocks
afterEach(() => {
  vi.resetAllMocks();
});

suite("deploy command", () => {
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
    // Setup common mocks
    vi.mocked(buildCommand.build).mockResolvedValue(mockBuildResult);
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);
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
  });

  it("should show first-time setup when user hasn't completed setup", async () => {
    // Save original config dir and set a temporary one for this test
    const originalConfigDir = process.env.GENSX_CONFIG_DIR;
    const tempConfigDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "gensx-test-config-"),
    );
    process.env.GENSX_CONFIG_DIR = tempConfigDir;

    try {
      // Create the config file in the temporary directory
      const configPath = path.join(tempConfigDir, "config");
      await fs.writeFile(
        configPath,
        `; GenSX Configuration File
; Generated on: ${new Date().toISOString()}

[api]
token = test-token
org = test-org
baseUrl = https://api.test.com

[console]
baseUrl = https://console.test.com

[state]
hasCompletedFirstTimeSetup = false
`,
        "utf-8",
      );

      const { lastFrame } = render(
        React.createElement(DeployUI, {
          file: "workflow.ts",
          options: {
            project: "test-project",
            env: "production",
          },
        }),
      );

      // Wait for the welcome message
      await waitForText(
        lastFrame,
        /Welcome to GenSX! Let's get you set up first./,
      );
    } finally {
      // Restore original config dir and cleanup
      process.env.GENSX_CONFIG_DIR = originalConfigDir;
      await fs.rm(tempConfigDir, { recursive: true, force: true });
    }
  });

  it("should skip first-time setup when user has already completed it", async () => {
    const { lastFrame } = render(
      React.createElement(DeployUI, {
        file: "workflow.ts",
        options: {
          project: "test-project",
          env: "production",
        },
      }),
    );

    // Wait for deployment to complete
    await waitForText(lastFrame, /Deployed to GenSX Cloud/);

    // Verify that the welcome message was not shown
    const frame = lastFrame();
    expect(frame).not.toContain(
      "Welcome to GenSX! Let's get you set up first.",
    );
  });

  it("should handle errors during first-time setup", async () => {
    // Save original config dir and set a temporary one for this test
    const originalConfigDir = process.env.GENSX_CONFIG_DIR;
    const tempConfigDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "gensx-test-config-error-"),
    );
    process.env.GENSX_CONFIG_DIR = tempConfigDir;

    try {
      // Create the config file in the temporary directory
      const configPath = path.join(tempConfigDir, "config");
      await fs.writeFile(
        configPath,
        `; GenSX Configuration File
; Generated on: ${new Date().toISOString()}

[api]
token = test-token
org = test-org
baseUrl = https://api.test.com

[console]
baseUrl = https://console.test.com

[state]
hasCompletedFirstTimeSetup = false
`,
        "utf-8",
      );

      // Make the config file read-only to simulate an error
      await fs.chmod(configPath, 0o444);

      const { lastFrame } = render(
        React.createElement(DeployUI, {
          file: "workflow.ts",
          options: {
            project: "test-project",
            env: "production",
          },
        }),
      );

      // Wait for the welcome message
      await waitForText(
        lastFrame,
        /Welcome to GenSX! Let's get you set up first./,
      );

      // Restore write permissions before cleanup
      await fs.chmod(configPath, 0o644);
    } finally {
      // Restore original config dir and cleanup temp directory
      process.env.GENSX_CONFIG_DIR = originalConfigDir;
      try {
        await fs.rm(tempConfigDir, { recursive: true, force: true });
      } catch (_error) {
        // If cleanup fails due to permissions, try to fix and retry
        try {
          await fs.chmod(path.join(tempConfigDir, "config"), 0o644);
          await fs.rm(tempConfigDir, { recursive: true, force: true });
        } catch (_retryError) {
          console.warn(`Failed to cleanup temp config dir: ${tempConfigDir}`);
        }
      }
    }
  });

  it("should use specified environment from options", async () => {
    const { lastFrame } = render(
      React.createElement(DeployUI, {
        file: "workflow.ts",
        options: {
          project: "test-project",
          env: "production",
        },
      }),
    );

    // Wait for deployment to complete
    await waitForText(lastFrame, /Deployed to GenSX Cloud/);

    // Verify deployment was made with correct environment
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/environments/production/deploy"),
      expect.any(Object),
      expect.any(Object),
    );

    expect(envConfig.validateAndSelectEnvironment).toHaveBeenCalledWith(
      "test-project",
      "production",
    );
  });

  it("should use project name from config when not specified", async () => {
    // Mock project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "config-project",
    });

    const { lastFrame } = render(
      React.createElement(DeployUI, {
        file: "workflow.ts",
        options: {
          env: "production",
        },
      }),
    );

    // Wait for deployment to complete
    await waitForText(lastFrame, /Deployed to GenSX Cloud/);

    // Verify deployment was made with config project name
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/projects/config-project/"),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("should show error when no project is specified and none in config", async () => {
    // Mock empty project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue(null);

    const { lastFrame } = render(
      React.createElement(DeployUI, {
        file: "workflow.ts",
        options: {},
      }),
    );

    // Wait for error message
    await waitForText(
      lastFrame,
      /No project name found\. Either specify --project or create a gensx\.yaml file with a 'projectName' field\./,
    );
  });

  it("should show loading spinner during build phase", async () => {
    // Mock build to never resolve, keeping component in loading state
    vi.mocked(buildCommand.build).mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );

    const { lastFrame } = render(
      React.createElement(DeployUI, {
        file: "workflow.ts",
        options: {
          project: "test-project",
          env: "production",
        },
      }),
    );

    // Wait for the build phase to start
    await waitForText(lastFrame, /Building workflows using docker\.\.\./);

    // Check for spinner indicator
    const frame = lastFrame();
    expect(frame).toBeTruthy();
    expect(frame?.includes("Building workflows using docker...")).toBe(true);
  });

  it("should show error when build fails", async () => {
    // Mock build to fail
    vi.mocked(buildCommand.build).mockRejectedValue(new Error("Build failed"));

    const { lastFrame } = render(
      React.createElement(DeployUI, {
        file: "workflow.ts",
        options: {
          project: "test-project",
          env: "production",
        },
      }),
    );

    // Wait for error message
    await waitForText(lastFrame, /Build failed/);
  });

  it("should show error when deployment fails", async () => {
    // Mock deployment to fail
    vi.mocked(axios.post).mockRejectedValue(new Error("Deployment failed"));

    const { lastFrame } = render(
      React.createElement(DeployUI, {
        file: "workflow.ts",
        options: {
          project: "test-project",
          env: "production",
        },
      }),
    );

    // Wait for error message
    await waitForText(lastFrame, /Deployment failed/, 5000);
  });

  it("should deploy successfully in headless mode", async () => {
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "test-project",
      environmentName: "production",
    });
    vi.mocked(envConfig.validateAndSelectEnvironment).mockResolvedValue(true);
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {
      // do nothing
    });

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
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining("Deployed to GenSX Cloud"),
    );
    consoleInfoSpy.mockRestore();
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
