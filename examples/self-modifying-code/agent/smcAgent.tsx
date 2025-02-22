import path from "path";

// Add type import for CodeAgent output
import type { CodeAgentOutput } from "./codeAgent.js";

import {
  ChatCompletion,
  GSXChatCompletion,
  OpenAIProvider,
} from "@gensx/openai";
import { gsx } from "gensx";
import { z } from "zod";

import { Lease } from "../lease.js";
import {
  readContext,
  updateContext,
  validateBuild,
  Workspace,
} from "../workspace.js";
import { CodeAgent } from "./codeAgent.js";
import { bashTool } from "./tools/bashTool.js";

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
 * - [  ] run final validation
 * - [  ] AnalyzeResults
 * - [  ] CommitResults
 */

// Schema for goal state decision
const goalDecisionSchema = z.object({
  newGoal: z.boolean().describe("Whether to set a new goal"),
  goalState: z.string().describe("The new goal state if newGoal is true"),
});

type GoalDecision = z.infer<typeof goalDecisionSchema>;

interface GenerateGoalStateProps {
  workspace: Workspace;
}

const GenerateGoalState = gsx.Component<GenerateGoalStateProps, GoalDecision>(
  "GenerateGoalState",
  async ({ workspace }) => {
    const context = readContext(workspace);

    // Get the goal decision from OpenAI
    const decision = await gsx.execute<GoalDecision>(
      <GSXChatCompletion
        messages={[
          {
            role: "system",
            content: `You are an AI agent that decides on goals for improving a codebase.

CURRENT GOAL STATE:
"${context.goalState}"

HISTORY OF ACTIONS:
${JSON.stringify(context.history, null, 2)}

Your task is to:
1. Review the current goal state
2. Analyze the history of actions to determine if the goal has been achieved
3. Make a decision:
   - If the current goal has been achieved:
     * Set newGoal = true
     * Provide a new goalState for a different improvement to work on
   - If the current goal has NOT been achieved:
     * Set newGoal = false
     * Keep the current goalState

Remember:
- Look for clear evidence in the history that the goal was completed
- If the history shows failed attempts or no progress, keep the current goal
- Only move to a new goal when the current one is definitively achieved
- New goals should be specific, actionable, and focused on a single improvement`,
          },
          {
            role: "user",
            content:
              "Review the goal state and history, then make your decision.",
          },
        ]}
        model="gpt-4o"
        temperature={0.7}
        outputSchema={goalDecisionSchema}
      />,
    );

    // If we have a new goal, update the context
    if (decision.newGoal) {
      await updateContext(workspace, {
        goalState: decision.goalState,
      });
    }

    return decision;
  },
);

interface GeneratePlanProps {
  workspace: Workspace;
}

const GeneratePlan = gsx.Component<GeneratePlanProps, string>(
  "GeneratePlan",
  async ({ workspace }) => {
    const context = readContext(workspace);

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
        tools={[bashTool]}
      />,
    );

    // Add the plan to history
    await updateContext(workspace, {
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
  workspace: Workspace;
}

const ModifyCode = gsx.Component<ModifyCodeProps, boolean>(
  "ModifyCode",
  async ({ plan, workspace }) => {
    const context = readContext(workspace);
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
        workspace={workspace}
      />,
    );

    // Add the modification attempt to history
    await updateContext(workspace, {
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
  workspace: Workspace;
}

const RunFinalValidation = gsx.Component<RunFinalValidationProps, boolean>(
  "RunFinalValidation",
  async ({ success, workspace }) => {
    console.log("Running final validation");
    console.log("Success:", success);
    // If the modification wasn't successful, no need to validate
    if (!success) {
      await updateContext(workspace, {
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
    console.log("Build output:", output);
    await updateContext(workspace, {
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

export const SelfModifyingCodeAgent = gsx.Component<AgentProps, AgentResult>(
  "SelfModifyingCodeAgent",
  ({ workspace, lease: _lease }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <GenerateGoalState workspace={workspace}>
          {() => (
            <GeneratePlan workspace={workspace}>
              {(plan) => (
                <ModifyCode plan={plan} workspace={workspace}>
                  {(modifySuccess) => (
                    <RunFinalValidation
                      success={modifySuccess}
                      workspace={workspace}
                    >
                      {(validated) => ({
                        success: validated,
                        modified: true,
                      })}
                    </RunFinalValidation>
                  )}
                </ModifyCode>
              )}
            </GeneratePlan>
          )}
        </GenerateGoalState>
      </OpenAIProvider>
    );
  },
);
