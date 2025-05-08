import fs from "node:fs/promises";
import path from "node:path";

import { render } from "ink-testing-library";
import React from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  it,
  suite,
  vi,
} from "vitest";

import { RunWorkflowUI } from "../../src/commands/run.js";
import * as environmentModel from "../../src/models/environment.js";
import * as projectModel from "../../src/models/projects.js";
import * as config from "../../src/utils/config.js";
import * as envConfig from "../../src/utils/env-config.js";
import * as projectConfig from "../../src/utils/project-config.js";
import {
  cleanupProjectFiles,
  cleanupTestEnvironment,
  setupTestEnvironment,
  waitForText,
} from "../test-helpers.js";

// Setup test variables
let tempDir: string;
let origCwd: typeof process.cwd;
let origConfigDir: string | undefined;

// Mock only the dependencies that would make API calls
vi.mock("../../src/models/projects.js", () => ({
  checkProjectExists: vi.fn(),
}));

vi.mock("../../src/models/environment.js", () => ({
  checkEnvironmentExists: vi.fn(),
  listEnvironments: vi.fn().mockResolvedValue([
    {
      name: "development",
      id: "dev-123",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]),
}));

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

vi.mock("../../src/utils/config.js");
vi.mock("../../src/utils/project-config.js");
vi.mock("../../src/utils/env-config.js");

// Mock node:fs with readFileSync
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    createWriteStream: vi.fn(() => ({
      write: vi.fn(),
      end: vi.fn(),
    })),
    WriteStream: vi.fn(),
    readFileSync: vi.fn(() => JSON.stringify({ version: "1.0.0" })),
  };
});

// Mock node:path
vi.mock("node:path", () => ({
  dirname: vi.fn(() => "/mock/dir"),
  join: vi.fn((...args: string[]) => args.join("/")),
  default: {
    dirname: vi.fn(() => "/mock/dir"),
    join: vi.fn((...args: string[]) => args.join("/")),
  },
}));

