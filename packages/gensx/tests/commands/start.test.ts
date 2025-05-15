import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { render } from "ink-testing-library";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StartUI } from "../../src/commands/start.js";
import { tempDir } from "../setup.js";
import { waitForText } from "../test-helpers.js";

// Only mock the file watcher to prevent test instability
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    watch: vi.fn().mockReturnValue({
      close: vi.fn(),
    }),
  };
});

describe("StartUI", () => {
  let portCounter = 1337;

  beforeEach(() => {
    // Create directory structure
    mkdirSync(path.join(tempDir, "project", "src"), { recursive: true });
    mkdirSync(path.join(tempDir, "project", ".gensx"), { recursive: true });
  });

  const createTestFiles = (config: { rootDir?: string }): void => {
    // Create tsconfig.json
    const tsconfig = {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        esModuleInterop: true,
        outDir: "./dist",
        ...(config.rootDir && { rootDir: config.rootDir }),
      },
    };

    const tsconfigPath = path.join(tempDir, "project", "tsconfig.json");
    writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    console.info("Wrote tsconfig.json to:", tsconfigPath);
    console.info("tsconfig.json exists?", existsSync(tsconfigPath));

    // List files in directory
    console.info(
      "Files in temp dir:",
      readdirSync(path.join(tempDir, "project")),
    );

    // Create workflow file
    const workflowContent = `
export const testWorkflow = () => {
  return "test";
};
`;

    // Create files based on test scenario
    if (config.rootDir) {
      // Only create files in src directory if rootDir is specified
      const srcWorkflowPath = path.join(
        tempDir,
        "project",
        "src",
        "workflow.ts",
      );
      writeFileSync(srcWorkflowPath, workflowContent);
      console.info("Wrote src workflow to:", srcWorkflowPath);
      console.info("src workflow exists?", existsSync(srcWorkflowPath));
    } else {
      // Create both files for non-rootDir tests
      const rootWorkflowPath = path.join(tempDir, "project", "workflow.ts");
      writeFileSync(rootWorkflowPath, workflowContent);
      console.info("Wrote root workflow to:", rootWorkflowPath);
      console.info("root workflow exists?", existsSync(rootWorkflowPath));

      const srcWorkflowPath = path.join(
        tempDir,
        "project",
        "src",
        "workflow.ts",
      );
      writeFileSync(srcWorkflowPath, workflowContent);
      console.info("Wrote src workflow to:", srcWorkflowPath);
      console.info("src workflow exists?", existsSync(srcWorkflowPath));
    }
  };

  it("renders initial loading state", () => {
    const { lastFrame } = render(
      React.createElement(StartUI, {
        file: "test.ts",
        options: {
          port: portCounter++,
        },
      }),
    );

    expect(lastFrame()).toContain("Starting dev server...");
  });

  it("renders error state when error occurs", async () => {
    const { lastFrame } = render(
      React.createElement(StartUI, {
        file: "nonexistent.ts",
        options: {
          port: portCounter++,
        },
      }),
    );

    // Wait for the error message to appear
    await waitForText(lastFrame, /Error/);
  });

  it("renders with custom port", () => {
    const { lastFrame } = render(
      React.createElement(StartUI, {
        file: "test.ts",
        options: {
          port: portCounter++,
        },
      }),
    );

    expect(lastFrame()).toContain("Starting dev server...");
  });

  describe("path handling", () => {
    it("handles files in root directory without rootDir specified", async () => {
      createTestFiles({});

      const { lastFrame, unmount } = render(
        React.createElement(StartUI, {
          file: path.join(tempDir, "project", "workflow.ts"),
          options: {
            port: portCounter++,
          },
        }),
      );

      try {
        // Wait for the server to start and schema to be generated
        await waitForText(lastFrame, "GenSX Dev Server running at");

        // Add a small delay to ensure schema file is written
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Check that schema file was written
        expect(
          existsSync(path.join(tempDir, "project", ".gensx", "schema.json")),
        ).toBe(true);
      } catch (error) {
        console.error("Test failed with error:", error);
        console.info("Final frame content:", lastFrame());
        throw error;
      } finally {
        // Clean up
        unmount();
      }
    });

    it("handles files in subdirectories without rootDir specified", async () => {
      createTestFiles({});

      const { lastFrame, unmount } = render(
        React.createElement(StartUI, {
          file: path.join(tempDir, "project", "src", "workflow.ts"),
          options: {
            port: portCounter++,
          },
        }),
      );

      try {
        // Wait for the server to start and schema to be generated
        await waitForText(lastFrame, "GenSX Dev Server running at");

        // Add a small delay to ensure schema file is written
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Check that schema file was written
        expect(
          existsSync(path.join(tempDir, "project", ".gensx", "schema.json")),
        ).toBe(true);
      } catch (error) {
        console.error("Test failed with error:", error);
        console.info("Final frame content:", lastFrame());
        throw error;
      } finally {
        // Clean up
        unmount();
      }
    });

    it("handles files with rootDir specified in tsconfig", async () => {
      createTestFiles({ rootDir: "./src" });

      const { lastFrame, unmount } = render(
        React.createElement(StartUI, {
          file: path.join(tempDir, "project", "src", "workflow.ts"),
          options: {
            port: portCounter++,
          },
        }),
      );

      try {
        // Wait for the server to start and schema to be generated
        await waitForText(lastFrame, "GenSX Dev Server running at");

        // Add a small delay to ensure schema file is written
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Check that schema file was written
        expect(
          existsSync(path.join(tempDir, "project", ".gensx", "schema.json")),
        ).toBe(true);
      } catch (error) {
        console.error("Test failed with error:", error);
        console.info("Final frame content:", lastFrame());
        throw error;
      } finally {
        // Clean up
        unmount();
      }
    });
  });
});
