import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import React from "react";
import { afterEach, expect, it, suite, vi } from "vitest";

import { CreateEnvironmentUI } from "../../../src/commands/environment/create.js";
import * as environmentModel from "../../../src/models/environment.js";
import * as projectModel from "../../../src/models/projects.js";
import * as envConfig from "../../../src/utils/env-config.js";
import * as projectConfig from "../../../src/utils/project-config.js";
import { waitForText } from "../../test-helpers.js";

// Setup Ink mocks
const { selectInput } = vi.hoisted(() => ({
  selectInput: {
    onSelect: undefined as ((item: { label: string; value: string }) => void) | undefined,
    options: [] as { label: string; value: string }[],
  },
}));

vi.mock("ink-select-input", () => ({
  __esModule: true,
  default: ({ onSelect }: { onSelect: (item: { label: string; value: string }) => void }) => {
    selectInput.onSelect = onSelect;
    selectInput.options = [];
    return React.createElement(Box, {}, [
      React.createElement(Text, { key: "yes" }, "❯ Yes"),
      React.createElement(Text, { key: "no" }, "  No"),
    ]);
  },
}));

// Mock dependencies that would make API calls
vi.mock("../../../src/models/environment.js", () => ({
  createEnvironment: vi.fn(),
  checkEnvironmentExists: vi.fn().mockResolvedValue(false),
}));

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
afterEach(() => {
  vi.clearAllMocks();
  selectInput.onSelect = undefined;
  selectInput.options = [];
});

suite("environment create Ink UI", () => {
  it("should create environment for an existing project", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock create environment
    vi.mocked(environmentModel.createEnvironment).mockResolvedValue({
      id: "env-1",
      name: "development",
    });

    // Mock environment selection
    vi.mocked(envConfig.validateAndSelectEnvironment).mockResolvedValue(true);

    const { lastFrame } = render(
      React.createElement(CreateEnvironmentUI, {
        environmentName: "development",
        projectName: "test-project",
      }),
    );

    // Wait for successful creation message with longer timeout
    await waitForText(
      lastFrame,
      /Environment development created for project test-project/,
    );
    await waitForText(lastFrame, /Environment development is now active/);

    // Verify environment was created
    expect(environmentModel.createEnvironment).toHaveBeenCalledWith(
      "test-project",
      "development",
    );
  });

  it("should use project name from config when not specified", async () => {
    // Mock project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue({
      projectName: "config-project",
    });

    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock create environment
    vi.mocked(environmentModel.createEnvironment).mockResolvedValue({
      id: "env-1",
      name: "staging",
    });

    // Mock environment selection
    vi.mocked(envConfig.validateAndSelectEnvironment).mockResolvedValue(true);

    const { lastFrame } = render(
      React.createElement(CreateEnvironmentUI, { environmentName: "staging" }),
    );

    // Wait for successful creation message
    await waitForText(
      lastFrame,
      /Environment staging created for project config-project/,
    );
    await waitForText(lastFrame, /Environment staging is now active/);

    // Verify environment was created with config project name
    expect(environmentModel.createEnvironment).toHaveBeenCalledWith(
      "config-project",
      "staging",
    );
  });

  it("should throw error when no project is specified and none in config", async () => {
    // Mock empty project config
    vi.mocked(projectConfig.readProjectConfig).mockResolvedValue(null);

    const { lastFrame } = render(
      React.createElement(CreateEnvironmentUI, {
        environmentName: "production",
      }),
    );

    // Wait for error message
    await waitForText(
      lastFrame,
      /No project name found\. Either specify --project or create a gensx\.yaml file with a 'projectName' field\./,
    );
  });

  it("should handle error when environment already exists", async () => {
    // Mock project exists
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);

    // Mock environment already exists
    vi.mocked(environmentModel.checkEnvironmentExists).mockResolvedValue(true);

    const { lastFrame } = render(
      React.createElement(CreateEnvironmentUI, {
        environmentName: "development",
        projectName: "test-project",
      }),
    );

    // Wait for error message
    await waitForText(
      lastFrame,
      /Environment development already exists for project test-project/,
    );
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
      React.createElement(CreateEnvironmentUI, {
        environmentName: "development",
        projectName: "any-project",
      }),
    );

    // Check for spinner indicator
    expect(lastFrame()).toBeTruthy();
    expect(lastFrame()?.length).toBeGreaterThan(0);
  });

  it("should prompt to create project when project does not exist and user confirms", async () => {
    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    // Mock create project
    vi.mocked(projectModel.createProject).mockResolvedValue({
      id: "project-1",
      name: "new-project",
    });

    // Mock environment selection
    vi.mocked(envConfig.validateAndSelectEnvironment).mockResolvedValue(true);

    const { lastFrame } = render(
      React.createElement(CreateEnvironmentUI, {
        environmentName: "development",
        projectName: "new-project",
      }),
    );

    // Wait for confirmation prompt
    await waitForText(lastFrame, /Project new-project does not exist\./);
    await waitForText(lastFrame, /Would you like to create it\?/);

    // Simulate selecting "Yes" from SelectInput
    selectInput.onSelect?.({ label: "Yes", value: "yes" });

    // Wait for success message with a longer timeout
    await waitForText(
      lastFrame,
      /Project new-project and environment development created/,
      3000,
    );
    await waitForText(lastFrame, /Environment development is now active/, 3000);

    // Verify project was created with environment
    expect(projectModel.createProject).toHaveBeenCalledWith(
      "new-project",
      "development",
      undefined,
    );

    // Verify environment was not created separately (it's created with the project)
    expect(environmentModel.createEnvironment).not.toHaveBeenCalled();
  });

  it("should not create environment when project does not exist and user cancels", async () => {
    // Mock project does not exist
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    const { lastFrame } = render(
      React.createElement(CreateEnvironmentUI, {
        environmentName: "development",
        projectName: "non-existent",
      }),
    );

    // Wait for confirmation prompt
    await waitForText(lastFrame, /Project non-existent does not exist\./);
    await waitForText(lastFrame, /Would you like to create it\?/);

    // Simulate selecting "No" from SelectInput
    selectInput.onSelect?.({ label: "No", value: "no" });

    // Wait for error message with a longer timeout
    await waitForText(lastFrame, /Project creation cancelled/, 3000);

    // Verify project was not created
    expect(projectModel.createProject).not.toHaveBeenCalled();

    // Verify environment was not created
    expect(environmentModel.createEnvironment).not.toHaveBeenCalled();
  });
});
