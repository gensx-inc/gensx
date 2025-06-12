import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import React from "react";
import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import { EnvironmentResolver } from "../../src/components/EnvironmentResolver.js";
import * as environmentModel from "../../src/models/environment.js";
import * as projectModel from "../../src/models/projects.js";
import * as envConfig from "../../src/utils/env-config.js";
import { waitForText } from "../test-helpers.js";

// Mock dependencies
vi.mock("../../src/models/environment.js", () => ({
  createEnvironment: vi.fn(),
  listEnvironments: vi.fn(),
}));

vi.mock("../../src/models/projects.js", () => ({
  checkProjectExists: vi.fn(),
  createProject: vi.fn(),
}));

vi.mock("../../src/utils/env-config.js", () => ({
  getSelectedEnvironment: vi.fn(),
  validateAndSelectEnvironment: vi.fn(),
}));

// Mock SelectInput component
vi.mock("ink-select-input", () => ({
  default: ({
    items,
    onSelect,
  }: {
    items: { label: string; value: string }[];
    onSelect: (item: { label: string; value: string }) => void;
  }) => {
    console.info("SelectInput items:", items);
    global.__selectInputCallback = onSelect;
    // If items are Yes/No, render as before
    if (
      items.length === 2 &&
      items[0].label.trim() === "Yes" &&
      items[1].label.trim() === "No"
    ) {
      return React.createElement(Box, {}, [
        React.createElement(Text, { key: "yes" }, "❯ Yes"),
        React.createElement(Text, { key: "no" }, "  No"),
      ]);
    }
    // Otherwise, render all items
    return React.createElement(
      Box,
      {},
      items.map((item) =>
        React.createElement(Text, { key: item.value }, item.label),
      ),
    );
  },
}));

// Mock TextInput component
vi.mock("ink-text-input", () => ({
  default: ({
    value,
    onChange,
    onSubmit,
  }: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (value: string) => void;
  }) => {
    global.__textInputCallbacks = { onChange, onSubmit };
    return React.createElement(Text, {}, value);
  },
}));

// Define the type for the global callbacks
declare global {
  var __selectInputCallback:
    | ((item: { label: string; value: string }) => void)
    | undefined;
  var __textInputCallbacks:
    | {
        onChange: (value: string) => void;
        onSubmit: (value: string) => void;
      }
    | undefined;
}

// Reset mocks
afterEach(() => {
  vi.resetAllMocks();
  global.__selectInputCallback = undefined;
  global.__textInputCallbacks = undefined;
});

