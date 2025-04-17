import { existsSync } from "node:fs";

import ora from "ora";
import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import { start } from "../../src/commands/start.js";
import * as config from "../../src/utils/config.js";
import * as projectConfig from "../../src/utils/project-config.js";

// Mock dependencies
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(() => JSON.stringify({ version: "1.0.0" })),
}));
vi.mock("ora");
vi.mock("../../src/utils/config.js");
vi.mock("../../src/utils/project-config.js");
vi.mock("../../src/utils/schema.js");
vi.mock("../../src/dev-server.js");
vi.mock("typescript");

// Skip the test that was relying on TypeScript mocking
const originalConsoleError = console.error;

suite("start command", () => {
  // Original functions to restore
  const originalCwd = process.cwd;
  const originalConsoleInfo = console.info;

  // Mock process.exit
  const mockExit = vi
    .spyOn(process, "exit")
    .mockImplementation(() => undefined as never);

  // Mock spinner
  let mockSpinner: ReturnType<typeof ora>;

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup environment
    process.cwd = vi.fn().mockReturnValue("/mock/dir");
    console.info = vi.fn();
    console.error = vi.fn();

    // Setup spinner
    mockSpinner = {
      start: vi.fn().mockReturnThis(),
      info: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis(),
      isSilent: false,
    } as unknown as ReturnType<typeof ora>;
    vi.mocked(ora).mockReturnValue(mockSpinner);

    // Setup file existence checks
    vi.mocked(existsSync).mockReturnValue(true);

    // Setup auth
    vi.mocked(config.getAuth).mockResolvedValue({
      org: "test-org",
      token: "test-token",
      apiBaseUrl: "https://api.gensx.com",
      consoleBaseUrl: "https://app.gensx.com",
    });

    // Setup project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "test-project",
      description: "Test project description",
    });
  });

  afterEach(() => {
    process.cwd = originalCwd;
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;
  });

  it("should validate file existence before proceeding", async () => {
    // File doesn't exist
    vi.mocked(existsSync).mockImplementation((path) => {
      if (typeof path === "string" && path.includes("test.ts")) {
        return false;
      }
      return true;
    });

    await start("test.ts", {});

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(
      "Error:",
      "File test.ts does not exist",
    );
  });

  it("should only accept TypeScript files", async () => {
    await start("test.js", {});

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(
      "Error:",
      "Only TypeScript files (.ts or .tsx) are supported",
    );
  });

  it("should throw error if no project name is available", async () => {
    // No project name in options or config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: undefined as unknown as string,
      description: "Test project without a name",
    });

    await start("test.ts", {});

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(
      "Error:",
      expect.stringContaining("No project name found"),
    );
  });

  it("should use project name from options when provided", async () => {
    await start("test.ts", { project: "custom-project" });

    expect(mockSpinner.info).not.toHaveBeenCalledWith(
      expect.stringContaining("Using project name from gensx.yaml"),
    );
  });

  it("should use project name from config when not specified in options", async () => {
    await start("test.ts", {});

    expect(mockSpinner.info).toHaveBeenCalledWith(
      expect.stringContaining("test-project"),
    );
  });

  it("should handle quiet mode", async () => {
    await start("test.ts", { quiet: true });

    // Verify ora is called with isSilent: true
    expect(ora).toHaveBeenCalledWith({ isSilent: true });
  });
});
