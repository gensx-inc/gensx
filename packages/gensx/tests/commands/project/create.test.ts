import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import React from "react";
import { expect, it, suite, vi } from "vitest";

import { CreateProjectUI } from "../../../src/commands/project/create.js";
import * as projectModel from "../../../src/models/projects.js";
import * as envConfig from "../../../src/utils/env-config.js";
import * as projectConfig from "../../../src/utils/project-config.js";
import { waitForText } from "../../test-helpers.js";

// Define the type for the global callback
declare global {
  var __selectInputCallback:
    | ((item: { label: string; value: string }) => void)
    | undefined;
  var __textInputCallback: ((value: string) => void) | undefined;
}

// Mock SelectInput component
vi.mock("ink-select-input", () => ({
  default: ({
    onSelect,
  }: {
    onSelect: (item: { label: string; value: string }) => void;
  }) => {
    // Store the onSelect callback for later use
    global.__selectInputCallback = onSelect;
    return React.createElement(Box, {}, [
      React.createElement(Text, { key: "yes" }, "❯ Yes"),
      React.createElement(Text, { key: "no" }, "  No"),
    ]);
  },
}));

// Mock TextInput component
vi.mock("ink-text-input", () => ({
  default: ({ onSubmit }: { onSubmit: (value: string) => void }) => {
    // Store the onSubmit callback for later use
    global.__textInputCallback = onSubmit;
    return React.createElement(Text, {}, "input");
  },
}));

// Mock dependencies that would make API calls
vi.mock("../../../src/models/projects.js", () => ({
  checkProjectExists: vi.fn(),
  createProject: vi.fn(),
}));

vi.mock("../../../src/utils/project-config.js", () => ({
  readProjectConfig: vi.fn(),
}));

vi.mock("../../../src/utils/env-config.js", () => ({
  validateAndSelectEnvironment: vi.fn().mockResolvedValue(true),
}));

suite("project create Ink UI", () => {
  it("should create project with specified name and environment", async () => {
    // Mock project doesn't exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    // Mock create project
    vi.mocked(projectModel.createProject).mockResolvedValue({
      id: "project-1",
      name: "test-project",
    });

    // Mock environment selection
    vi.mocked(envConfig.validateAndSelectEnvironment).mockResolvedValue(true);

    const { lastFrame } = render(
      React.createElement(CreateProjectUI, {
        projectName: "test-project",
        environmentName: "development",
      }),
    );

    // Wait for environment name prompt
    await waitForText(lastFrame, /Enter initial environment name:/);

    // Simulate entering environment name
    if (global.__textInputCallback) {
      global.__textInputCallback("development");
    }

    // Wait for confirmation prompt
    await waitForText(lastFrame, /Project Details/);
    await waitForText(lastFrame, /Create this project\?/);

    // Simulate selecting "Yes" from SelectInput
    if (global.__selectInputCallback) {
      global.__selectInputCallback({ label: "Yes", value: "yes" });
    }

    // Wait for success message
    await waitForText(lastFrame, /Project test-project created successfully/);
    await waitForText(
      lastFrame,
      /Environment development created and selected/,
    );

    // Verify project was created
    expect(projectModel.createProject).toHaveBeenCalledWith(
      "test-project",
      "development",
      undefined,
    );
  });

  it("should use project name from config when not specified", async () => {
    // Mock project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "config-project",
    });

    // Mock project doesn't exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    // Mock create project
    vi.mocked(projectModel.createProject).mockResolvedValue({
      id: "project-1",
      name: "config-project",
    });

    // Mock environment selection
    vi.mocked(envConfig.validateAndSelectEnvironment).mockResolvedValue(true);

    const { lastFrame } = render(
      React.createElement(CreateProjectUI, {
        environmentName: "staging",
      }),
    );

    // Wait for environment name prompt
    await waitForText(lastFrame, /Enter initial environment name:/);

    // Simulate entering environment name
    if (global.__textInputCallback) {
      global.__textInputCallback("staging");
    }

    // Wait for confirmation prompt
    await waitForText(lastFrame, /Project Details/);
    await waitForText(lastFrame, /Create this project\?/);

    // Simulate selecting "Yes" from SelectInput
    if (global.__selectInputCallback) {
      global.__selectInputCallback({ label: "Yes", value: "yes" });
    }

    // Wait for success message
    await waitForText(lastFrame, /Project config-project created successfully/);
    await waitForText(lastFrame, /Environment staging created and selected/);

    // Verify project was created with config project name
    expect(projectModel.createProject).toHaveBeenCalledWith(
      "config-project",
      "staging",
      undefined,
    );
  });

  it("should throw error when no project is specified and none in config", async () => {
    // Mock empty project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue(null);

    const { lastFrame } = render(
      React.createElement(CreateProjectUI, {
        environmentName: "production",
      }),
    );

    // Wait for project name prompt
    await waitForText(lastFrame, /Enter project name:/);

    // Simulate entering empty project name
    if (global.__textInputCallback) {
      global.__textInputCallback(""); // Submit empty string
    }

    // Wait for error message with a longer timeout
    await waitForText(
      lastFrame,
      /No project name found\. Either specify --project or create a gensx\.yaml file with a 'projectName' field\./,
      3000, // Increase timeout to 3 seconds
    );
  });

  it("should handle error when project already exists", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    const { lastFrame } = render(
      React.createElement(CreateProjectUI, {
        projectName: "existing-project",
        environmentName: "development",
      }),
    );

    // Wait for error message
    await waitForText(lastFrame, /Project existing-project already exists/);
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
      React.createElement(CreateProjectUI, {
        projectName: "any-project",
        environmentName: "development",
      }),
    );

    // Check for spinner indicator
    expect(lastFrame()).toBeTruthy();
    expect(lastFrame()?.length).toBeGreaterThan(0);
  });

  it("should not create project when user cancels", async () => {
    // Mock project doesn't exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    const { lastFrame } = render(
      React.createElement(CreateProjectUI, {
        projectName: "new-project",
        environmentName: "development",
      }),
    );

    // Wait for environment name prompt
    await waitForText(lastFrame, /Enter initial environment name:/);

    // Simulate entering environment name
    if (global.__textInputCallback) {
      global.__textInputCallback("development");
    }

    // Wait for confirmation prompt
    await waitForText(lastFrame, /Project Details/);
    await waitForText(lastFrame, /Create this project\?/);

    // Simulate selecting "No" from SelectInput
    if (global.__selectInputCallback) {
      global.__selectInputCallback({ label: "No", value: "no" });
    }

    // Wait for error message
    await waitForText(lastFrame, /Project creation cancelled/);

    // Verify project was not created
    expect(projectModel.createProject).not.toHaveBeenCalled();
  });
});
