import fs from "node:fs/promises";
import path from "node:path";

import { render } from "ink-testing-library";
import React from "react";
import { expect, it, suite, vi } from "vitest";

import { ShowEnvironmentUI } from "../../../src/commands/environment/show.js";
import * as projectModel from "../../../src/models/projects.js";
import { tempDir } from "../../setup.js";
import { waitForText } from "../../test-helpers.js";

// Mock dependencies that are commonly needed across tests
vi.mock("../../../src/models/projects.js", () => ({
  checkProjectExists: vi.fn(),
}));

vi.mock("../../../src/models/environment.js", () => ({
  listEnvironments: vi.fn(),
}));

suite("env command", () => {
  it("should show selected environment for a specified project", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Create a real environment config file
    const projectsDir = path.join(tempDir, ".gensx", "projects");
    await fs.writeFile(
      path.join(projectsDir, "test-project.json"),
      JSON.stringify({ selectedEnvironment: "development" }),
      "utf-8",
    );

    const { lastFrame } = render(
      React.createElement(ShowEnvironmentUI, { projectName: "test-project" }),
    );

    // Verify selected environment is shown
    await waitForText(
      lastFrame,
      /Active environment for project\s+test-project/,
    );
    await waitForText(lastFrame, /development/);
  });

  it("should use project name from config when not specified", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Create a real gensx.yaml file in the project directory
    await fs.writeFile(
      path.join(tempDir, "project", "gensx.yaml"),
      `# GenSX Project Configuration
projectName: config-project
`,
      "utf-8",
    );

    // Create a real environment config file
    const projectsDir = path.join(tempDir, ".gensx", "projects");
    await fs.writeFile(
      path.join(projectsDir, "config-project.json"),
      JSON.stringify({ selectedEnvironment: "staging" }),
      "utf-8",
    );

    const { lastFrame } = render(React.createElement(ShowEnvironmentUI, {}));

    // Verify project name was pulled from config
    await waitForText(
      lastFrame,
      /Active environment for project\s+config-project/,
    );
    await waitForText(lastFrame, /staging/);
  });

  it("should show error when no project is specified and none in config", async () => {
    // No gensx.yaml file, so it will fail to find a project

    const { lastFrame } = render(React.createElement(ShowEnvironmentUI, {}));

    await waitForText(
      lastFrame,
      /No project name found\. Either specify --project or create a gensx\.yaml file with a 'projectName' field\./,
    );
  });

  it("should show error when project does not exist", async () => {
    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    const { lastFrame } = render(
      React.createElement(ShowEnvironmentUI, { projectName: "non-existent" }),
    );

    await waitForText(lastFrame, /Project non-existent does not exist/);
  });

  it("should show message when no environment is selected", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Create an empty environment config file (no selection)
    const projectsDir = path.join(tempDir, ".gensx", "projects");
    await fs.writeFile(
      path.join(projectsDir, "test-project.json"),
      JSON.stringify({}),
      "utf-8",
    );

    const { lastFrame } = render(
      React.createElement(ShowEnvironmentUI, { projectName: "test-project" }),
    );

    // Verify message about no active environment
    await waitForText(
      lastFrame,
      /No active environment set for project\s+test-project/,
    );
    await waitForText(lastFrame, /Run\s+gensx env select/);
  });

  it("should show loading spinner initially", () => {
    // Mock project exists but never completes to simulate loading state
    vi.mocked(projectModel.checkProjectExists).mockImplementation(
      () =>
        new Promise<boolean>(() => {
          /* never resolves */
        }),
    );

    const { lastFrame } = render(
      React.createElement(ShowEnvironmentUI, { projectName: "test-project" }),
    );

    // Check for spinner indicator
    expect(lastFrame()).toBeTruthy();
    expect(lastFrame()?.length).toBeGreaterThan(0);
  });
});
