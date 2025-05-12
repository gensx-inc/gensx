import { render } from "ink-testing-library";
import React from "react";
import { afterEach, beforeEach, it, suite, vi } from "vitest";

import { RunWorkflowUI } from "../../src/commands/run.js";
import * as environmentModel from "../../src/models/environment.js";
import * as projectModel from "../../src/models/projects.js";
import * as configUtils from "../../src/utils/config.js";
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
      createWriteStream: vi.fn(() => ({
        write: vi.fn(),
        end: vi.fn(),
      })),
      readFileSync: vi.fn(() => JSON.stringify({ version: "1.0.0" })),
    },
    createWriteStream: vi.fn(() => ({
      write: vi.fn(),
      end: vi.fn(),
    })),
    readFileSync: vi.fn(() => JSON.stringify({ version: "1.0.0" })),
  };
});

vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn(),
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
}));

vi.mock("../../src/models/environment.js", () => ({
  checkEnvironmentExists: vi.fn(),
  listEnvironments: vi.fn(),
}));

// Mock EnvironmentResolver component
vi.mock("../../src/components/EnvironmentResolver.js", () => ({
  EnvironmentResolver: ({
    onResolved,
  }: {
    onResolved: (env: string) => void;
  }) => {
    // Call onResolved immediately with the environment
    onResolved("development");
    return null;
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

// Reset mocks
afterEach(() => {
  vi.resetAllMocks();
});

suite("run command", () => {
  const mockAuth = {
    token: "test-token",
    org: "test-org",
    apiBaseUrl: "https://api.test.com",
    consoleBaseUrl: "https://console.test.com",
  };

  beforeEach(() => {
    // Setup common mocks
    vi.mocked(configUtils.getAuth).mockResolvedValue(mockAuth);
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
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(
      "development",
    );
    vi.mocked(envConfig.getEnvironmentForOperation).mockResolvedValue(
      "development",
    );
    // Add default project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "test-project",
    });
  });

  it("should fail if not authenticated", async () => {
    vi.mocked(configUtils.getAuth).mockResolvedValue(null);

    const { lastFrame } = render(
      React.createElement(RunWorkflowUI, {
        workflowName: "test-workflow",
        options: {
          input: "{}",
          wait: false,
        },
      }),
    );

    await waitForText(
      lastFrame,
      /Not authenticated. Please run 'gensx login' first./,
    );
  });

  it("should use project name from config when not specified", async () => {
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "config-project",
    });

    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve({ executionId: "test-id" }),
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

    // First check for streaming message
    await waitForText(lastFrame, /Streaming response output:/);
    // Then check for completion
    await waitForText(lastFrame, /Workflow execution completed/);
  });

  it("should handle JSON response when wait is true", async () => {
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

    await waitForText(lastFrame, /Workflow failed/);
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
      json: () => Promise.resolve({ error: "Bad Request" }),
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
