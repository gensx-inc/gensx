import { GSXChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";
import { z } from "zod";

import { Lease } from "../lease.js";
import { AgentContext, updateContext, Workspace } from "../workspace.js";

export interface AgentProps {
  workspace: Workspace;
  context: AgentContext;
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

export const SelfModifyingCodeAgent = gsx.Component<AgentProps, AgentResult>(
  "SelfModifyingCodeAgent",
  ({ workspace, context, lease: _lease }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <GenerateGoalState context={context} workspace={workspace}>
          {(decision) => {
            console.log("Goal Decision:", JSON.stringify(decision, null, 2));

            // For now, just return empty result
            return {
              success: true,
              modified: false,
            };
          }}
        </GenerateGoalState>
      </OpenAIProvider>
    );
  },
);

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
