import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import React from "react";
import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import { NewProjectUI } from "../../src/commands/new.js";
import * as config from "../../src/utils/config.js";
import { exec } from "../../src/utils/exec.js";
import { waitForText } from "../test-helpers.js";

// Define the type for the global callback
// For ink-text-input and ink-select-input
// We'll use global variables to store the onChange/onSubmit/onSelect handlers

declare global {
  var __textInputOnChange: ((value: string) => void) | undefined;
  var __textInputOnSubmit: ((value: string) => void) | undefined;
  var __selectInputOnSelect:
    | ((item: { label: string; value: string }) => void)
    | undefined;
  var __selectInputOptions: { label: string; value: string }[] | undefined;
}

// Mock dependencies
vi.mock("../../src/utils/exec.js", () => ({
  exec: vi.fn(() => new Promise((resolve) => setTimeout(resolve, 10))),
}));
vi.mock("../../src/utils/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof config>();
  return {
    ...actual,
    readConfig: vi.fn(),
  };
});
// Mock ink-text-input and ink-select-input to capture handlers
vi.mock("ink-text-input", () => ({
  __esModule: true,
  default: (props: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: (v: string) => void;
  }) => {
    global.__textInputOnChange = props.onChange;
    global.__textInputOnSubmit = props.onSubmit;
    return React.createElement("input", { value: props.value });
  },
}));
vi.mock("ink-select-input", () => ({
  __esModule: true,
  default: (props: {
    items: { label: string; value: string }[];
    onSelect: (item: { label: string; value: string }) => void;
  }) => {
    // Store a global callback to simulate selection
    global.__selectInputOptions = props.items;
    global.__selectInputOnSelect = props.onSelect;
    // Render a Box with Text children for each item
    return React.createElement(
      Box,
      {},
      props.items.map((item) =>
        React.createElement(
          Text,
          { key: item.value, color: "cyan" },
          item.label,
        ),
      ),
    );
  },
}));

