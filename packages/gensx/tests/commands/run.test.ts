import type { AuthConfig } from "../../src/utils/config.js";

import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import { runWorkflow } from "../../src/commands/run.js";
import * as config from "../../src/utils/config.js";
import * as envConfig from "../../src/utils/env-config.js";
import * as projectConfig from "../../src/utils/project-config.js";

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
vi.mock("node:fs", () => ({
  createWriteStream: vi.fn(() => ({
    write: vi.fn(),
    end: vi.fn(),
  })),
  WriteStream: vi.fn(),
  readFileSync: vi.fn(() => JSON.stringify({ version: "1.0.0" })),
}));

vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn(),
}));

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

suite("run command", () => {
  const mockAuth: AuthConfig = {
    org: "test-org",
    token: "test-token",
    apiBaseUrl: "https://api.gensx.com",
    consoleBaseUrl: "https://app.gensx.com",
  };

  const originalConsoleError = console.error;
  const originalConsoleInfo = console.info;
  const originalProcessExit = process.exit;

  beforeEach(() => {
    console.error = vi.fn();
    console.info = vi.fn();
    process.exit = vi.fn() as never;

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default auth
    vi.mocked(config.getAuth).mockResolvedValue(mockAuth);

    // Setup default project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "test-project",
    });

    // Setup default environment
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(
      "development",
    );

    // Setup default environment operation behavior
    vi.mocked(envConfig.getEnvironmentForOperation).mockResolvedValue(
      "development",
    );
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.info = originalConsoleInfo;
    process.exit = originalProcessExit;
  });

  it("should fail if not authenticated", async () => {
    vi.mocked(config.getAuth).mockResolvedValue(null);

    await runWorkflow("test-workflow", {
      input: "{}",
      wait: false,
    });

    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Not authenticated. Please run 'gensx login' first.",
      }),
    );
  });

  it("should use project name from config when not specified", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () =>
        Promise.resolve({
          status: "ok",
          data: { executionId: "test-id" },
        }),
    });

    await runWorkflow("test-workflow", {
      input: "{}",
      wait: false,
    });

    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("test-id"),
    );
  });

  it("should fail if no project name is available", async () => {
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue(null);

    await runWorkflow("test-workflow", {
      input: "{}",
      wait: false,
    });

    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message: expect.stringContaining("No project name found"),
      }) as { message: string },
    );
  });

  it("should use environment from CLI when not specified", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () =>
        Promise.resolve({
          status: "ok",
          data: { executionId: "test-id" },
        }),
    });

    await runWorkflow("test-workflow", {
      input: "{}",
      wait: false,
    });

    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("test-id"),
    );
  });

  it("should fail if no environment is available", async () => {
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(null);
    vi.mocked(envConfig.getEnvironmentForOperation).mockRejectedValue(
      new Error("No environments found."),
    );

    await runWorkflow("test-workflow", {
      input: "{}",
      wait: false,
    });

    expect(console.error).toHaveBeenCalledWith(
      new Error("No environments found."),
    );
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

    await runWorkflow("test-workflow", {
      input: "{}",
      wait: true,
    });

    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("Streaming response output"),
    );
  });

  it("should handle JSON response when wait is true", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () =>
        Promise.resolve({
          status: "ok",
          data: {
            output: { result: "success" },
            executionStatus: "success",
          },
        }),
    });

    await runWorkflow("test-workflow", {
      input: "{}",
      wait: true,
    });

    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("Workflow execution completed"),
    );
  });

  it("should handle failed workflow execution", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () =>
        Promise.resolve({
          status: "ok",
          data: {
            output: { error: "Something went wrong" },
            executionStatus: "failed",
          },
        }),
    });

    await runWorkflow("test-workflow", {
      input: "{}",
      wait: true,
    });

    expect(console.error).toHaveBeenCalledWith("❌ Workflow failed");
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should write output to file when specified", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () =>
        Promise.resolve({
          status: "ok",
          data: {
            output: { result: "success" },
            executionStatus: "success",
          },
        }),
    });

    await runWorkflow("test-workflow", {
      input: "{}",
      wait: true,
      output: "output.json",
    });

    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("output.json"),
    );
  });

  it("should handle API errors", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 400,
      statusText: "Bad Request",
    });

    await runWorkflow("test-workflow", {
      input: "{}",
      wait: false,
    });

    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message: expect.stringContaining("Failed to start workflow"),
      }) as { message: string },
    );
  });
});
