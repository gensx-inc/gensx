/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { existsSync } from "node:fs";

import ora from "ora";
import { RollupWatcher, watch } from "rollup";
import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import { start } from "../../src/commands/start.js";
import * as devServer from "../../src/dev-server.js";
import { GensxServer } from "../../src/dev-server.js";
import * as bundler from "../../src/utils/bundler.js";
import * as config from "../../src/utils/config.js";
import * as projectConfig from "../../src/utils/project-config.js";
import * as schema from "../../src/utils/schema.js";

// Mock dependencies
vi.mock("node:fs");
vi.mock("ora");
vi.mock("rollup");
vi.mock("../../src/utils/bundler.js");
vi.mock("../../src/utils/config.js");
vi.mock("../../src/utils/project-config.js");
vi.mock("../../src/utils/schema.js");
vi.mock("../../src/dev-server.js");

// Simple mock for workflows
const mockWorkflows = { testWorkflow: { name: "testWorkflow", run: vi.fn() } };
vi.mock("file:///mock/dir/.gensx/dist/handler.js", () => mockWorkflows);

suite("start command", () => {
  // Mock process.cwd
  const originalCwd = process.cwd;
  const mockCurrentDir = "/mock/dir";

  // Mock console methods
  const originalConsoleInfo = console.info;
  const originalConsoleError = console.error;

  // Mock process.exit
  const mockExit = vi
    .spyOn(process, "exit")
    .mockImplementation(() => undefined as never);

  // Setup mock server
  const mockServerInstance = {
    start: vi.fn().mockReturnThis(),
    stop: vi.fn(),
    getWorkflows: vi
      .fn()
      .mockReturnValue([
        { name: "testWorkflow", url: "http://localhost:1337/test" },
      ]),
  };

  // Mock watcher
  const mockWatcher = {
    on: vi.fn().mockReturnThis(),
    close: vi.fn(),
  };

  // Mock ora spinner
  let mockSpinner: ReturnType<typeof ora>;

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock process.cwd
    process.cwd = vi.fn().mockReturnValue(mockCurrentDir);

    // Mock console methods
    console.info = vi.fn();
    console.error = vi.fn();

    // Setup spinner mock
    mockSpinner = {
      start: vi.fn().mockReturnThis(),
      info: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis(),
      isSilent: false,
    } as unknown as ReturnType<typeof ora>;
    vi.mocked(ora).mockReturnValue(mockSpinner);

    // Setup watcher mock
    vi.mocked(watch).mockReturnValue(mockWatcher as unknown as RollupWatcher);

    // Setup bundler mock
    vi.mocked(bundler.getRollupConfig).mockReturnValue({
      input: "test.ts",
      output: { format: "esm", file: "handler.js" },
    });

    // Setup auth mock
    vi.mocked(config.getAuth).mockResolvedValue({
      org: "test-org",
      token: "test-token",
      apiBaseUrl: "https://api.gensx.com",
      consoleBaseUrl: "https://app.gensx.com",
    });

    // Setup project config mock
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "test-project",
      description: "Test project description",
    });

    // Setup schema mock
    vi.mocked(schema.generateSchema).mockReturnValue({
      testWorkflow: {
        input: { type: "object", properties: {} },
        output: { type: "object", properties: {} },
      },
    });

    // Setup server mock
    vi.mocked(devServer.createServer).mockReturnValue(
      mockServerInstance as unknown as GensxServer,
    );

    // Setup existsSync mock
    vi.mocked(existsSync).mockReturnValue(true);
  });

  afterEach(() => {
    // Restore original functions
    process.cwd = originalCwd;
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;
  });

  it("should exit if file does not exist", async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    await start("test.ts", {});

    expect(mockSpinner.fail).toHaveBeenCalledWith("Server startup failed");
    expect(console.error).toHaveBeenCalledWith(
      "Error:",
      "File test.ts does not exist",
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if file is not a TypeScript file", async () => {
    await start("test.js", {});

    expect(mockSpinner.fail).toHaveBeenCalledWith("Server startup failed");
    expect(console.error).toHaveBeenCalledWith(
      "Error:",
      "Only TypeScript files (.ts or .tsx) are supported",
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should use project name from options", async () => {
    // Start the command
    await start("test.ts", { project: "custom-project" });

    // Verify watch was called
    expect(watch).toHaveBeenCalled();

    // Get the callback that was registered
    const onCallback = mockWatcher.on.mock.calls[0][1];

    // Simulate the START event
    await onCallback({ code: "START" });
    expect(mockSpinner.start).toHaveBeenCalledWith("Building...");

    // Simulate the BUNDLE_END event
    const mockResult = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    await onCallback({ code: "BUNDLE_END", result: mockResult });

    expect(devServer.createServer).toHaveBeenCalledWith(
      mockWorkflows,
      "test-org",
      "custom-project",
      expect.anything(),
      expect.anything(),
    );
    expect(mockServerInstance.start).toHaveBeenCalled();
    expect(mockSpinner.succeed).toHaveBeenCalledWith("Build completed");
  });

  it("should use project name from config file", async () => {
    // Start the command
    await start("test.ts", {});

    // Verify watch was called
    expect(watch).toHaveBeenCalled();

    // Get the callback that was registered
    const onCallback = mockWatcher.on.mock.calls[0][1];

    // Simulate the BUNDLE_END event
    const mockResult = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    await onCallback({ code: "BUNDLE_END", result: mockResult });

    expect(devServer.createServer).toHaveBeenCalledWith(
      mockWorkflows,
      "test-org",
      "test-project",
      expect.anything(),
      expect.anything(),
    );
  });

  it("should handle Rollup errors", async () => {
    // Start the command
    await start("test.ts", {});

    // Verify watch was called
    expect(watch).toHaveBeenCalled();

    // Get the callback that was registered
    const onCallback = mockWatcher.on.mock.calls[0][1];

    // Simulate an error event
    const rollupError = new Error("Rollup error");
    await onCallback({ code: "ERROR", error: rollupError });

    expect(console.error).toHaveBeenCalledWith("Rollup error");
    expect(mockSpinner.fail).toHaveBeenCalledWith("Build failed");
    expect(mockServerInstance.start).not.toHaveBeenCalled();
  });
});
