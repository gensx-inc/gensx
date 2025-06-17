import fs from "node:fs/promises";
import path from "node:path";

import { render } from "ink-testing-library";
import React from "react";
import { expect, it, suite, vi } from "vitest";

import { ShowProjectUI } from "../../../src/commands/project/show.js";
import * as environmentModel from "../../../src/models/environment.js";
import * as projectModel from "../../../src/models/projects.js";
import * as workflowModel from "../../../src/models/workflows.js";
import { tempDir } from "../../setup.js";
import { waitForText } from "../../test-helpers.js";

// Mock dependencies that are commonly needed across tests
vi.mock("../../../src/models/projects.js", () => ({
  checkProjectExists: vi.fn(),
}));

vi.mock("../../../src/models/environment.js", () => ({
  listEnvironments: vi.fn(),
}));

vi.mock("../../../src/models/workflows.js", () => ({
  listWorkflows: vi.fn(),
}));

suite("project show command", () => {
  it("should show project details with environments and workflows", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Create a real environment config file
    const projectsDir = path.join(tempDir, ".gensx", "projects");
    await fs.writeFile(
      path.join(projectsDir, "test-project.json"),
      JSON.stringify({ selectedEnvironment: "development" }),
      "utf-8",
    );

    // Mock environments
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

    // Mock workflows
    const mockWorkflows = [
      {
        id: "workflow-1",
        name: "test-workflow",
        projectId: "project-1",
        environmentId: "env-1",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-02T00:00:00.000Z",
      },
    ];
    vi.mocked(workflowModel.listWorkflows).mockResolvedValue(mockWorkflows);

    const { lastFrame } = render(
      React.createElement(ShowProjectUI, { projectName: "test-project" }),
    );

    // Verify project name is shown
    await waitForText(lastFrame, /Project:\s+test-project/);

    // Verify environments are shown
    await waitForText(lastFrame, /Environments\s+\(2\)/);
    await waitForText(lastFrame, /development/);
    await waitForText(lastFrame, /production/);

    // Verify workflows are shown
    await waitForText(lastFrame, /Workflows in\s+development\s+\(1\)/);
    await waitForText(lastFrame, /test-workflow/);
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

    // Mock environments
    const mockEnvironments = [
      {
        id: "env-1",
        name: "staging",
        projectId: "project-1",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-02T00:00:00.000Z",
      },
    ];
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue(
      mockEnvironments,
    );

    // Mock workflows
    const mockWorkflows = [
      {
        id: "workflow-1",
        name: "test-workflow",
        projectId: "project-1",
        environmentId: "env-1",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-02T00:00:00.000Z",
      },
    ];
    vi.mocked(workflowModel.listWorkflows).mockResolvedValue(mockWorkflows);

    const { lastFrame } = render(React.createElement(ShowProjectUI, {}));

    // Verify project name was pulled from config
    await waitForText(lastFrame, /Project:\s+config-project/);
  });

  it("should show error when no project is specified and none in config", async () => {
    // No gensx.yaml file, so it will fail to find a project
    const { lastFrame } = render(React.createElement(ShowProjectUI, {}));

    await waitForText(
      lastFrame,
      /No project name found\. Either specify --project or create a gensx\.yaml file with a 'projectName' field\./,
    );
  });

  it("should show error when project does not exist", async () => {
    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    const { lastFrame } = render(
      React.createElement(ShowProjectUI, { projectName: "non-existent" }),
    );

    await waitForText(lastFrame, /Project non-existent does not exist/);
  });

  it("should show message when no environments exist", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock empty environments list
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue([]);

    // Mock empty workflows list
    vi.mocked(workflowModel.listWorkflows).mockResolvedValue([]);

    const { lastFrame } = render(
      React.createElement(ShowProjectUI, { projectName: "test-project" }),
    );

    // Verify message about no environments
    await waitForText(lastFrame, /No environments found/);
    await waitForText(lastFrame, /Run\s+gensx env create/);
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

    // Mock environments
    const mockEnvironments = [
      {
        id: "env-1",
        name: "development",
        projectId: "project-1",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-02T00:00:00.000Z",
      },
    ];
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue(
      mockEnvironments,
    );

    // Mock empty workflows list
    vi.mocked(workflowModel.listWorkflows).mockResolvedValue([]);

    const { lastFrame } = render(
      React.createElement(ShowProjectUI, { projectName: "test-project" }),
    );

    // Verify message about selecting an environment
    await waitForText(lastFrame, /Run\s+gensx env select/);
  });

  it("should show message when no workflows exist in selected environment", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Create environment config with selection
    const projectsDir = path.join(tempDir, ".gensx", "projects");
    await fs.writeFile(
      path.join(projectsDir, "test-project.json"),
      JSON.stringify({ selectedEnvironment: "development" }),
      "utf-8",
    );

    // Mock environments
    const mockEnvironments = [
      {
        id: "env-1",
        name: "development",
        projectId: "project-1",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-02T00:00:00.000Z",
      },
    ];
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue(
      mockEnvironments,
    );

    // Mock empty workflows list
    vi.mocked(workflowModel.listWorkflows).mockResolvedValue([]);

    const { lastFrame } = render(
      React.createElement(ShowProjectUI, { projectName: "test-project" }),
    );

    // Verify message about no workflows
    await waitForText(lastFrame, /No workflows found in\s+development/);
    await waitForText(lastFrame, /Deploy a workflow with/);
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
      React.createElement(ShowProjectUI, { projectName: "test-project" }),
    );

    // Check for spinner indicator
    expect(lastFrame()).toBeTruthy();
    expect(lastFrame()?.length).toBeGreaterThan(0);
  });
});
