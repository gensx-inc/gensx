import { existsSync } from "node:fs";

import ora from "ora";
import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import { start } from "../../src/commands/start.js";
import * as config from "../../src/utils/config.js";
import * as projectConfig from "../../src/utils/project-config.js";

// Mock dependencies
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(() => JSON.stringify({ version: "1.0.0" })),
  };
});
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
  const mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
    throw new Error(`process.exit called with code ${code}`);
  });

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
    mockExit.mockRestore();
  });

  it("should validate file existence before proceeding", async () => {
    // File doesn't exist
    vi.mocked(existsSync).mockImplementation((path) => {
      if (typeof path === "string" && path.includes("test.ts")) {
        return false;
      }
      return true;
    });

    await expect(start("test.ts", {})).rejects.toThrow(
      'process.exit unexpectedly called with "1"',
    );
    expect(console.error).toHaveBeenCalledWith(
      "Error:",
      "File test.ts does not exist",
    );
  });

  it("should only accept TypeScript files", async () => {
    await expect(start("test.js", {})).rejects.toThrow(
      'process.exit unexpectedly called with "1"',
    );
    expect(console.error).toHaveBeenCalledWith(
      "Error:",
      "Only TypeScript files (.ts or .tsx) are supported",
    );
  });

  it("should handle quiet mode", async () => {
    await start("test.ts", { quiet: true });

    // Verify ora is called with isSilent: true
    expect(ora).toHaveBeenCalledWith({ isSilent: true });
  });
});
