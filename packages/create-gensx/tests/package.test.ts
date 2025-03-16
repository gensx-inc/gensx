import { exec as execCallback } from "child_process";
import os from "os";
import path from "path";
import { promisify } from "util";

import fs from "fs-extra";
import { afterEach, beforeEach, expect, it } from "vitest";
import yaml from "yaml";

const exec = promisify(execCallback);

let tempDir: string;

beforeEach(async () => {
  // Create a temporary directory for testing
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gensx-pkg-test-"));
});

afterEach(async () => {
  // Clean up
  await fs.remove(tempDir);
});

// This tests mimics the behavior of npm create by copying the built package to a temp directory and calling the cli command there.
it("package.json is correctly configured for npm create", async () => {
  // Copy the built package to temp directory
  const pkgDir = path.join(tempDir, "create-gensx");
  await fs.copy(path.resolve(__dirname, "../dist"), path.join(pkgDir, "dist"));
  await fs.copy(
    path.resolve(__dirname, "../package.json"),
    path.join(pkgDir, "package.json"),
  );
  await fs.chmod(path.join(pkgDir, "dist/cli.js"), 0o755);

  // Fix the "catalog:" dependencies and devDependencies, swapping in the versions from the pnpm-workspace.yaml
  const pkgJson = (await fs.readJson(path.join(pkgDir, "package.json"))) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  const pnpmWorkspaceYaml = await fs.readFile(
    path.join(__dirname, "../../../pnpm-workspace.yaml"),
    "utf-8",
  );
  const pnpmWorkspace = yaml.parse(pnpmWorkspaceYaml) as {
    catalog: Record<string, string>;
    catalogs: Record<string, Record<string, string>>;
  };
  pkgJson.dependencies = Object.fromEntries(
    Object.entries(pkgJson.dependencies).map(([key, value]) => {
      if (value === "catalog:") {
        return [key, pnpmWorkspace.catalog[key]] as const;
      }
      if (value.startsWith("catalog:")) {
        const catalogName = value.split(":")[1];
        return [key, pnpmWorkspace.catalogs[catalogName][key]] as const;
      }
      if (value.startsWith("workspace:")) {
        const packageName = key.includes("@")
          ? `gensx-${key.split("/")[0]}`
          : key;
        return [
          key,
          `file:${path.join(__dirname, "../../", packageName)}`,
        ] as const;
      }
      return [key, value] as const;
    }),
  );
  pkgJson.devDependencies = Object.fromEntries(
    Object.entries(pkgJson.devDependencies).map(([key, value]) => {
      if (value === "catalog:") {
        return [key, pnpmWorkspace.catalog[key]] as const;
      }
      if (value.startsWith("catalog:")) {
        const catalogName = value.split(":")[1];
        return [key, pnpmWorkspace.catalogs[catalogName][key]] as const;
      }
      if (value.startsWith("workspace:")) {
        const packageName = key.replace("@", "").replace("/", "-");
        return [
          key,
          `file:${path.join(__dirname, "../../", packageName)}`,
        ] as const;
      }
      return [key, value] as const;
    }),
  );

  await fs.writeJson(path.join(pkgDir, "package.json"), pkgJson, {
    spaces: 2,
  });

  // Install dependencies in the package directory
  await exec("npm install", {
    cwd: pkgDir,
  });

  // Create a test project directory
  const testProjectDir = path.join(tempDir, "test-project");

  try {
    // Try to execute the package bin directly with all AI assistant integrations
    await exec(
      `${path.join(pkgDir, "dist/cli.js")} "${testProjectDir}" -s --ai-assistants claude,cursor,cline,windsurf`,
      {
        cwd: pkgDir,
        env: { ...process.env },
      },
    );

    // Verify the project was created
    const exists = await fs.pathExists(testProjectDir);
    expect(exists).toBe(true);

    // Verify package.json exists in created project
    const projectPkgExists = await fs.pathExists(
      path.join(testProjectDir, "package.json"),
    );
    expect(projectPkgExists).toBe(true);
  } catch (error) {
    // If execution fails, check the package.json configuration
    const pkgJson = (await fs.readJson(path.join(pkgDir, "package.json"))) as {
      bin: string;
      files: string[];
      type: string;
    };

    // Verify essential fields
    expect(pkgJson.bin).toBeDefined();
    expect(pkgJson.files).toContain("dist");
    expect(pkgJson.type).toBe("module");

    // Re-throw the error if package.json looks correct
    throw error;
  }
}, 60000);
