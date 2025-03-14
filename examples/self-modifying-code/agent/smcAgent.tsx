import path from "path";
import { spawn } from "child_process";

import { AnthropicProvider } from "@gensx/anthropic";
import * as gensx from "@gensx/core";

import {
  runCommand,
  updateWorkspaceContext,
  useWorkspace,
  useWorkspaceContext,
  validateBuild,
  Workspace,
  WorkspaceProvider,
} from "../workspace.js";
import { CodeAgent } from "./codeAgent.js";
import { GenerateGoalState } from "./steps/generateGoalState.js";
import { GeneratePlan } from "./steps/generatePlan.js";
import { ValidateChanges } from "./steps/validateChanges.js";

export interface AgentProps {
  workspace: Workspace;
}

export interface AgentResult {
  success: boolean;
  modified: boolean; // Whether the agent made changes to the workspace
  error?: string;
}

/**
 * The agent receives a workspace and can:
 * - read context
 * - make code changes in the workspace
 * - validate changes
 * - commit and push changes
 * - record history
 *
 * The agent does NOT create new workspaces - that's handled by the outer control loop.
 */

/**
 * - [ x ] update goal state
 * - [ x ] write goal state to filesystem
 * - [ x ] create implementation plan
 * - [ x ] run code modifying agent
 * - [ x ] run comprehensive validation
 * - [ x ] run final validation
 * - [  ] AnalyzeResults
 * - [  ] CommitResults
 */

interface ModifyCodeProps {
  plan: string;
}

const ModifyCode = gensx.Component<ModifyCodeProps, { success: boolean; modifiedFiles: string[] }>(
  "ModifyCode",
  async ({ plan }) => {
    const workspace = useWorkspace();
    const context = useWorkspaceContext();
    const scopedPath = path.join(
      workspace.sourceDir,
      "examples",
      "self-modifying-code",
    );

    // Run the code agent with our plan
    const result = await CodeAgent.run({
      task: `Implement the following changes to the codebase:

${plan}

Current goal state from context:
${context.goalState}

After making changes, the code should successfully build with 'pnpm build'.`,
      additionalInstructions:
        "After making changes, use the 'build' tool to verify the changes compile successfully. Use the 'test' tool to verify your changes work correctly.",
      repoPath: scopedPath,
    });

    // Get a list of modified files
    // This is a simple implementation - in a real system, we'd track file changes more precisely
    const { stdout: gitStatus } = await captureCommand(
      "git",
      ["status", "--porcelain"],
      scopedPath
    );
    
    // Extract modified file paths from git status output
    const modifiedFiles = gitStatus
      .split('\n')
      .filter(line => line.match(/^\s*[AM]/)) // Modified or Added files
      .map(line => line.replace(/^\s*[AM]\s+/, '')) // Extract just the file path
      .filter(Boolean);

    // Add the modification attempt to history
    await updateWorkspaceContext({
      history: [
        {
          timestamp: new Date(),
          action: "Attempted code modifications",
          result: result.success ? "success" : "failure",
          details: result.summary,
        },
      ],
    });

    // Return whether modifications were successful
    return { 
      success: result.success,
      modifiedFiles
    };
  },
);

// Helper function to capture command output
async function captureCommand(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    // Collect stdout
    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    // Collect stderr
    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    // Wait for process to complete
    proc.on("exit", (exitCode: number | null) => {
      resolve({
        exitCode: exitCode || 0,
        stdout,
        stderr,
      });
    });
  });
}

interface RunFinalValidationProps {
  validationResult: { success: boolean; details: any };
}

const RunFinalValidation = gensx.Component<RunFinalValidationProps, boolean>(
  "RunFinalValidation",
  async ({ validationResult }) => {
    const workspace = useWorkspace();
    console.log("Running final validation");
    console.log("Validation result:", validationResult);
    
    // If the comprehensive validation wasn't successful, no need to validate again
    if (!validationResult.success) {
      await updateWorkspaceContext({
        history: [
          {
            timestamp: new Date(),
            action: "Final validation",
            result: "failure",
            details: "Skipped validation as comprehensive validation was unsuccessful",
          },
        ],
      });
      return false;
    }

    // Run the build validation one more time to be sure
    const { success: buildSuccess, output } = await validateBuild(workspace);
    console.log("Final build success:", buildSuccess);
    await updateWorkspaceContext({
      history: [
        {
          timestamp: new Date(),
          action: "Final validation",
          result: buildSuccess ? "success" : "failure",
          details: buildSuccess ? "Build succeeded" : `Build failed: ${output}`,
        },
      ],
    });

    return buildSuccess;
  },
);

interface CommitResultsProps {
  success: boolean;
}

const CommitResults = gensx.Component<CommitResultsProps, boolean>(
  "CommitResults",
  async ({ success }) => {
    const workspace = useWorkspace();
    const scopedPath = path.join(
      workspace.sourceDir,
      "examples",
      "self-modifying-code",
    );

    try {
      // Always run git commands from the scoped directory
      process.chdir(scopedPath);

      if (success) {
        // Stage all changes in the directory
        await runCommand("git", ["add", "."], scopedPath);
        await runCommand(
          "git",
          ["commit", "-m", "agent: successful code update"],
          scopedPath,
        );
      } else {
        // Only stage the context file
        await runCommand("git", ["add", "agent_context.json"], scopedPath);
        await runCommand(
          "git",
          ["commit", "-m", "agent: failed attempt - updating context only"],
          scopedPath,
        );
      }

      // Push in both cases
      await runCommand(
        "git",
        ["push", "origin", workspace.config.branch],
        scopedPath,
      );
      return true;
    } catch (_error) {
      // If git operations fail, return false and let outer control loop handle it
      return false;
    }
  },
);

export const SelfModifyingCodeAgent = gensx.Component<AgentProps, AgentResult>(
  "SelfModifyingCodeAgent",
  ({ workspace }) => {
    return (
      <AnthropicProvider apiKey={process.env.ANTHROPIC_API_KEY}>
        <WorkspaceProvider workspace={workspace}>
          <GenerateGoalState>
            {() => (
              <GeneratePlan>
                {(plan) => (
                  <ModifyCode plan={plan}>
                    {({ success: modifySuccess, modifiedFiles }) => (
                      <ValidateChanges modifiedFiles={modifiedFiles}>
                        {(validationResult) => (
                          <RunFinalValidation validationResult={validationResult}>
                            {(validated) => (
                              <CommitResults success={validated}>
                                {(committed) => ({
                                  success: committed,
                                  modified: true,
                                })}
                              </CommitResults>
                            )}
                          </RunFinalValidation>
                        )}
                      </ValidateChanges>
                    )}
                  </ModifyCode>
                )}
              </GeneratePlan>
            )}
          </GenerateGoalState>
        </WorkspaceProvider>
      </AnthropicProvider>
    );
  },
);