suite("new command UI", () => {
  let tempDir: string;

  beforeEach(async () => {
    vi.resetAllMocks();
    tempDir = await mkdtemp(path.join(os.tmpdir(), "gensx-interactive-test-"));
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
    delete global.__textInputOnChange;
    delete global.__textInputOnSubmit;
    delete global.__selectInputOnSelect;
    delete global.__selectInputOptions;
  });

  it("should create a project with description and select AI assistants", async () => {
    const { lastFrame } = render(
      React.createElement(NewProjectUI, {
        projectPath: path.join(tempDir, "test-project"),
        options: { force: true },
      }),
    );

    // Wait for description prompt
    await waitForText(lastFrame, /Enter a project description/);

    // Simulate entering a description
    if (!global.__textInputOnChange || !global.__textInputOnSubmit)
      throw new Error("TextInput handlers not found");
    global.__textInputOnChange("A test project description");
    global.__textInputOnSubmit("A test project description");

    // Wait for dependencies to install
    await waitForText(lastFrame, /Installing dependencies/);

    // Wait for AI assistant selection
    await waitForText(lastFrame, /Select AI assistants to integrate/);

    // Simulate selecting an assistant
    if (!global.__selectInputOnSelect || !global.__selectInputOptions)
      throw new Error("SelectInput handler/options not found");
    const claudeOption = global.__selectInputOptions.find(
      (opt) => opt.value === "@gensx/claude-md",
    );
    if (!claudeOption) throw new Error("Claude option not found");
    global.__selectInputOnSelect(claudeOption);

    // Wait for done message
    await waitForText(lastFrame, /Successfully created GenSX project/);

    // Verify exec was called for the assistant
    expect(exec).toHaveBeenCalledWith(
      "npx @gensx/claude-md",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect.objectContaining({ cwd: expect.stringContaining("test-project") }),
    );
  });

  it("should create a project and select all AI assistants", async () => {
    const { lastFrame } = render(
      React.createElement(NewProjectUI, {
        projectPath: path.join(tempDir, "test-project-all"),
        options: { force: true },
      }),
    );

    // Wait for description prompt
    await waitForText(lastFrame, /Enter a project description/);
    if (!global.__textInputOnChange || !global.__textInputOnSubmit)
      throw new Error("TextInput handlers not found");
    global.__textInputOnChange("");
    global.__textInputOnSubmit("");

    // Wait for dependencies to install
    await waitForText(lastFrame, /Installing dependencies/);
    await waitForText(lastFrame, /Select AI assistants to integrate/);

    // Simulate selecting "all"
    if (!global.__selectInputOnSelect || !global.__selectInputOptions)
      throw new Error("SelectInput handler/options not found");
    const allOption = global.__selectInputOptions.find(
      (opt) => opt.value === "all",
    );
    if (!allOption) throw new Error("All option not found");
    global.__selectInputOnSelect(allOption);

    await waitForText(lastFrame, /Successfully created GenSX project/);
    expect(exec).toHaveBeenCalledWith(
      "npx @gensx/claude-md",
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        cwd: expect.stringContaining("test-project-all"),
      }),
    );
    expect(exec).toHaveBeenCalledWith(
      "npx @gensx/cursor-rules",
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        cwd: expect.stringContaining("test-project-all"),
      }),
    );
    expect(exec).toHaveBeenCalledWith(
      "npx @gensx/cline-rules",
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        cwd: expect.stringContaining("test-project-all"),
      }),
    );
    expect(exec).toHaveBeenCalledWith(
      "npx @gensx/windsurf-rules",
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        cwd: expect.stringContaining("test-project-all"),
      }),
    );
  });

  it("should create a project and select no AI assistants", async () => {
    const { lastFrame } = render(
      React.createElement(NewProjectUI, {
        projectPath: path.join(tempDir, "test-project-none"),
        options: { force: true },
      }),
    );

    // Wait for description prompt
    await waitForText(lastFrame, /Enter a project description/);
    if (!global.__textInputOnChange || !global.__textInputOnSubmit)
      throw new Error("TextInput handlers not found");
    global.__textInputOnChange("");
    global.__textInputOnSubmit("");

    // Wait for dependencies to install
    await waitForText(lastFrame, /Installing dependencies/);
    await waitForText(lastFrame, /Select AI assistants to integrate/);

    // Simulate selecting "none"
    if (!global.__selectInputOnSelect || !global.__selectInputOptions)
      throw new Error("SelectInput handler/options not found");
    const noneOption = global.__selectInputOptions.find(
      (opt) => opt.value === "none",
    );
    if (!noneOption) throw new Error("None option not found");
    global.__selectInputOnSelect(noneOption);

    await waitForText(lastFrame, /Successfully created GenSX project/);
    // No exec for assistants
    expect(exec).not.toHaveBeenCalledWith(
      expect.stringMatching(/npx @gensx\/.+/),
    );
  });

  it("should respect the --public flag", async () => {
    const projectDir = path.join(tempDir, "public-project");
    const { lastFrame } = render(
      React.createElement(NewProjectUI, {
        projectPath: projectDir,
        options: { force: true, publicWorkflows: true },
      }),
    );

    await waitForText(lastFrame, /Enter a project description/);
    if (!global.__textInputOnChange || !global.__textInputOnSubmit)
      throw new Error("TextInput handlers not found");
    global.__textInputOnChange("");
    global.__textInputOnSubmit("");

    await waitForText(lastFrame, /Installing dependencies/);
    await waitForText(lastFrame, /Select AI assistants to integrate/);

    if (!global.__selectInputOnSelect || !global.__selectInputOptions)
      throw new Error("SelectInput handler/options not found");
    const noneOption = global.__selectInputOptions.find(
      (opt) => opt.value === "none",
    );
    if (!noneOption) throw new Error("None option not found");
    global.__selectInputOnSelect(noneOption);

    await waitForText(lastFrame, /Successfully created GenSX project/);

    const yaml = await readFile(path.join(projectDir, "gensx.yaml"), "utf8");
    expect(yaml).toMatch(/publicWorkflows: true/);
  });
});
