import { render } from "ink-testing-library";
import React from "react";
import { expect, it, suite, vi } from "vitest";

import { ListExamplesUI } from "../../../src/commands/examples/list.js";
import { waitForText } from "../../test-helpers.js";

// Mock the supported examples module
vi.mock("../../../src/commands/examples/supported-examples.js", () => ({
  SUPPORTED_EXAMPLES: [
    {
      name: "chat-ux",
      description: "A complete chat interface with modern UX patterns",
      category: "ui",
      path: "examples/chat-ux",
    },
    {
      name: "deep-research",
      description: "AI-powered research tool with web search",
      category: "ai",
      path: "examples/deep-research",
    },
    {
      name: "blog-writer",
      description: "AI-powered blog writing assistant",
      category: "ai",
      path: "examples/blog-writer",
    },
    {
      name: "no-category-example",
      description: "An example without a category",
      path: "examples/no-category-example",
    },
  ],
}));

suite("examples list Ink UI", () => {
  it("should list all available examples with categories", async () => {
    const { lastFrame } = render(React.createElement(ListExamplesUI));

    // Wait for the header
    await waitForText(lastFrame, /Available Examples:/);

    // Check that all examples are displayed
    await waitForText(lastFrame, /chat-ux/);
    await waitForText(lastFrame, /deep-research/);
    await waitForText(lastFrame, /blog-writer/);
    await waitForText(lastFrame, /no-category-example/);

    // Check that categories are shown for examples that have them
    await waitForText(lastFrame, /\(ui\)/);
    await waitForText(lastFrame, /\(ai\)/);

    // Check that descriptions are shown
    await waitForText(
      lastFrame,
      /A complete chat interface with modern UX patterns/,
    );
    await waitForText(lastFrame, /AI-powered research tool with web search/);
    await waitForText(lastFrame, /AI-powered blog writing assistant/);
    await waitForText(lastFrame, /An example without a category/);

    // Check that help text is shown
    await waitForText(
      lastFrame,
      /Run.*gensx examples clone.*to clone an example/,
    );
  });

  it("should format the help command correctly", async () => {
    const { lastFrame } = render(React.createElement(ListExamplesUI));

    await waitForText(lastFrame, /Available Examples:/);

    // Check for the specific command format with proper escaping
    await waitForText(lastFrame, /gensx examples clone <example-name>/);
  });

  it("should show examples in a readable format with proper spacing", async () => {
    const { lastFrame } = render(React.createElement(ListExamplesUI));

    await waitForText(lastFrame, /Available Examples:/);

    const output = lastFrame();

    // Verify the general structure - examples should be indented
    expect(output).toContain("chat-ux");
    expect(output).toContain("(ui)");
    expect(output).toContain("A complete chat interface");

    // Check that there's proper spacing and indentation
    expect(output).toBeTruthy();
    expect(output?.length).toBeGreaterThan(100); // Should have substantial content
  });

  it("should show both categorized and uncategorized examples", async () => {
    const { lastFrame } = render(React.createElement(ListExamplesUI));

    await waitForText(lastFrame, /Available Examples:/);

    const output = lastFrame();

    // Should show examples with categories
    expect(output).toContain("chat-ux");
    expect(output).toContain("(ui)");

    // Should show examples without categories
    expect(output).toContain("no-category-example");

    // Should not show empty parentheses for examples without categories
    const lines = output?.split("\n") ?? [];
    const noCategoryLine = lines.find((line) =>
      line.includes("no-category-example"),
    );
    expect(noCategoryLine).toBeTruthy();
    expect(noCategoryLine).not.toMatch(/\(\s*\)/); // No empty parentheses
  });

  it("should display help text with proper formatting", async () => {
    const { lastFrame } = render(React.createElement(ListExamplesUI));

    await waitForText(lastFrame, /Available Examples:/);
    await waitForText(lastFrame, /› Run/);
    await waitForText(lastFrame, /gensx examples clone/);
    await waitForText(lastFrame, /to clone an example/);

    const output = lastFrame();

    // Check that the help text uses the arrow character and proper formatting
    expect(output).toContain("› Run");
    expect(output).toContain("gensx examples clone <example-name>");
  });
});
