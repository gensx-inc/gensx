import { render } from "ink-testing-library";
import React from "react";
import { afterEach, expect, it, suite, vi } from "vitest";

import { ListEnvironmentsUI } from "../../../src/commands/environment/list.js";
import * as environmentModel from "../../../src/models/environment.js";
import * as projectModel from "../../../src/models/projects.js";
import * as projectConfig from "../../../src/utils/project-config.js";

// Mock dependencies
vi.mock("../../../src/models/environment.js", () => ({
  listEnvironments: vi.fn(),
}));

vi.mock("../../../src/models/projects.js", () => ({
  checkProjectExists: vi.fn(),
}));

vi.mock("../../../src/utils/project-config.js", () => ({
  readProjectConfig: vi.fn(),
}));

function waitForText(
  getFrame: () => string | undefined,
  text: string | RegExp,
  timeout = 1000,
) {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    function check() {
      const frame = getFrame() ?? ""; // treat undefined as empty string
      if (typeof text === "string" ? frame.includes(text) : text.test(frame)) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error(`Timed out waiting for text: ${text}`));
      } else {
        setTimeout(check, 20);
      }
    }
    check();
  });
}

suite("environment list Ink UI", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should list environments for a specified project", async () => {
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);
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
  });

  it("should use project name from config when not specified", async () => {
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "config-project",
    });
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
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue(null);
    const { lastFrame } = render(React.createElement(ListEnvironmentsUI));
    await waitForText(
      lastFrame,
      /No project name found\. Either specify --project or create a gensx\.yaml file with a\s+'projectName' field\./s,
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
    vi.mocked(projectModel.checkProjectExists).mockImplementation(
      () =>
        new Promise<boolean>((_resolve) => {
          /* never resolves */
        }),
    );
    const { lastFrame } = render(
      React.createElement(ListEnvironmentsUI, { projectName: "any-project" }),
    );
    expect(lastFrame()).toMatch(/Fetching environments/);
  });
});
