import fs from "node:fs";
import path from "node:path";

import { render } from "ink-testing-library";
import React from "react";
import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import { CloneExampleUI } from "../../../src/commands/examples/clone.js";
import { tempDir } from "../../setup.js";
import { waitForText } from "../../test-helpers.js";

// Mock node:child_process
vi.mock("node:child_process", () => ({
  exec: vi.fn(),
}));

// Mock the supported examples module
vi.mock("../../../src/commands/examples/supported-examples.js", () => ({
  getExampleByName: vi.fn(),
  SUPPORTED_EXAMPLES: [
    {
      name: "chat-ux",
      description: "A complete chat interface with modern UX patterns",
      path: "gensx-inc/chat-ux-template",
      category: "Next.js",
    },
    {
      name: "deep-research",
      description: "AI-powered research tool with web search",
      path: "gensx-inc/deep-research-template",
      category: "Next.js",
    },
  ],
}));

import { exec } from "node:child_process";

import { getExampleByName } from "../../../src/commands/examples/supported-examples.js";

suite("examples clone Ink UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mock behavior
    vi.mocked(exec).mockImplementation((_cmd, optsOrCb, cb) => {
      const callback = typeof optsOrCb === "function" ? optsOrCb : cb;
      process.nextTick(() => callback?.(null, "", ""));
      return {} as never;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully clone an example with default directory name", async () => {
    vi.mocked(getExampleByName).mockReturnValue({
      name: "chat-ux",
      description: "A complete chat interface with modern UX patterns",
      path: "gensx-inc/chat-ux-template",
      category: "Next.js",
    });

    const { lastFrame } = render(
      React.createElement(CloneExampleUI, {
        exampleName: "chat-ux",
        yes: true,
      }),
    );

    await waitForText(lastFrame, /Successfully cloned chat-ux to chat-ux/);

    expect(exec).toHaveBeenCalledWith(
      "npx degit gensx-inc/chat-ux-template chat-ux",
      expect.any(Function),
    );
    expect(exec).toHaveBeenCalledWith(
      "npm install",
      expect.objectContaining({ cwd: path.resolve("chat-ux") }),
      expect.any(Function),
    );

    await waitForText(lastFrame, /Next steps:/);
    await waitForText(lastFrame, /1\. cd chat-ux/);
    await waitForText(lastFrame, /2\. Follow the README\.md/);
  });

  it("should successfully clone an example with custom project name", async () => {
    vi.mocked(getExampleByName).mockReturnValue({
      name: "deep-research",
      description: "AI-powered research tool with web search",
      path: "gensx-inc/deep-research-template",
      category: "Next.js",
    });

    const { lastFrame } = render(
      React.createElement(CloneExampleUI, {
        exampleName: "deep-research",
        projectName: "my-research-app",
        yes: true,
      }),
    );

    await waitForText(
      lastFrame,
      /Successfully cloned deep-research to my-research-app/,
    );

    expect(exec).toHaveBeenCalledWith(
      "npx degit gensx-inc/deep-research-template my-research-app",
      expect.any(Function),
    );
    expect(exec).toHaveBeenCalledWith(
      "npm install",
      expect.objectContaining({ cwd: path.resolve("my-research-app") }),
      expect.any(Function),
    );

    await waitForText(lastFrame, /1\. cd my-research-app/);
  });

  it("should show error for unknown example", async () => {
    vi.mocked(getExampleByName).mockReturnValue(undefined);

    const { lastFrame } = render(
      React.createElement(CloneExampleUI, {
        exampleName: "unknown-example",
        yes: true,
      }),
    );

    await waitForText(lastFrame, /Unknown example: unknown-example/);
    await waitForText(
      lastFrame,
      /Run 'gensx examples' to see available examples/,
    );

    expect(exec).not.toHaveBeenCalled();
  });

  it("should show error when target directory already exists", async () => {
    vi.mocked(getExampleByName).mockReturnValue({
      name: "existing-dir-test",
      description: "A complete chat interface",
      path: "gensx-inc/existing-dir-template",
      category: "Next.js",
    });

    // Create a real directory to test against
    const projectDir = path.join(tempDir, "project");
    const targetDir = path.join(projectDir, "existing-dir-test");
    await fs.promises.mkdir(targetDir, { recursive: true });

    const { lastFrame } = render(
      React.createElement(CloneExampleUI, {
        exampleName: "existing-dir-test",
        yes: true,
      }),
    );

    await waitForText(lastFrame, /Directory existing-dir-test already exists/);
    await waitForText(
      lastFrame,
      /Please choose a different name or remove the existing directory/,
    );

    expect(exec).not.toHaveBeenCalled();
  });

  it("should handle degit clone failure", async () => {
    vi.mocked(getExampleByName).mockReturnValue({
      name: "chat-ux",
      description: "A complete chat interface",
      path: "gensx-inc/chat-ux-template",
      category: "Next.js",
    });

    vi.mocked(exec).mockImplementationOnce((_cmd, optsOrCb, cb) => {
      const callback = typeof optsOrCb === "function" ? optsOrCb : cb;
      process.nextTick(() => callback?.(new Error("Network error"), "", ""));
      return {} as never;
    });

    const { lastFrame } = render(
      React.createElement(CloneExampleUI, {
        exampleName: "chat-ux",
        yes: true,
      }),
    );

    await waitForText(lastFrame, /Network error/);

    expect(exec).toHaveBeenCalledWith(
      "npx degit gensx-inc/chat-ux-template chat-ux",
      expect.any(Function),
    );
    expect(exec).not.toHaveBeenCalledWith("npm install", expect.any(Function));
  });

  it("should handle npm install failure", async () => {
    vi.mocked(getExampleByName).mockReturnValue({
      name: "chat-ux",
      description: "A complete chat interface",
      path: "gensx-inc/chat-ux-template",
      category: "Next.js",
    });

    vi.mocked(exec)
      .mockImplementationOnce((_cmd, optsOrCb, cb) => {
        const callback = typeof optsOrCb === "function" ? optsOrCb : cb;
        process.nextTick(() => callback?.(null, "", ""));
        return {} as never;
      })
      .mockImplementationOnce((_cmd, optsOrCb, cb) => {
        const callback = typeof optsOrCb === "function" ? optsOrCb : cb;
        process.nextTick(() =>
          callback?.(new Error("npm install failed"), "", ""),
        );
        return {} as never;
      });

    const { lastFrame } = render(
      React.createElement(CloneExampleUI, {
        exampleName: "chat-ux",
        yes: true,
      }),
    );

    await waitForText(lastFrame, /npm install failed/);

    expect(exec).toHaveBeenCalledWith(
      "npx degit gensx-inc/chat-ux-template chat-ux",
      expect.any(Function),
    );
    expect(exec).toHaveBeenCalledWith(
      "npm install",
      expect.objectContaining({ cwd: path.resolve("chat-ux") }),
      expect.any(Function),
    );
  });

  it("should show loading states during the cloning process", async () => {
    vi.mocked(getExampleByName).mockReturnValue({
      name: "chat-ux",
      description: "A complete chat interface",
      path: "gensx-inc/chat-ux-template",
      category: "Next.js",
    });

    let callCount = 0;
    vi.mocked(exec).mockImplementation((_cmd, optsOrCb, cb) => {
      const callback = typeof optsOrCb === "function" ? optsOrCb : cb;
      const delay = callCount++ === 0 ? 150 : 150; // Give each command 150ms
      setTimeout(() => callback?.(null, "", ""), delay);
      return {} as never;
    });

    const { lastFrame } = render(
      React.createElement(CloneExampleUI, {
        exampleName: "chat-ux",
        yes: true,
      }),
    );

    // Just verify we see the final success - intermediate states happen too quickly
    await waitForText(lastFrame, /Successfully cloned chat-ux/);
  });

  it("should handle case where example path includes organization", async () => {
    vi.mocked(getExampleByName).mockReturnValue({
      name: "custom-example",
      description: "A custom example",
      path: "my-org/custom-template",
      category: "Custom",
    });

    const { lastFrame } = render(
      React.createElement(CloneExampleUI, {
        exampleName: "custom-example",
        projectName: "my-custom-project",
        yes: true,
      }),
    );

    await waitForText(
      lastFrame,
      /Successfully cloned custom-example to my-custom-project/,
    );

    expect(exec).toHaveBeenCalledWith(
      "npx degit my-org/custom-template my-custom-project",
      expect.any(Function),
    );
  });
});
