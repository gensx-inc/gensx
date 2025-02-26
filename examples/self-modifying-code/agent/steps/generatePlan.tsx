import { ChatCompletion } from "@gensx/anthropic";
import { gsx } from "gensx";

import {
  updateWorkspaceContext,
  useWorkspaceContext,
} from "../../workspace.js";
import { bashTool } from "../tools/bashTool.js";
import { Plan, enhancePlan, parsePlanFromText, validatePlan } from "../utils/planValidator.js";

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

Your plan should include:
- Clear step IDs (e.g., "Step 1", "Step 2")
- Risk levels for each step (low, medium, high)
- Dependencies between steps
- Verification steps after major changes
- A final build/validation step

Use the bash tool to explore the codebase before creating your plan.`;

    // Get the plan from OpenAI
    const planText = await ChatCompletion.run({
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
      tools: [bashTool],
    });

    // Parse the plan text into a structured plan
    let plan: Plan;
    try {
      plan = parsePlanFromText(planText);
      
      // Get list of existing files for validation
      const existingFiles: string[] = [];
      
      // Validate the plan
      const validation = validatePlan(plan, existingFiles);
      
      // If the plan is valid, enhance it with additional verification steps
      if (validation.isValid) {
        plan = enhancePlan(plan, existingFiles);
      } else {
        // Log validation issues
        await updateWorkspaceContext({
          history: [
            {
              timestamp: new Date(),
              action: "Plan validation",
              result: "failure",
              details: `Plan validation failed: ${validation.issues.map(i => i.message).join(', ')}`,
            },
          ],
        });
      }
    } catch (error) {
      // If plan parsing fails, just use the text as is
      await updateWorkspaceContext({
        history: [
          {
            timestamp: new Date(),
            action: "Plan parsing",
            result: "failure",
            details: `Failed to parse plan: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      });
    }

    // Add the plan to history
    await updateWorkspaceContext({
      history: [
        {
          timestamp: new Date(),
          action: "Generated execution plan",
          result: "success",
          details: planText,
        },
      ],
    });

    return planText;
  },
);