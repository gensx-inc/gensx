import { ChatCompletion } from "@gensx/anthropic";
import { gsx } from "gensx";

import {
  updateWorkspaceContext,
  useWorkspaceContext,
} from "../../workspace.js";
import { bashTool } from "../tools/bashTool.js";
import { codeAnalyzer } from "../tools/codeAnalyzer.js";
import { changeTemplates } from "../tools/changeTemplates.js";

interface GeneratePlanProps {}

export const GeneratePlan = gsx.Component<GeneratePlanProps, string>(
  "GeneratePlan",
  async () => {
    const context = useWorkspaceContext();

    const systemPrompt = `You are an AI agent tasked with creating a plan to achieve a goal in a codebase.

CURRENT GOAL:
"${context.goalState}"

HISTORY OF ACTIONS:
${JSON.stringify(context.history, null, 2)}

You have access to tools to explore and analyze the codebase:
- bash: For running shell commands to explore the codebase
- codeAnalyzer: For understanding code structure and relationships
- changeTemplates: For checking available code templates that can be reused

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

Use the available tools to explore and analyze the codebase before creating your plan.`;

    // Get the plan from Claude
    const plan = await ChatCompletion.run({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content:
            "Explore the codebase and create a plan to achieve the current goal.",
        },
      ],
      model: "claude-3-7-sonnet-latest",
      temperature: 0.7,
      max_tokens: 10000,
      tools: [bashTool, codeAnalyzer, changeTemplates],
    });

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