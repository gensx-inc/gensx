import { GSXChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";
import { z } from "zod";

import { Lease } from "./lease.js";
import { AgentContext, Workspace } from "./workspace.js";

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

export const SelfModifyingCodeAgent = gsx.Component<AgentProps, AgentResult>(
  "SelfModifyingCodeAgent",
  ({ workspace: _workspace, context, lease: _lease }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <GenerateGoalState context={context}>
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
}

const GenerateGoalState = gsx.Component<GenerateGoalStateProps, GoalDecision>(
  "GenerateGoalState",
  ({ context }) => (
    <GSXChatCompletion
      messages={[
        {
          role: "system",
          content: `You are an AI agent that decides on goals for improving a codebase.
Current goal state: "${context.goalState}"
History of actions: ${context.history.length} entries

You should decide if:
1. The current goal is complete or needs refinement
2. We need a new goal to pursue

Your response should be structured with:
- newGoal: true if we need a new goal
- goalState: if newGoal is true, provide a specific, actionable goal`,
        },
        {
          role: "user",
          content:
            "Analyze the current state and decide if we need a new goal.",
        },
      ]}
      model="gpt-4"
      temperature={0.7}
      outputSchema={goalDecisionSchema}
    />
  ),
);