suite("EnvironmentResolver component", () => {
  const mockEnvironments = [
    {
      id: "env-1",
      name: "development",
      projectId: "proj-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "env-2",
      name: "production",
      projectId: "proj-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    // Setup common mocks
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue(
      mockEnvironments,
    );
    vi.mocked(environmentModel.createEnvironment).mockResolvedValue({
      id: "env-3",
      name: "staging",
    });
  });

  it("should use specified environment immediately", async () => {
    const onResolved = vi.fn();
    render(
      React.createElement(EnvironmentResolver, {
        projectName: "test-project",
        specifiedEnvironment: "production",
        onResolved,
      }),
    );

    // Wait for the component to resolve
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should resolve immediately with specified environment
    expect(onResolved).toHaveBeenCalledWith("production");
  });

  it("should show loading state initially", () => {
    const { lastFrame } = render(
      React.createElement(EnvironmentResolver, {
        projectName: "test-project",
        onResolved: vi.fn(),
      }),
    );

    expect(lastFrame()?.includes("Resolving environment...")).toBe(true);
  });

  it("should show error when project does not exist and creation is not allowed", async () => {
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);

    const { lastFrame } = render(
      React.createElement(EnvironmentResolver, {
        projectName: "non-existent",
        allowCreate: false,
        onResolved: vi.fn(),
      }),
    );

    await waitForText(lastFrame, /Project 'non-existent' does not exist/);
  });

  it("should allow project creation when it doesn't exist", async () => {
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);
    const onResolved = vi.fn();
    const { lastFrame } = render(
      React.createElement(EnvironmentResolver, {
        projectName: "new-project",
        onResolved,
      }),
    );

    // Wait for selection list to appear
    await waitForText(lastFrame, /Select an environment for project/);

    // Simulate selecting create new
    if (global.__selectInputCallback) {
      global.__selectInputCallback({
        label: "+ create new",
        value: "__create__",
      });
    }

    // Wait for create prompt to appear
    await waitForText(lastFrame, /Enter a name for the new environment/);

    // Simulate entering new environment name
    if (global.__textInputCallbacks) {
      global.__textInputCallbacks.onChange("staging");
      global.__textInputCallbacks.onSubmit("staging");
    }

    // Wait for the component to resolve
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should create project and environment
    expect(projectModel.createProject).toHaveBeenCalledWith(
      "new-project",
      "staging",
      undefined,
      undefined,
    );
    expect(onResolved).toHaveBeenCalledWith("staging");
  });

  it("should create default environment when none exist and yes flag is set", async () => {
    vi.mocked(environmentModel.listEnvironments).mockResolvedValue([]);
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(null);
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(false);
    const onResolved = vi.fn();

    render(
      React.createElement(EnvironmentResolver, {
        projectName: "test-project",
        yes: true,
        onResolved,
      }),
    );

    // Wait for the component to resolve
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should create project and default environment
    expect(projectModel.createProject).toHaveBeenCalledWith(
      "test-project",
      "default",
      undefined,
      undefined,
    );
    expect(onResolved).toHaveBeenCalledWith("default");
  });

  it("should create new environment in existing project", async () => {
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);
    const onResolved = vi.fn();
    const { lastFrame } = render(
      React.createElement(EnvironmentResolver, {
        projectName: "test-project",
        onResolved,
      }),
    );

    // Wait for selection list to appear
    await waitForText(lastFrame, /Select an environment for project/);

    // Simulate selecting create new
    if (global.__selectInputCallback) {
      global.__selectInputCallback({
        label: "+ create new",
        value: "__create__",
      });
    }

    // Wait for create prompt to appear
    await waitForText(lastFrame, /Enter a name for the new environment/);

    // Simulate entering new environment name
    if (global.__textInputCallbacks) {
      global.__textInputCallbacks.onChange("staging");
      global.__textInputCallbacks.onSubmit("staging");
    }

    // Wait for the component to resolve
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should create environment in existing project
    expect(environmentModel.createEnvironment).toHaveBeenCalledWith(
      "test-project",
      "staging",
    );
    expect(onResolved).toHaveBeenCalledWith("staging");
  });

  it("should show environment selection list", async () => {
    const { lastFrame } = render(
      React.createElement(EnvironmentResolver, {
        projectName: "test-project",
        onResolved: vi.fn(),
      }),
    );

    // Wait for selection list to appear
    await waitForText(lastFrame, /Select an environment for project/);
    await waitForText(lastFrame, /development/);
    await waitForText(lastFrame, /production/);
    await waitForText(lastFrame, /\+ create new/);
  });

  it("should allow selecting an existing environment", async () => {
    const onResolved = vi.fn();
    const { lastFrame } = render(
      React.createElement(EnvironmentResolver, {
        projectName: "test-project",
        onResolved,
      }),
    );

    // Wait for selection list to appear
    await waitForText(lastFrame, /Select an environment for project/);

    // Simulate selecting an environment
    if (global.__selectInputCallback) {
      global.__selectInputCallback({
        label: "production",
        value: "production",
      });
    }

    // Wait for the component to resolve
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should resolve with selected environment
    expect(onResolved).toHaveBeenCalledWith("production");
  });

  it("should show create environment prompt", async () => {
    const { lastFrame } = render(
      React.createElement(EnvironmentResolver, {
        projectName: "test-project",
        onResolved: vi.fn(),
      }),
    );

    // Wait for selection list to appear
    await waitForText(lastFrame, /Select an environment for project/);

    // Simulate selecting create new
    if (global.__selectInputCallback) {
      global.__selectInputCallback({
        label: "+ create new",
        value: "__create__",
      });
    }

    // Wait for create prompt to appear
    await waitForText(lastFrame, /Enter a name for the new environment/);
  });

  it("should create new environment", async () => {
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);
    vi.mocked(environmentModel.createEnvironment).mockResolvedValue({
      id: "env-3",
      name: "staging",
    });

    const onResolved = vi.fn();
    const { lastFrame } = render(
      React.createElement(EnvironmentResolver, {
        projectName: "test-project",
        onResolved,
      }),
    );

    // Wait for selection list to appear
    await waitForText(lastFrame, /Select an environment for project/);

    // Simulate selecting create new
    if (global.__selectInputCallback) {
      global.__selectInputCallback({
        label: "+ create new",
        value: "__create__",
      });
    }

    // Wait for create prompt to appear
    await waitForText(lastFrame, /Enter a name for the new environment/);

    // Simulate entering new environment name
    if (global.__textInputCallbacks) {
      global.__textInputCallbacks.onChange("staging");
      global.__textInputCallbacks.onSubmit("staging");
    }

    // Wait for the component to resolve
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Should create and resolve with new environment
    expect(environmentModel.createEnvironment).toHaveBeenCalledWith(
      "test-project",
      "staging",
    );
    expect(onResolved).toHaveBeenCalledWith("staging");
  });

  it("should confirm pre-selected environment", async () => {
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(
      "development",
    );
    const onResolved = vi.fn();
    const { lastFrame } = render(
      React.createElement(EnvironmentResolver, {
        projectName: "test-project",
        onResolved,
      }),
    );

    // Wait for confirmation prompt
    await waitForText(lastFrame, /Use selected environment/);

    // Simulate confirming selection
    if (global.__selectInputCallback) {
      global.__selectInputCallback({ label: "Yes", value: "yes" });
    }

    // Wait for the component to resolve
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should resolve with confirmed environment
    expect(onResolved).toHaveBeenCalledWith("development");
  });

  it("should allow changing pre-selected environment", async () => {
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(
      "development",
    );
    const onResolved = vi.fn();
    const { lastFrame } = render(
      React.createElement(EnvironmentResolver, {
        projectName: "test-project",
        onResolved,
      }),
    );

    // Wait for confirmation prompt
    await waitForText(lastFrame, /Use selected environment/);

    // Simulate rejecting selection
    if (global.__selectInputCallback) {
      global.__selectInputCallback({ label: "No", value: "no" });
    }

    // Wait for selection list to appear
    await waitForText(lastFrame, /Select an environment for project/);

    // Should show selection list instead of resolving
    expect(onResolved).not.toHaveBeenCalled();
  });

  it("should auto-resolve with yes flag", async () => {
    vi.mocked(envConfig.getSelectedEnvironment).mockResolvedValue(
      "development",
    );
    vi.mocked(projectModel.checkProjectExists).mockResolvedValue(true);
    const onResolved = vi.fn();

    render(
      React.createElement(EnvironmentResolver, {
        projectName: "test-project",
        yes: true,
        onResolved,
      }),
    );

    // Wait for the component to resolve
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should resolve with selected environment
    expect(onResolved).toHaveBeenCalledWith("development");
  });
});
