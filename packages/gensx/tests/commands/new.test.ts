import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import enquirer from "enquirer";
import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import { newProject } from "../../src/commands/new.js";
import * as config from "../../src/utils/config.js";
import { exec } from "../../src/utils/exec.js";

// Mock dependencies
vi.mock("../../src/utils/exec.js", async (importOriginal) => {
  const actual = await importOriginal<typeof exec>();
  return {
    // eslint-disable-next-line @typescript-eslint/no-misused-spread
    ...actual,
    exec: vi.fn(),
  };
});
vi.mock("enquirer", () => ({
  default: {
    prompt: vi.fn(),
  },
}));
vi.mock("../../src/utils/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof config>();
  return {
    ...actual,
    readConfig: vi.fn(),
  };
});

suite("new command", () => {
  let tempDir: string;

  beforeEach(async () => {
    vi.resetAllMocks();

    // Create a temporary directory for our test
    tempDir = await mkdtemp(path.join(os.tmpdir(), "gensx-interactive-test-"));

    // Mock config operations
    vi.mocked(config.readConfig).mockResolvedValue({
      config: {
        api: { baseUrl: "https://api.gensx.com" },
        console: { baseUrl: "https://app.gensx.com" },
      },
      state: { hasCompletedFirstTimeSetup: true },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("selects AI assistants interactively", async () => {
    // Mock the prompt response to select Claude and Cursor
    vi.mocked(enquirer.prompt).mockResolvedValueOnce({
      assistants: ["@gensx/claude-md", "@gensx/cursor-rules"],
    });

    await newProject(path.join(tempDir, "test-project"), {
      template: "ts",
      force: false,
      skipLogin: true,
      skipIdeRules: false,
    });

    // Verify npx commands were called for selected assistants
    expect(exec).toHaveBeenCalledWith("npx @gensx/claude-md");
    expect(exec).toHaveBeenCalledWith("npx @gensx/cursor-rules");
  });

  it("handles cancellation of AI assistant selection", async () => {
    // Mock the prompt to simulate user cancellation
    vi.mocked(enquirer.prompt).mockRejectedValueOnce({
      name: "Error",
      message: "canceled",
    });

    await newProject(path.join(tempDir, "test-project"), {
      template: "ts",
      force: false,
      skipLogin: true,
      skipIdeRules: false,
    });

    // Verify no assistant commands were called
    expect(exec).not.toHaveBeenCalledWith(
      expect.stringMatching(/npx @gensx\/.+/),
    );
  });

  it("selects all AI assistants when 'all' is chosen", async () => {
    // Mock the prompt to select 'all' assistants
    vi.mocked(enquirer.prompt).mockResolvedValueOnce({
      assistants: [
        "@gensx/claude-md",
        "@gensx/cursor-rules",
        "@gensx/cline-rules",
        "@gensx/windsurf-rules",
      ],
    });

    await newProject(path.join(tempDir, "test-project"), {
      template: "ts",
      force: false,
      skipLogin: true,
      skipIdeRules: false,
    });

    // Verify all assistant commands were called
    expect(exec).toHaveBeenCalledWith("npx @gensx/claude-md");
    expect(exec).toHaveBeenCalledWith("npx @gensx/cursor-rules");
    expect(exec).toHaveBeenCalledWith("npx @gensx/cline-rules");
    expect(exec).toHaveBeenCalledWith("npx @gensx/windsurf-rules");
  });
});
