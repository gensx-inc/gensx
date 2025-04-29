import { exec as execCallback } from "child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

import { afterEach, expect, it, suite, vi } from "vitest";

import { createGensxProject } from "../src/index.js";

const exec = promisify(execCallback);

// Get the absolute path to the gensx package
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gensxPackagePath = path.resolve(__dirname, "../../gensx-core");
const gensxOpenaiPackagePath = path.resolve(__dirname, "../../gensx-openai");
const gensxClaudeMdPath = path.resolve(__dirname, "../../gensx-claude-md");
const gensxCursorRulesPath = path.resolve(
  __dirname,
  "../../gensx-cursor-rules",
);
// Other AI assistant packages are available but not used in tests
suite("create-gensx", () => {
  let tempDir: string;

  afterEach(async () => {
    // Clean up the temporary directory after each test
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }

    // Reset all mocks
    vi.restoreAllMocks();
  });

  it("creates a working TypeScript project", async () => {
    // Create a temporary directory for our test
    tempDir = await mkdtemp(path.join(os.tmpdir(), "gensx-test-"));
    const projectName = "test-project";
    const projectPath = path.join(tempDir, projectName);

    // Create the project using the TypeScript template
    await createGensxProject(projectPath, {
      template: "ts",
      force: false,
      skipLogin: true,
      skipIdeRules: true, // Skip IDE rules selection in tests
      description: "A test TypeScript project", // Add description to skip the prompt
    });

    // Update package.json to use local version of @gensx/core and @gensx/openai
    const packageJsonPath = path.join(projectPath, "package.json");
    const packageJson: {
      dependencies: Record<string, string>;
      [key: string]: unknown;
    } = JSON.parse(await readFile(packageJsonPath, "utf-8")) as {
      dependencies: Record<string, string>;
      [key: string]: unknown;
    };
    packageJson.dependencies["@gensx/core"] = `file:${gensxPackagePath}`;
    packageJson.dependencies["@gensx/openai"] =
      `file:${gensxOpenaiPackagePath}`;

    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Verify the project was created
    const { stdout: lsOutput } = await exec("ls", { cwd: projectPath });
    expect(lsOutput).toContain("package.json");
    expect(lsOutput).toContain("tsconfig.json");
    expect(lsOutput).toContain("src");

    // Install dependencies
    await exec("npm install", { cwd: projectPath });

    try {
      // Build the project
      const { stderr: buildOutput } = await exec("npm run build", {
        cwd: projectPath,
      });
      expect(buildOutput).not.toContain("error");
    } catch (e) {
      console.error(e);
      throw e;
    }

    // Run the project and capture its output
    const { stdout: runOutput } = await exec("npm run dev", {
      cwd: projectPath,
    });

    // Verify the output contains our welcome message
    expect(runOutput).toContain("Hello, World!");
  }, 60000); // Increase timeout to 60s since npm install can be slow

  it("creates a project with AI assistant integrations", async () => {
    // Create a temporary directory for our test
    tempDir = await mkdtemp(path.join(os.tmpdir(), "gensx-ai-test-"));
    const projectName = "ai-test-project";
    const projectPath = path.join(tempDir, projectName);

    const options = {
      template: "ts",
      force: false,
      skipLogin: true,
      skipIdeRules: true,
      description: "A test project with AI assistant integrations", // Add description to skip the prompt
    };

    // Create the project with AI assistant integrations
    await createGensxProject(projectPath, options);

    // Update package.json to use local versions
    const packageJsonPath = path.join(projectPath, "package.json");
    const packageJson: {
      dependencies: Record<string, string>;
      [key: string]: unknown;
    } = JSON.parse(await readFile(packageJsonPath, "utf-8")) as {
      dependencies: Record<string, string>;
      [key: string]: unknown;
    };

    packageJson.dependencies["@gensx/core"] = `file:${gensxPackagePath}`;
    packageJson.dependencies["@gensx/openai"] =
      `file:${gensxOpenaiPackagePath}`;

    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Install dependencies
    await exec("npm install", { cwd: projectPath });

    // Manually run the AI rules commands to simulate the npx behavior in tests
    await exec(`node ${gensxClaudeMdPath}/dist/cli.js`, { cwd: projectPath });
    await exec(`node ${gensxCursorRulesPath}/dist/cli.js`, {
      cwd: projectPath,
    });
    await exec(
      `node ${path.resolve(__dirname, "../../gensx-cline-rules/dist/cli.js")}`,
      { cwd: projectPath },
    );
    await exec(
      `node ${path.resolve(__dirname, "../../gensx-windsurf-rules/dist/cli.js")}`,
      { cwd: projectPath },
    );

    // Verify the project files were created
    const files = await readdir(projectPath);
    expect(files).toContain("package.json");
    expect(files).toContain("tsconfig.json");
    expect(files).toContain("src");

    // Verify all AI assistant integration package files are created
    expect(files).toContain("CLAUDE.md"); // For claude integration
    expect(files).toContain(".cursor"); // For cursor integration
    expect(files).toContain(".clinerules"); // For cline integration
    expect(files).toContain(".windsurfrules"); // For windsurf integration

    // We no longer check for devDependencies since we're using npx directly
    // Instead, verify the files were created by the CLI scripts

    // Check for AI assistant-specific files
    try {
      // Check for Claude integration files
      const claudeMdContent = await readFile(
        path.join(projectPath, "CLAUDE.md"),
        "utf-8",
      );
      expect(claudeMdContent).toContain("GenSX Project Claude Memory");

      // Check for Cursor integration files
      const cursorFiles = await readdir(path.join(projectPath, ".cursor"));
      expect(cursorFiles.length).toBeGreaterThan(0);
    } catch (error) {
      // If files don't exist, fail the test
      console.error("AI assistant files not found:", error);
      expect(false).toBe(true);
    }

    // Build the project to ensure it works with AI assistant integrations
    const { stderr: buildOutput } = await exec("npm run build", {
      cwd: projectPath,
    });
    expect(buildOutput).not.toContain("error");
  }, 60000); // Increase timeout to 60s since npm install can be slow
});