// Mock node:url
vi.mock("node:url", () => ({
  fileURLToPath: vi.fn(() => "/mock/dir/file.js"),
  default: {
    fileURLToPath: vi.fn(() => "/mock/dir/file.js"),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock TextDecoder properly
class MockTextDecoder {
  encoding = "utf-8";
  fatal = false;
  ignoreBOM = false;
  decode(): string {
    return "mocked output";
  }
}
global.TextDecoder = MockTextDecoder as unknown as typeof TextDecoder;

// Set up and tear down the test environment
beforeAll(async () => {
  const setup = await setupTestEnvironment("run-test");
  tempDir = setup.tempDir;
  origCwd = setup.origCwd;
  origConfigDir = setup.origConfigDir;
});

afterAll(async () => {
  await cleanupTestEnvironment(tempDir, origCwd, origConfigDir);
});

beforeEach(() => {
  // Set working directory to our test project
  process.cwd = vi.fn().mockReturnValue(path.join(tempDir, "project"));

  // Reset all mocks
  vi.clearAllMocks();

  // Setup default auth
  vi.mocked(config.getAuth).mockResolvedValue({
    org: "test-org",
    token: "test-token",
    apiBaseUrl: "https://api.gensx.com",
    consoleBaseUrl: "https://app.gensx.com",
  });

  // Setup default project config
  vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
    projectName: "test-project",
  });

  // Setup default environment
  vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue("development");

  // Setup default environment operation behavior
  vi.mocked(envConfig.getEnvironmentForOperation).mockResolvedValue(
    "development",
  );

  // Setup default project and environment existence
  vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);
  vi.mocked(environmentModel.checkEnvironmentExists).mockResolvedValue(true);
  vi.mocked(environmentModel.listEnvironments).mockResolvedValue([
    {
      name: "development",
      id: "dev-123",
      projectId: "test-project",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
});

afterEach(async () => {
  vi.resetAllMocks();
  await cleanupProjectFiles(tempDir);
});

suite("run command", () => {
  it("should fail if not authenticated", async () => {
    vi.mocked(config.getAuth).mockResolvedValue(null);

    console.info("Starting auth test...");
    const { lastFrame } = render(
      React.createElement(RunWorkflowUI, {
        workflowName: "test-workflow",
        options: {
          input: "{}",
          wait: false,
        },
      }),
    );

    console.info("Current frame:", lastFrame());
    await waitForText(
      lastFrame,
      /Not authenticated. Please run 'gensx login' first./,
    );
  });

  it("should use project name from config when not specified", async () => {
    console.info("Starting project name test...");
    // Create a real gensx.yaml config file
    await fs.writeFile(
      path.join(tempDir, "project", "gensx.yaml"),
      `# GenSX Project Configuration
projectName: config-project
`,
      "utf-8",
    );

    // Mock project exists for the config project
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () =>
        Promise.resolve({
          executionId: "test-id",
        }),
    });

    console.info("Rendering component...");
    const { lastFrame } = render(
      React.createElement(RunWorkflowUI, {
        workflowName: "test-workflow",
        options: {
          input: "{}",
          wait: false,
        },
      }),
    );

    console.info("Current frame:", lastFrame());
    await waitForText(lastFrame, /test-id/);
  });

  it("should fail if no project name is available", async () => {
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue(null);

    const { lastFrame } = render(
      React.createElement(RunWorkflowUI, {
        workflowName: "test-workflow",
        options: {
          input: "{}",
          wait: false,
        },
      }),
    );

    await waitForText(lastFrame, /No project name found/);
  });

  it("should use environment from CLI when not specified", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () =>
        Promise.resolve({
          executionId: "test-id",
        }),
    });

    const { lastFrame } = render(
      React.createElement(RunWorkflowUI, {
        workflowName: "test-workflow",
        options: {
          input: "{}",
          wait: false,
        },
      }),
    );

    await waitForText(lastFrame, /test-id/);
  });

  it("should fail if no environment is available", async () => {
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(null);
    vi.mocked(envConfig.getEnvironmentForOperation).mockRejectedValue(
      new Error("No environments found."),
    );

    const { lastFrame } = render(
      React.createElement(RunWorkflowUI, {
        workflowName: "test-workflow",
        options: {
          input: "{}",
          wait: false,
        },
      }),
    );

    await waitForText(lastFrame, /No environments found./);
  });

  it("should handle streaming response when wait is true", async () => {
    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          value: new TextEncoder().encode("test output"),
          done: false,
        })
        .mockResolvedValueOnce({ done: true }),
    };

    mockFetch.mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ "Content-Type": "application/stream+json" }),
      body: { getReader: () => mockReader },
    });

    const { lastFrame } = render(
      React.createElement(RunWorkflowUI, {
        workflowName: "test-workflow",
        options: {
          input: "{}",
          wait: true,
        },
      }),
    );

    await waitForText(lastFrame, /Streaming response output/);
  });

  it("should handle JSON response when wait is true", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () =>
        Promise.resolve({
          executionId: "test-id",
        }),
    });

    const { lastFrame } = render(
      React.createElement(RunWorkflowUI, {
        workflowName: "test-workflow",
        options: {
          input: "{}",
          wait: true,
          env: "development",
        },
      }),
    );

    await waitForText(lastFrame, /Workflow execution completed/);
  });

  it("should handle failed workflow execution", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () =>
        Promise.resolve({
          output: { error: "Something went wrong" },
          executionStatus: "failed",
        }),
    });

    const { lastFrame } = render(
      React.createElement(RunWorkflowUI, {
        workflowName: "test-workflow",
        options: {
          input: "{}",
          wait: true,
        },
      }),
    );

    await waitForText(lastFrame, /❌ Workflow failed/);
  });

  it("should write output to file when specified", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () =>
        Promise.resolve({
          output: { result: "success" },
          executionStatus: "success",
        }),
    });

    const { lastFrame } = render(
      React.createElement(RunWorkflowUI, {
        workflowName: "test-workflow",
        options: {
          input: "{}",
          wait: true,
          output: "output.json",
        },
      }),
    );

    await waitForText(lastFrame, /output.json/);
  });

  it("should handle API errors", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 400,
      statusText: "Bad Request",
    });

    const { lastFrame } = render(
      React.createElement(RunWorkflowUI, {
        workflowName: "test-workflow",
        options: {
          input: "{}",
          wait: false,
        },
      }),
    );

    await waitForText(lastFrame, /Failed to start workflow/);
  });
});
