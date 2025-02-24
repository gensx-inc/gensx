import path from "path";

// Add type import for CodeAgent output
import type { CodeAgentOutput } from "./codeAgent.js";

import {
  ChatCompletion,
  GSXChatCompletion,
  GSXChatCompletionResult,
  OpenAIProvider,
} from "@gensx/openai";
import { gsx } from "gensx";
import { z } from "zod";

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
import { bashTool } from "./tools/bashTool.js";
import { FirecrawlProvider, viewWebpageTool } from "./tools/viewWebpage.js";

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

// Remove unused schema since we're defining inline now
interface GoalDecision {
  newGoal: boolean;
  goalState: string;
}

interface GenerateGoalStateProps {}

const GenerateGoalState = gsx.Component<GenerateGoalStateProps, GoalDecision>(
  "GenerateGoalState",
  async () => {
    const context = useWorkspaceContext();

    // First step: Decide if we need a new goal
    const needsNewGoal = await gsx.execute<{ needsNewGoal: boolean }>(
      <GSXChatCompletion
        messages={[
          {
            role: "system",
            content: `You are an AI agent that decides if the current goal has been achieved.

CURRENT GOAL STATE:
"${context.goalState}"

HISTORY OF ACTIONS:
${JSON.stringify(context.history, null, 2)}

Your task is to:
1. Review the current goal state
2. Analyze the history of actions to determine if the goal has been achieved
3. Decide if we need a new goal:
   - If the current goal has been achieved, set needsNewGoal = true
   - If the current goal has NOT been achieved, set needsNewGoal = false

Remember:
- Look for clear evidence in the history that the goal was completed
- If the history shows failed attempts or no progress, keep the current goal
- Only move to a new goal when the current one is definitively achieved`,
          },
          {
            role: "user",
            content:
              "Review the goal state and history, then make your decision.",
          },
        ]}
        model="gpt-4o"
        temperature={0.7}
        outputSchema={z.object({
          needsNewGoal: z.boolean().describe("Whether we need a new goal"),
        })}
      />,
    );

    // If we don't need a new goal, return the current one
    if (!needsNewGoal.needsNewGoal) {
      return {
        newGoal: false,
        goalState: context.goalState,
      };
    }

    // Second step: Generate new goal using tools to explore codebase
    const newGoalResult = await gsx.execute<GSXChatCompletionResult>(
      <GSXChatCompletion
        messages={[
          {
            role: "system",
            content: `You are an AI agent that generates new goals for improving a codebase.

CURRENT GOAL STATE (which has been achieved):
"${context.goalState}"

HISTORY OF ACTIONS:
${JSON.stringify(context.history, null, 2)}

Your task is to:
1. Explore the codebase to understand its current state
2. Generate a new goal that will improve the codebase
3. The goal should be specific, actionable, and focused on a single improvement

Remember:
- Goals should focus on improving code functionality and quality
- Start with simpler goals and progress to more complex ones
- Each goal should be achievable in a single iteration
- After initial simple goals like README changes, focus on code improvements`,
          },
          {
            role: "user",
            content: "Explore the codebase and propose a new goal.",
          },
        ]}
        model="gpt-4o"
        temperature={0.7}
        tools={[bashTool, viewWebpageTool]}
      />,
    );

    const newGoal =
      newGoalResult.choices[0]?.message?.content ?? context.goalState;

    // Update context with new goal
    await updateWorkspaceContext({
      goalState: newGoal,
    });

    return {
      newGoal: true,
      goalState: newGoal,
    };
  },
);

interface GeneratePlanProps {}

const GeneratePlan = gsx.Component<GeneratePlanProps, string>(
  "GeneratePlan",
  async () => {
    const context = useWorkspaceContext();

    // Get the plan from OpenAI
    const plan = await gsx.execute<string>(
      <ChatCompletion
        messages={[
          {
            role: "system",
            content: `You are an AI agent tasked with creating a plan to achieve a goal in a codebase.

CURRENT GOAL:
"${context.goalState}"

HISTORY OF ACTIONS:
${JSON.stringify(context.history, null, 2)}

You have access to bash commands to explore the codebase:
- List files and directories
- Read file contents
- Check file existence
- Analyze project structure

First, explore the codebase to understand what needs to be changed.
Then create a clear, descriptive plan that outlines:
1. What files need to be modified
2. What changes need to be made
3. How we'll validate the changes
4. What the expected outcome will be

Focus on WHAT needs to be done, not HOW to do it.
Be specific about files and changes, but don't include actual implementation details.

For example, if modifying a README:
"To add the raccoon story section to the README:
1. Locate the README.md file in the root directory
2. Add a new section titled 'A Raccoon's Tale' after the existing sections
3. Write a paragraph from the raccoon's perspective using 50% words and 50% emojis
4. Ensure the new section flows well with the existing content
5. Verify the markdown formatting is correct"

Use the bash tool to explore the codebase before creating your plan.`,
          },
          {
            role: "user",
            content:
              "Explore the codebase and create a plan to achieve the current goal.",
          },
        ]}
        model="gpt-4"
        temperature={0.7}
        tools={[bashTool, viewWebpageTool]}
      />,
    );

    // Add the plan to history
    await updateWorkspaceContext({
      history: [
        {
          timestamp: new Date(),
          action: "Generated execution plan",
          result: "success",
          details: plan,
        },
      ],
    });

    return plan;
  },
);

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