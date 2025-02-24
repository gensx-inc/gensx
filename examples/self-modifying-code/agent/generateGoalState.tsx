import { GSXChatCompletion } from "@gensx/openai";
import { gsx } from "gensx";
import { z } from "zod";

import { updateWorkspaceContext, useWorkspaceContext } from "../workspace.js";
import { bashTool } from "./tools/bashTool.js";
import { scrapeUrlTool } from "./tools/scrapeWebpage.js";

// Remove unused schema since we're defining inline now
interface GoalDecision {
  newGoal: boolean;
  goalState: string;
}

interface GenerateGoalStateProps {}

const GenerateGoalStateCompletion = gsx.Component<
  GenerateGoalStateProps,
  GoalDecision
>("GenerateGoalState", () => {
  const context = useWorkspaceContext();

  // First step: Decide if we need a new goal
  return (
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
    >
      {(result) => {
        // If we don't need a new goal, return the current one
        if (!result.needsNewGoal) {
          return {
            newGoal: false,
            goalState: context.goalState,
          };
        }

        // Second step: Generate new goal using tools to explore codebase
        return (
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
- After initial simple goals like README changes, focus on code improvements
- Use the tools to explore the codebase and find relevant information online if needed`,
              },
              {
                role: "user",
                content: "Explore the codebase and propose a new goal.",
              },
            ]}
            model="gpt-4o"
            temperature={0.7}
            tools={[bashTool, scrapeUrlTool]}
          >
            {(newGoalResult) => {
              return {
                newGoal: true,
                goalState:
                  newGoalResult.choices[0]?.message?.content ??
                  context.goalState,
              };
            }}
          </GSXChatCompletion>
        );
      }}
    </GSXChatCompletion>
  );
});

export const GenerateGoalState = gsx.Component<
  GenerateGoalStateProps,
  GoalDecision
>("GenerateGoalStateAndUpdateContext", () => (
  <GenerateGoalStateCompletion>
    {async ({ newGoal, goalState }) => {
      await updateWorkspaceContext({
        goalState,
      });
      return { newGoal, goalState };
    }}
  </GenerateGoalStateCompletion>
));
