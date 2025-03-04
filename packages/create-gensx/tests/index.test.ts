import { exec as execCallback } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

import { afterEach, expect, it, suite } from "vitest";

import { createGensxProject } from "../src/index.js";

const exec = promisify(execCallback);

// Get the absolute path to the gensx package
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gensxPackagePath = path.resolve(__dirname, "../../gensx-core");
const gensxOpenaiPackagePath = path.resolve(__dirname, "../../gensx-openai");
suite("create-gensx", () => {
  let tempDir: string;

  afterEach(async () => {
    // Clean up the temporary directory after each test
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
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
    const { stdout: runOutput } = await exec("npm start", {
      cwd: projectPath,
    });

    // Verify the output contains our welcome message
    expect(runOutput).toContain("Hello, World!");
  }, 60000); // Increase timeout to 60s since npm install can be slow
});
