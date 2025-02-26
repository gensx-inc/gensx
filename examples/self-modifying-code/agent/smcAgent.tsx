import path from "path";

import { AnthropicProvider } from "@gensx/anthropic";
import { gsx } from "gensx";

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
import { TestConfig, TestReport, runTestsForModifiedFiles } from "./testing/testRunner.js";
import { ErrorCategory, ErrorDetails, createErrorHandler } from "./utils/errorHandler.js";

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
 * - [ x ] run final validation
 * - [  ] AnalyzeResults
 * - [  ] CommitResults
 */

interface ModifyCodeProps {
  plan: string;
}

const ModifyCode = gsx.Component<ModifyCodeProps, boolean>(
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
        "After making changes, use the 'build' tool to verify the changes compile successfully.",
      repoPath: scopedPath,
    });

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
    return result.success;
  },
);

interface RunTestsProps {
  success: boolean;
}

const RunTests = gsx.Component<RunTestsProps, TestReport | null>(
  "RunTests",
  async ({ success }) => {
    const workspace = useWorkspace();
    console.log("Running tests");
    
    // If the modification wasn't successful, no need to run tests
    if (!success) {
      await updateWorkspaceContext({
        history: [
          {
            timestamp: new Date(),
            action: "Test execution",
            result: "failure",
            details: "Skipped tests as modification was unsuccessful",
          },
        ],
      });
      return null;
    }
    
    const scopedPath = path.join(
      workspace.sourceDir,
      "examples",
      "self-modifying-code",
    );
    
    // Configure tests
    const testConfig: TestConfig = {
      testDir: scopedPath,
      testMatch: ['**/*.test.ts', '**/*.test.tsx'],
      timeout: 5000,
      maxConcurrency: 1,
      modifiedFilesOnly: true,
      excludePatterns: [],
    };
    
    try {
      // Run tests for modified files
      const modifiedFiles: string[] = []; // TODO: Get list of modified files
      const testReport = await runTestsForModifiedFiles(testConfig, modifiedFiles);
      
      // Record test results in history
      await updateWorkspaceContext({
        history: [
          {
            timestamp: new Date(),
            action: "Test execution",
            result: testReport.passed ? "success" : "failure",
            details: `Tests: ${testReport.passedCount} passed, ${testReport.failedCount} failed`,
          },
        ],
      });
      
      return testReport;
    } catch (error) {
      // Handle test execution errors
      const errorHandler = createErrorHandler();
      const errorDetails = errorHandler.captureError(error);
      
      await updateWorkspaceContext({
        history: [
          {
            timestamp: new Date(),
            action: "Test execution",
            result: "failure",
            details: `Error running tests: ${errorDetails.message}`,
          },
        ],
      });
      
      return null;
    }
  }
);

interface RunFinalValidationProps {
  success: boolean;
  testReport: TestReport | null;
}

const RunFinalValidation = gsx.Component<RunFinalValidationProps, boolean>(
  "RunFinalValidation",
  async ({ success, testReport }) => {
    const workspace = useWorkspace();
    console.log("Running final validation");
    console.log("Success:", success);
    
    // If the modification wasn't successful, no need to validate
    if (!success) {
      await updateWorkspaceContext({
        history: [
          {
            timestamp: new Date(),
            action: "Final validation",
            result: "failure",
            details: "Skipped validation as modification was unsuccessful",
          },
        ],
      });
      return false;
    }
    
    // If tests failed, mark validation as failed
    if (testReport && !testReport.passed) {
      await updateWorkspaceContext({
        history: [
          {
            timestamp: new Date(),
            action: "Final validation",
            result: "failure",
            details: `Validation failed: Tests failed (${testReport.failedCount} failures)`,
          },
        ],
      });
      return false;
    }

    // Run the build validation
    const { success: buildSuccess, output } = await validateBuild(workspace);
    console.log("Build success:", buildSuccess);
    
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

const CommitResults = gsx.Component<CommitResultsProps, boolean>(
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

export const SelfModifyingCodeAgent = gsx.Component<AgentProps, AgentResult>(
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
                    {(modifySuccess) => (
                      <RunTests success={modifySuccess}>
                        {(testReport) => (
                          <RunFinalValidation success={modifySuccess} testReport={testReport}>
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
                      </RunTests>
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