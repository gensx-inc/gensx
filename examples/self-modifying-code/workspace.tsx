import { spawn } from "child_process";
import fs from "fs";
import fsPromises from "fs/promises";
import os from "os";
import path from "path";

import { gsx } from "@gensx/core";

const context = gsx.createContext<Workspace | undefined>(undefined);

export const WorkspaceProvider = gsx.Component<{ workspace: Workspace }, never>(
  "WorkspaceProvider",
  ({ workspace }) => {
    return <context.Provider value={workspace} />;
  },
);

export const useWorkspace = () => {
  const workspace = gsx.useContext(context);
  if (!workspace) {
    throw new Error("Workspace not found");
  }
  return workspace;
};

export const useWorkspaceContext = () => {
  const workspace = gsx.useContext(context);
  if (!workspace) {
    throw new Error("Workspace not found");
  }
  return readContext(workspace);
};

export const updateWorkspaceContext = (update: Partial<AgentContext>) => {
  const workspace = gsx.useContext(context);
  if (!workspace) {
    throw new Error("Workspace not found");
  }
  return updateContext(workspace, update);
};

export interface WorkspaceConfig {
  repoUrl: string;
  branch: string;
}

export interface AgentContext {
  goalState: string;
  history: {
    timestamp: Date;
    action: string;
    result: "success" | "failure";
    details: string;
  }[];
}

export interface Workspace {
  rootDir: string;
  sourceDir: string;
  contextFile: string; // Path to agent_context.json in the repo
  config: WorkspaceConfig;
}

export interface BuildValidationResult {
  success: boolean;
  output: string;
}

function serializeContext(context: AgentContext): string {
  return JSON.stringify(
    context,
    (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    },
    2,
  );
}

function deserializeContext(json: string): AgentContext {
  return JSON.parse(json, (key, value) => {
    if (key === "timestamp" && typeof value === "string") {
      return new Date(value);
    }
    return value;
  });
}

export async function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: "inherit" });
    proc.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed: ${cmd} ${args.join(" ")}`));
      }
    });
  });
}

export async function setupWorkspace(
  config: WorkspaceConfig,
): Promise<Workspace> {
  // Create temp directory
  const rootDir = await fsPromises.mkdtemp(
    path.join(os.tmpdir(), "self-modifying-code-"),
  );
  const sourceDir = path.join(rootDir, "repo");

  try {
    // Clone repository
    await runCommand("git", ["clone", config.repoUrl, sourceDir], rootDir);

    // Setup git config
    await runCommand("git", ["checkout", config.branch], sourceDir);

    // Install dependencies
    await runCommand("pnpm", ["install"], sourceDir);

    // Build the workspace
    await runCommand("pnpm", ["build"], sourceDir);

    return {
      rootDir,
      sourceDir,
      contextFile: path.join(
        sourceDir,
        "examples",
        "self-modifying-code",
        "agent_context.json",
      ),
      config,
    };
  } catch (error) {
    // Cleanup on failure
    await fsPromises.rm(rootDir, { recursive: true, force: true });
    throw error;
  }
}

export async function cleanupWorkspace(workspace: Workspace): Promise<void> {
  console.log("Cleaning up workspace", workspace.rootDir);
  await fsPromises.rm(workspace.rootDir, { recursive: true, force: true });
}

function readContext(workspace: Workspace): AgentContext {
  try {
    const content = fs.readFileSync(workspace.contextFile, "utf-8");
    return deserializeContext(content);
  } catch (e) {
    if ((e as { code?: string }).code === "ENOENT") {
      // Create default context if file doesn't exist
      const defaultContext: AgentContext = {
        goalState: "Improve code quality and efficiency",
        history: [],
      };
      // Write synchronously
      fs.writeFileSync(workspace.contextFile, serializeContext(defaultContext));
      return defaultContext;
    }
    throw e;
  }
}

async function writeContext(
  workspace: Workspace,
  context: AgentContext,
): Promise<void> {
  await fsPromises.writeFile(workspace.contextFile, serializeContext(context));
}

async function updateContext(
  workspace: Workspace,
  update: Partial<AgentContext>,
): Promise<AgentContext> {
  const current = readContext(workspace);

  const updated: AgentContext = {
    ...current,
    ...update,
    history: update.history
      ? [...current.history, ...update.history]
      : current.history,
  };

  await writeContext(workspace, updated);
  return updated;
}

export async function commitAndPush(
  workspace: Workspace,
  message: string,
): Promise<void> {
  const { sourceDir } = workspace;

  await runCommand("git", ["add", "."], sourceDir);
  await runCommand("git", ["commit", "-m", message], sourceDir);
  await runCommand(
    "git",
    ["push", "origin", workspace.config.branch],
    sourceDir,
  );
}

export async function buildWorkspace(workspace: Workspace): Promise<string> {
  try {
    // Run pnpm build and capture output
    const proc = spawn("pnpm", ["build"], {
      cwd: workspace.sourceDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let error = "";

    // Collect stdout
    proc.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    // Collect stderr
    proc.stderr.on("data", (data: Buffer) => {
      error += data.toString();
    });

    // Wait for process to complete
    const exitCode = await new Promise<number>((resolve) => {
      proc.on("exit", resolve);
    });

    if (exitCode === 0) {
      return output;
    } else {
      return error || "Build failed with no error output";
    }
  } catch (e) {
    return String(e);
  }
}

export async function validateBuild(
  workspace: Workspace,
): Promise<BuildValidationResult> {
  try {
    // Scope to examples/self-modifying-code
    const scopedPath = path.join(
      workspace.sourceDir,
      "examples",
      "self-modifying-code",
    );

    // Run pnpm build and capture output
    const proc = spawn("pnpm", ["build"], {
      cwd: scopedPath,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let procOutput = "";
    let error = "";

    // Collect stdout
    proc.stdout.on("data", (data: Buffer) => {
      procOutput += data.toString();
    });

    // Collect stderr
    proc.stderr.on("data", (data: Buffer) => {
      error += data.toString();
    });

    // Wait for process to complete and get exit code
    const exitCode = await new Promise<number>((resolve) => {
      proc.on("exit", resolve);
    });

    console.info("Build exit code", exitCode);
    console.info("Build output", procOutput);
    console.info("Build error", error);

    let output = procOutput.trim();
    if (exitCode !== 0) {
      output += `\n${error.trim()}`;
    }
    if (!output) {
      output = "Build failed with no error output";
    }

    return {
      success: exitCode === 0,
      output,
    };
  } catch (e) {
    return {
      success: false,
      output: String(e),
    };
  }
}
