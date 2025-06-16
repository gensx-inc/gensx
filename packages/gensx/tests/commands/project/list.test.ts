import { render } from "ink-testing-library";
import React from "react";
import { expect, it, suite, vi } from "vitest";

import { ListProjectsUI } from "../../../src/commands/project/list.js";
import * as projectModel from "../../../src/models/projects.js";
import { waitForText } from "../../test-helpers.js";

// Mock dependencies that would make API calls
vi.mock("../../../src/models/projects.js", () => ({
  listProjects: vi.fn(),
}));

suite("project list Ink UI", () => {
  it("should list all projects", async () => {
    const mockProjects = [
      {
        id: "project-1",
        name: "test-project",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-02T00:00:00.000Z",
      },
      {
        id: "project-2",
        name: "another-project",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-03T00:00:00.000Z",
      },
    ];
    vi.mocked(projectModel.listProjects).mockResolvedValue(mockProjects);

    const { lastFrame } = render(React.createElement(ListProjectsUI));

    // Wait for the count message
    await waitForText(lastFrame, /Found\s+2\s+project/);

    // Wait for project names
    await waitForText(lastFrame, /test-project/);
    await waitForText(lastFrame, /another-project/);

    // Verify projects were fetched
    expect(projectModel.listProjects).toHaveBeenCalled();
  });

  it("should show message when no projects exist", async () => {
    vi.mocked(projectModel.listProjects).mockResolvedValue([]);

    const { lastFrame } = render(React.createElement(ListProjectsUI));

    // Wait for the count message
    await waitForText(lastFrame, /Found\s+0\s+project/);
    await waitForText(lastFrame, /No projects found/);

    // Verify projects were fetched
    expect(projectModel.listProjects).toHaveBeenCalled();
  });

  it("should show error when not authenticated", async () => {
    vi.mocked(projectModel.listProjects).mockRejectedValue(
      new Error("Not authenticated. Please run 'gensx login' first."),
    );

    const { lastFrame } = render(React.createElement(ListProjectsUI));

    // Wait for error message
    await waitForText(
      lastFrame,
      /Not authenticated\. Please run 'gensx login' first\./,
    );
  });

  it("should show loading spinner initially", () => {
    // Mock listProjects to never resolve, keeping component in loading state
    vi.mocked(projectModel.listProjects).mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );

    const { lastFrame } = render(React.createElement(ListProjectsUI));

    // Check for spinner indicator
    expect(lastFrame()).toBeTruthy();
    expect(lastFrame()?.length).toBeGreaterThan(0);
  });
});
