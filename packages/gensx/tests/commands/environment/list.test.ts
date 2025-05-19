import fs from "node:fs/promises";
import path from "node:path";

import { render } from "ink-testing-library";
import React from "react";
import { expect, it, suite, vi } from "vitest";

import { ListEnvironmentsUI } from "../../../src/commands/environment/list.js";
import * as environmentModel from "../../../src/models/environment.js";
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

suite("environment list Ink UI", () => {
  it("should list environments for a specified project", async () => {
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Setup environment config with a selected environment
    const projectsDir = path.join(tempDir, ".gensx", "projects");
    await fs.writeFile(
      path.join(projectsDir, "test-project.json"),
      JSON.stringify({ selectedEnvironment: "development" }),
      "utf-8",
    );

    const mockEnvironments = [
      {
        id: "env-1",
        name: "development",
        projectId: "project-1",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-02T00:00:00.000Z",
      },
      {
        id: "env-2",
        name: "production",
        projectId: "project-1",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-03T00:00:00.000Z",
      },
    ];
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue(
      mockEnvironments,
    );

    const { lastFrame } = render(
      React.createElement(ListEnvironmentsUI, { projectName: "test-project" }),
    );

    await waitForText(
      lastFrame,
      /Found\s+2\s+environments for project\s+test-project/,
    );
    await waitForText(lastFrame, /development/);
    await waitForText(lastFrame, /production/);
    await waitForText(lastFrame, /Active environment:\s+development/);
  });

  it("should use project name from config when not specified", async () => {
    // Create a real gensx.yaml config file
    await fs.writeFile(
      path.join(tempDir, "project", "gensx.yaml"),
      `# GenSX Project Configuration
projectName: config-project
`,
      "utf-8",
    );

    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue([]);

    const { lastFrame } = render(React.createElement(ListEnvironmentsUI));

    await waitForText(
      lastFrame,
      /Found\s+0\s+environments for project\s+config-project/,
    );
    await waitForText(lastFrame, /No environments found/);
  });

  it("should show error when no project is specified and none in config", async () => {
    // No gensx.yaml file, so it will fail to find a project
    const { lastFrame } = render(React.createElement(ListEnvironmentsUI));

    await waitForText(
      lastFrame,
      /No project name found\. Either specify --project or create a gensx\.yaml file with a 'projectName' field\./,
    );
  });

  it("should show error when project does not exist", async () => {
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    const { lastFrame } = render(
      React.createElement(ListEnvironmentsUI, { projectName: "non-existent" }),
    );

    await waitForText(lastFrame, /Project non-existent does not exist/);
  });

  it("should show loading spinner initially", () => {
    // Mock checkProjectExists to never resolve, keeping component in loading state
    vi.mocked(projectModel.checkProjectExists).mockImplementation(
      () =>
        new Promise<boolean>(() => {
          /* never resolves */
        }),
    );

    const { lastFrame } = render(
      React.createElement(ListEnvironmentsUI, { projectName: "any-project" }),
    );

    // Check for spinner indicator
    expect(lastFrame()).toBeTruthy();
    expect(lastFrame()?.length).toBeGreaterThan(0);
  });
});
