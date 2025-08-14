import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import React from "react";
import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import { NewProjectUI } from "../../src/commands/new.js";
import * as config from "../../src/utils/config.js";
import { exec } from "../../src/utils/exec.js";
import { waitForText, waitUntil } from "../test-helpers.js";

// Setup Ink mocks locally to avoid global state between tests
const { textInput, selectInput } = vi.hoisted(() => ({
  textInput: {
    onChange: undefined as ((value: string) => void) | undefined,
    onSubmit: undefined as ((value: string) => void) | undefined,
  },
  selectInput: {
    onSelect: undefined as (
      (item: { label: string; value: string }) => void
    ) | undefined,
    options: [] as { label: string; value: string }[],
  },
}));

vi.mock("ink-text-input", () => ({
  __esModule: true,
  default: (props: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: (v: string) => void;
  }) => {
    textInput.onChange = props.onChange;
    textInput.onSubmit = props.onSubmit;
    return React.createElement("input", { value: props.value });
  },
}));

vi.mock("ink-select-input", () => ({
  __esModule: true,
  default: (props: {
    items: { label: string; value: string }[];
    onSelect: (item: { label: string; value: string }) => void;
  }) => {
    selectInput.onSelect = props.onSelect;
    selectInput.options = props.items;
    return React.createElement(
      Box,
      {},
      props.items.map((item) =>
        React.createElement(Text, { key: item.value, color: "cyan" }, item.label),
      ),
    );
  },
}));

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
suite("new command UI", () => {
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    textInput.onChange = undefined;
    textInput.onSubmit = undefined;
    selectInput.onSelect = undefined;
    selectInput.options = [];
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
    vi.clearAllMocks();
    textInput.onChange = undefined;
    textInput.onSubmit = undefined;
    selectInput.onSelect = undefined;
    selectInput.options = [];
  });

  it("should create a project with description and select AI assistants", async () => {
    const { lastFrame } = render(
      React.createElement(NewProjectUI, {
        projectPath: path.join(tempDir, "test-project"),
        options: { force: true, template: "typescript" },
      }),
    );

    // Wait for description prompt
    await waitForText(lastFrame, /Enter a project description/);
    await waitUntil(() => !!textInput.onChange && !!textInput.onSubmit);

    // Simulate entering a description
    if (!textInput.onChange || !textInput.onSubmit)
      throw new Error("TextInput handlers not found");
    textInput.onChange("A test project description");
    textInput.onSubmit("A test project description");

    // Wait for dependencies to install
    await waitForText(lastFrame, /Installing dependencies/);

    // Wait for AI assistant selection
    await waitForText(lastFrame, /Select AI assistants to integrate/);
    await waitUntil(
      () => !!selectInput.onSelect && selectInput.options.length > 0,
    );

    // Simulate selecting an assistant
    if (!selectInput.onSelect || !selectInput.options)
      throw new Error("SelectInput handler/options not found");
    const claudeOption = selectInput.options.find(
      (opt) => opt.value === "@gensx/claude-md",
    );
    if (!claudeOption) throw new Error("Claude option not found");
    selectInput.onSelect(claudeOption);

    // Wait for done message
    await waitForText(lastFrame, /Successfully created GenSX project/);

    // Verify exec was called for the assistant
    expect(exec).toHaveBeenCalledWith(
      "npx @gensx/claude-md",
      expect.objectContaining({ cwd: expect.stringContaining("test-project") }),
    );
  });

  it("should create a project and select all AI assistants", async () => {
    const { lastFrame } = render(
      React.createElement(NewProjectUI, {
        projectPath: path.join(tempDir, "test-project-all"),
        options: { force: true, template: "typescript" },
      }),
    );

    // Wait for description prompt
    await waitForText(lastFrame, /Enter a project description/);
    await waitUntil(() => !!textInput.onChange && !!textInput.onSubmit);
    if (!textInput.onChange || !textInput.onSubmit)
      throw new Error("TextInput handlers not found");
    textInput.onChange!("");
    textInput.onSubmit!("");

    // Wait for dependencies to install
    await waitForText(lastFrame, /Installing dependencies/);
    await waitForText(lastFrame, /Select AI assistants to integrate/);
    await waitUntil(
      () => !!selectInput.onSelect && selectInput.options.length > 0,
    );

    // Simulate selecting "all"
    if (!selectInput.onSelect || !selectInput.options)
      throw new Error("SelectInput handler/options not found");
    const allOption = selectInput.options.find(
      (opt) => opt.value === "all",
    );
    if (!allOption) throw new Error("All option not found");
    selectInput.onSelect(allOption);

    await waitForText(lastFrame, /Successfully created GenSX project/);
    expect(exec).toHaveBeenCalledWith(
      "npx @gensx/claude-md",
      expect.objectContaining({
        cwd: expect.stringContaining("test-project-all"),
      }),
    );
    expect(exec).toHaveBeenCalledWith(
      "npx @gensx/cursor-rules",
      expect.objectContaining({
        cwd: expect.stringContaining("test-project-all"),
      }),
    );
    expect(exec).toHaveBeenCalledWith(
      "npx @gensx/cline-rules",
      expect.objectContaining({
        cwd: expect.stringContaining("test-project-all"),
      }),
    );
    expect(exec).toHaveBeenCalledWith(
      "npx @gensx/windsurf-rules",
      expect.objectContaining({
        cwd: expect.stringContaining("test-project-all"),
      }),
    );
  });

  it("should create a project and select no AI assistants", async () => {
    const { lastFrame } = render(
      React.createElement(NewProjectUI, {
        projectPath: path.join(tempDir, "test-project-none"),
        options: { force: true, template: "typescript" },
      }),
    );

    // Wait for description prompt
    await waitForText(lastFrame, /Enter a project description/);
    await waitUntil(() => !!textInput.onChange && !!textInput.onSubmit);
    if (!textInput.onChange || !textInput.onSubmit)
      throw new Error("TextInput handlers not found");
    textInput.onChange!("");
    textInput.onSubmit!("");

    // Wait for dependencies to install
    await waitForText(lastFrame, /Installing dependencies/);
    await waitForText(lastFrame, /Select AI assistants to integrate/);
    await waitUntil(
      () => !!selectInput.onSelect && selectInput.options.length > 0,
    );

    // Simulate selecting "none"
    if (!selectInput.onSelect || !selectInput.options)
      throw new Error("SelectInput handler/options not found");
    const noneOption = selectInput.options.find(
      (opt) => opt.value === "none",
    );
    if (!noneOption) throw new Error("None option not found");
    selectInput.onSelect(noneOption);

    await waitForText(lastFrame, /Successfully created GenSX project/);
    // No exec for assistants
    expect(exec).not.toHaveBeenCalledWith(
      expect.stringMatching(/npx @gensx\/.+/),
    );
  });

  it("should allow template selection and show typescript template output", async () => {
    const { lastFrame } = render(
      React.createElement(NewProjectUI, {
        projectPath: path.join(tempDir, "test-typescript-project"),
        options: { force: true },
      }),
    );

    // Wait for template selection
    await waitForText(lastFrame, /Select a project template/);
    await waitUntil(
      () => !!selectInput.onSelect && selectInput.options.length > 0,
    );

    // Simulate selecting TypeScript template
    if (!selectInput.onSelect || !selectInput.options)
      throw new Error("SelectInput handler/options not found");
    const typescriptOption = selectInput.options.find(
      (opt) => opt.value === "typescript",
    );
    if (!typescriptOption) throw new Error("TypeScript option not found");
    selectInput.onSelect(typescriptOption);

    // Wait for description prompt
    await waitForText(lastFrame, /Enter a project description/);
    await waitUntil(() => !!textInput.onChange && !!textInput.onSubmit);
    if (!textInput.onChange || !textInput.onSubmit)
      throw new Error("TextInput handlers not found");
    textInput.onChange!("");
    textInput.onSubmit!("");

    // Skip AI assistants selection
    await waitForText(lastFrame, /Select AI assistants to integrate/);
    await waitUntil(
      () => !!selectInput.onSelect && selectInput.options.length > 0,
    );
    if (!selectInput.onSelect || !selectInput.options)
      throw new Error("SelectInput handler/options not found");
    const noneOption = selectInput.options.find(
      (opt) => opt.value === "none",
    );
    if (!noneOption) throw new Error("None option not found");
    selectInput.onSelect(noneOption);

    await waitForText(lastFrame, /Successfully created GenSX project/);

    // Verify TypeScript template specific output
    expect(lastFrame()).toMatch(/DEPLOY THE PROJECT/);
    expect(lastFrame()).toMatch(/RUN LOCALLY/);
    expect(lastFrame()).toMatch(/START API SERVER/);
    expect(lastFrame()).toMatch(/src\/workflows\.tsx/);
  });

  it("should allow template selection and show next.js template output", async () => {
    const { lastFrame } = render(
      React.createElement(NewProjectUI, {
        projectPath: path.join(tempDir, "test-nextjs-project"),
        options: { force: true },
      }),
    );

    // Wait for template selection
    await waitForText(lastFrame, /Select a project template/);
    await waitUntil(
      () => !!selectInput.onSelect && selectInput.options.length > 0,
    );

    // Simulate selecting Next.js template
    if (!selectInput.onSelect || !selectInput.options)
      throw new Error("SelectInput handler/options not found");
    const nextOption = selectInput.options.find(
      (opt) => opt.value === "next",
    );
    if (!nextOption) throw new Error("Next.js option not found");
    selectInput.onSelect!(nextOption);

    // Wait for description prompt
    await waitForText(lastFrame, /Enter a project description/);
    await waitUntil(() => !!textInput.onChange && !!textInput.onSubmit);
    if (!textInput.onChange || !textInput.onSubmit)
      throw new Error("TextInput handlers not found");
    textInput.onChange!("");
    textInput.onSubmit!("");

    // Skip AI assistants selection
    await waitForText(lastFrame, /Select AI assistants to integrate/);
    await waitUntil(
      () => !!selectInput.onSelect && selectInput.options.length > 0,
    );
    if (!selectInput.onSelect || !selectInput.options)
      throw new Error("SelectInput handler/options not found");
    const noneOption = selectInput.options.find(
      (opt) => opt.value === "none",
    );
    if (!noneOption) throw new Error("None option not found");
    selectInput.onSelect!(noneOption);

    await waitForText(lastFrame, /Successfully created GenSX project/);

    // Verify Next.js template specific output
    expect(lastFrame()).toContain("export OPENAI_API_KEY=your_api_key");
    expect(lastFrame()).toContain("npm run dev");
    expect(lastFrame()).toContain("Your app will be available at:");
    expect(lastFrame()).toContain("http://localhost:3000");
    expect(lastFrame()).toContain("Next.js app");
    expect(lastFrame()).toContain("http://localhost:1337/swagger-ui");
    expect(lastFrame()).toContain("GenSX server");
    expect(lastFrame()).toContain("gensx/workflows.ts");
  });

  it("should skip template selection when template is provided in options", async () => {
    const { lastFrame } = render(
      React.createElement(NewProjectUI, {
        projectPath: path.join(tempDir, "test-preset-template"),
        options: {
          force: true,
          template: "next",
          description: "Preset Next.js project",
          skipIdeRules: true,
        },
      }),
    );

    // Should skip template selection, description input, and AI assistant selection
    // and go straight to completion due to skipIdeRules: true
    await waitForText(lastFrame, /Successfully created GenSX project/);

    // Verify Next.js template output is shown
    expect(lastFrame()).toMatch(/npm run dev/);
    expect(lastFrame()).toMatch(/gensx\/workflows\.ts/);
  });
});
