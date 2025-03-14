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
import { ErrorRecovery } from "./steps/errorRecovery.js";
import { GenerateGoalState } from "./steps/generateGoalState.js";
import { GeneratePlan } from "./steps/generatePlan.js";
import { TrackChanges } from "./steps/trackChanges.js";
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

interface HandleValidationErrorProps {
  error: {
    message: string;
    type: "validation";
    context?: string;
    attempt?: number;
  };
  modifiedFiles: string[];
}

const HandleValidationError = gensx.Component<HandleValidationErrorProps, { success: boolean; details: any }>(
  "HandleValidationError",
  async ({ error, modifiedFiles }) => {
    return (
      <ErrorRecovery error={error} operation="validation" maxRetries={3}>
        {(recoveryResult) => {
          if (!recoveryResult.shouldRetry) {
            // If we've exhausted retries, return with the failure
            return { 
              success: false, 
              details: {
                buildSuccess: false,
                testSuccess: false,
                codeQualitySuccess: false,
                buildOutput: error.message,
                testOutput: "",
                codeQualityReport: "",
                suggestions: recoveryResult.analysis.suggestedFixes,
              }
            };
          }
          
          // If we should retry, run validation again with the recovery information
          return (
            <ValidateChanges modifiedFiles={modifiedFiles}>
              {(validationResult) => {
                if (!validationResult.success && recoveryResult.shouldRetry) {
                  // If validation still fails and we have retries left, handle the error again
                  // with incremented attempt count
                  return (
                    <HandleValidationError 
                      error={{
                        ...error,
                        message: validationResult.details.buildOutput,
                        attempt: (error.attempt || 0) + 1
                      }}
                      modifiedFiles={modifiedFiles}
                    />
                  );
                }
                
                // Return the validation result
                return validationResult;
              }}
            </ValidateChanges>
          );
        }}
      </ErrorRecovery>
    );
  }
);

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
    
    if (!buildSuccess) {
      // If final validation fails, try error recovery
      return (
        <ErrorRecovery 
          error={{
            message: output,
            type: "build"
          }} 
          operation="final-validation" 
          maxRetries={2}
        >
          {(recoveryResult) => {
            // Log the final validation attempt with recovery information
            updateWorkspaceContext({
              history: [
                {
                  timestamp: new Date(),
                  action: "Final validation with recovery",
                  result: recoveryResult.success ? "success" : "failure",
                  details: recoveryResult.success 
                    ? "Build succeeded after recovery" 
                    : `Build failed: ${output}\nRecovery attempted: ${recoveryResult.adjustments.join(', ')}`,
                },
              ],
            });
            
            // If recovery was successful, we can consider the validation successful
            return recoveryResult.success;
          }}
        </ErrorRecovery>
      );
    }
    
    await updateWorkspaceContext({
      history: [
        {
          timestamp: new Date(),
          action: "Final validation",
          result: "success",
          details: "Build succeeded",
        },
      ],
    });

    return true;
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
    } catch (error) {
      // Handle commit errors with error recovery
      return (
        <ErrorRecovery 
          error={{
            message: String(error),
            type: "runtime"
          }} 
          operation="git-operations" 
          maxRetries={2}
        >
          {(recoveryResult) => {
            // Log the git operation attempt with recovery information
            updateWorkspaceContext({
              history: [
                {
                  timestamp: new Date(),
                  action: "Git operations with recovery",
                  result: recoveryResult.success ? "success" : "failure",
                  details: recoveryResult.success 
                    ? "Git operations succeeded after recovery" 
                    : `Git operations failed: ${error}\nRecovery attempted: ${recoveryResult.adjustments.join(', ')}`,
                },
              ],
            });
            
            // Return false if git operations ultimately failed
            return recoveryResult.success;
          }}
        </ErrorRecovery>
      );
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
            {(goalState) => (
              <GeneratePlan>
                {(plan) => (
                  <TrackChanges 
                    files={[]} 
                    description="Implementing code changes based on plan"
                    initiatedBy="agent"
                    reason={`Plan: ${plan.substring(0, 100)}...`}
                    includeSnapshots={true}
                  >
                    {(trackResult) => (
                      <ModifyCode plan={plan}>
                        {({ success: modifySuccess, modifiedFiles }) => {
                          // Save versions of all modified files
                          Promise.all(
                            modifiedFiles.map(async (file) => {
                              if (workspace.saveFileVersion) {
                                try {
                                  await workspace.saveFileVersion(
                                    file, 
                                    `Changes made by agent based on plan: ${plan.substring(0, 50)}...`
                                  );
                                } catch (error) {
                                  console.error(`Failed to save version for ${file}:`, error);
                                }
                              }
                            })
                          ).catch(error => {
                            console.error("Error saving file versions:", error);
                          });
                          
                          if (!modifySuccess) {
                            // If code modification fails, attempt error recovery
                            return (
                              <ErrorRecovery 
                                error={{
                                  message: "Code modification failed",
                                  type: "build"
                                }} 
                                operation="code-modification" 
                                maxRetries={2}
                              >
                                {(recoveryResult) => (
                                  <CommitResults success={false}>
                                    {(committed) => ({
                                      success: committed,
                                      modified: false,
                                      error: "Code modification failed: " + recoveryResult.analysis.rootCause
                                    })}
                                  </CommitResults>
                                )}
                              </ErrorRecovery>
                            );
                          }
                          
                          return (
                            <ValidateChanges modifiedFiles={modifiedFiles}>
                              {(validationResult) => {
                                // If validation fails, handle the error with recovery
                                if (!validationResult.success) {
                                  return (
                                    <HandleValidationError 
                                      error={{
                                        message: validationResult.details.buildOutput || "Validation failed",
                                        type: "validation"
                                      }}
                                      modifiedFiles={modifiedFiles}
                                    >
                                      {(recoveredValidation) => (
                                        <RunFinalValidation validationResult={recoveredValidation}>
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
                                    </HandleValidationError>
                                  );
                                }
                                
                                // Normal flow if validation succeeds
                                return (
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
                                );
                              }}
                            </ValidateChanges>
                          );
                        }}
                      </ModifyCode>
                    )}
                  </TrackChanges>
                )}
              </GeneratePlan>
            )}
          </GenerateGoalState>
        </WorkspaceProvider>
      </AnthropicProvider>
    );
  }
);