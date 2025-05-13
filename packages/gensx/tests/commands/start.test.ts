import { render } from "ink-testing-library";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { StartUI } from "../../src/commands/start.js";
import { waitForText } from "../test-helpers.js";

// Mock the file system functions
vi.mock("node:fs", () => ({
  existsSync: vi.fn((file) => {
    console.info("existsSync called with:", file);
    return true;
  }),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn((file) => {
    console.info("readFileSync called with:", file);
    if (typeof file === "string" && file.endsWith("tsconfig.json")) {
      return JSON.stringify({ compilerOptions: { module: "esnext" } });
    }
    return JSON.stringify({});
  }),
  writeFileSync: vi.fn(),
  watch: vi.fn(),
}));

// Mock the dev server
vi.mock("../../src/dev-server.js", () => ({
  createServer: vi.fn().mockReturnValue({
    start: vi.fn().mockReturnValue({
      stop: vi.fn().mockResolvedValue(undefined),
      getWorkflows: vi
        .fn()
        .mockReturnValue([
          { name: "test-workflow", url: "/api/test-workflow" },
        ]),
    }),
  }),
}));

describe("StartUI", () => {
  it("renders initial loading state", () => {
    const { lastFrame } = render(
      React.createElement(StartUI, {
        file: "test.ts",
        options: {
          port: 1337,
        },
      }),
    );

    expect(lastFrame()).toContain("Starting dev server...");
  });

  it("renders error state when error occurs", async () => {
    const { lastFrame } = render(
      React.createElement(StartUI, {
        file: "nonexistent.ts",
        options: {
          port: 1337,
        },
      }),
    );

    // Wait for the error message to appear
    await waitForText(lastFrame, /Error/);
  });

  it("renders with custom port", () => {
    const { lastFrame } = render(
      React.createElement(StartUI, {
        file: "test.ts",
        options: {
          port: 3000,
        },
      }),
    );

    expect(lastFrame()).toContain("Starting dev server...");
  });
});
