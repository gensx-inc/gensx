import path from "path";

// Add type import for CodeAgent output
import type { CodeAgentOutput } from "./codeAgent.js";

import { OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";

import { Lease } from "../lease.js";
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
import { GenerateGoalState } from "./generateGoalState.js";
import { GeneratePlan } from "./steps/generatePlan.js";
import { FirecrawlProvider } from "./tools/scrapeWebpage.js";

export interface AgentProps {
  workspace: Workspace;
  lease: Lease;
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
    const result = await gsx.execute<CodeAgentOutput>(
      <CodeAgent
        task={`Implement the following changes to the codebase:

${plan}

Current goal state from context:
${context.goalState}

After making changes, the code should successfully build with 'pnpm build'.`}
        additionalInstructions="After making changes, use the 'build' tool to verify the changes compile successfully."
        repoPath={scopedPath}
      />,
    );

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

interface RunFinalValidationProps {
  success: boolean;
}

const RunFinalValidation = gsx.Component<RunFinalValidationProps, boolean>(
  "RunFinalValidation",
  async ({ success }) => {
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
      <FirecrawlProvider apiKey={process.env.FIRECRAWL_API_KEY}>
        <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
          <WorkspaceProvider workspace={workspace}>
            <GenerateGoalState>
              {() => (
                <GeneratePlan>
                  {(plan) => (
                    <ModifyCode plan={plan}>
                      {(modifySuccess) => (
                        <RunFinalValidation success={modifySuccess}>
                          {(validated) => (
                            <CommitResults success={validated}>
                              {(committed) => ({
                                success: validated && committed,
                                modified: true,
                              })}
                            </CommitResults>
                          )}
                        </RunFinalValidation>
                      )}
                    </ModifyCode>
                  )}
                </GeneratePlan>
              )}
            </GenerateGoalState>
          </WorkspaceProvider>
        </OpenAIProvider>
      </FirecrawlProvider>
    );
  },
);
