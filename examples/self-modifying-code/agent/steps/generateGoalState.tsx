import { GSXChatCompletion } from "@gensx/anthropic";
import * as gensx from "@gensx/core";
import { z } from "zod";

import {
  updateWorkspaceContext,
  useWorkspaceContext,
} from "../../workspace.js";
import { bashTool } from "../tools/bashTool.js";

// Remove unused schema since we're defining inline now
interface GoalDecision {
  newGoal: boolean;
  goalState: string;
}

interface GenerateGoalStateProps {}

const needsGoalSchema = z.object({
  needsNewGoal: z.boolean().describe("Whether we need a new goal"),
});

type DecideIfGoalAchievedOutput = z.infer<typeof needsGoalSchema>;

const DecideIfGoalAchieved = gensx.Component<{}, DecideIfGoalAchievedOutput>(
  "DecideIfGoalAchieved",
  () => {
    const context = useWorkspaceContext();

    const systemPrompt = `You are an AI agent that decides if the current goal has been achieved.

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
- Only move to a new goal when the current one is definitively achieved`;

    return GSXChatCompletion.run({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content:
            "Review the goal state and history, then make your decision.",
        },
      ],
      model: "claude-3-7-sonnet-latest",
      temperature: 0.7,
      max_tokens: 10000,
      outputSchema: needsGoalSchema,
    });
  },
);

const GenerateNewGoal = gensx.Component<{}, string>(
  "GenerateNewGoal",
  async () => {
    const context = useWorkspaceContext();

    const systemPrompt = `You are an AI agent that generates new goals for improving a codebase.

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
- Use the tools to explore the codebase and find relevant information online if needed`;

    const result = await GSXChatCompletion.run({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: "Explore the codebase and propose a new goal.",
        },
      ],
      model: "claude-3-7-sonnet-latest",
      temperature: 0.7,
      max_tokens: 10000,
      tools: [bashTool],
    });

    const textBlock = result.content.find((block) => block.type === "text");
    const goal = textBlock?.text ?? context.goalState;

    return goal;
  },
);

export const GenerateGoalState = gensx.Component<
  GenerateGoalStateProps,
  GoalDecision
>("GenerateGoalState", async () => {
  const context = useWorkspaceContext();

  // First step: Decide if we need a new goal
  const needsNewGoal = await DecideIfGoalAchieved.run({});

  if (!needsNewGoal.needsNewGoal) {
    return {
      newGoal: false,
      goalState: context.goalState,
    };
  }

  // Second step: Generate new goal using tools to explore codebase
  const newGoal = await GenerateNewGoal.run({});

  await updateWorkspaceContext({
    goalState: newGoal,
  });

  return {
    newGoal: true,
    goalState: newGoal,
  };
});
