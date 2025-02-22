import { GSXChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";
import { z } from "zod";

import { Lease } from "../lease.js";
import {
  AgentContext,
  readContext,
  updateContext,
  Workspace,
} from "../workspace.js";
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
 * - [  ] create implementation plan
 * - [  ] run code modifying agent
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
  context: AgentContext;
  workspace: Workspace;
}

const GenerateGoalState = gsx.Component<GenerateGoalStateProps, GoalDecision>(
  "GenerateGoalState",
  async ({ context, workspace }) => {
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

// Schema for the execution plan
const planSchema = z.object({
  steps: z.array(
    z.object({
      action: z.string().describe("The specific action to take"),
      tool: z
        .string()
        .describe("The tool to use (e.g., 'bash' for file operations)"),
      args: z.string().describe("The arguments or command to pass to the tool"),
      purpose: z.string().describe("Why this step is necessary"),
    }),
  ),
  expectedOutcome: z
    .string()
    .describe("What we expect to achieve with this plan"),
});

type ExecutionPlan = z.infer<typeof planSchema>;

interface GeneratePlanProps {
  context: AgentContext;
  workspace: Workspace;
}

const GeneratePlan = gsx.Component<GeneratePlanProps, ExecutionPlan>(
  "GeneratePlan",
  async ({ context, workspace }) => {
    // Get the plan from OpenAI
    const plan = await gsx.execute<ExecutionPlan>(
      <GSXChatCompletion
        messages={[
          {
            role: "system",
            content: `You are an AI agent tasked with creating an execution plan to achieve a goal in a codebase.

CURRENT GOAL:
"${context.goalState}"

HISTORY OF ACTIONS:
${JSON.stringify(context.history, null, 2)}

You have access to the following tools:
1. bash - Run shell commands to:
   - Read file contents
   - List directories
   - Check file existence
   - Analyze project structure

Create a detailed plan with specific steps to achieve the goal.
Each step should include:
- The exact action to take
- Which tool to use
- The specific arguments/commands
- Why this step is necessary

For example, to modify a README:
1. First locate the README:
   {
     action: "Find README location",
     tool: "bash",
     args: "find . -name README.md",
     purpose: "Locate the README file in the project"
   }
2. Then read its contents:
   {
     action: "Read current README",
     tool: "bash",
     args: "cat ./README.md",
     purpose: "Understand current content before modification"
   }

Make the plan as specific and actionable as possible.`,
          },
          {
            role: "user",
            content: "Analyze the goal and create a detailed execution plan.",
          },
        ]}
        model="gpt-4o"
        temperature={0.7}
        outputSchema={planSchema}
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
          details: JSON.stringify(plan, null, 2),
        },
      ],
    });

    return plan;
  },
);

export const SelfModifyingCodeAgent = gsx.Component<AgentProps, AgentResult>(
  "SelfModifyingCodeAgent",
  ({ workspace, lease: _lease }) => {
    // Always read fresh context
    const initialContext = readContext(workspace);

    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <GenerateGoalState context={initialContext} workspace={workspace}>
          {(goalDecision) => {
            // Read context again after goal state might have changed
            const contextAfterGoal = readContext(workspace);

            return (
              <GeneratePlan context={contextAfterGoal} workspace={workspace}>
                {(plan) => {
                  console.log(
                    "Goal Decision:",
                    JSON.stringify(goalDecision, null, 2),
                  );
                  console.log("Execution Plan:", JSON.stringify(plan, null, 2));

                  // For now, just return empty result
                  return {
                    success: true,
                    modified: false,
                  };
                }}
              </GeneratePlan>
            );
          }}
        </GenerateGoalState>
      </OpenAIProvider>
    );
  },
);
