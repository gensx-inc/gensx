import { ChatCompletion } from "@gensx/anthropic";
import * as gensx from "@gensx/core";

import {
  updateWorkspaceContext,
  useWorkspaceContext,
} from "../../workspace.js";
import { bashTool } from "../tools/bashTool.js";
import { codeAnalyzerTool } from "../tools/codeAnalyzer.js";
import { customizeTemplate, findBestTemplate } from "./planTemplates.js";

interface GeneratePlanProps {}

export const GeneratePlan = gensx.Component<GeneratePlanProps, string>(
  "GeneratePlan",
  async () => {
    const context = useWorkspaceContext();

    // Check if we have a suitable template for this goal
    const bestTemplate = findBestTemplate(context.goalState);
    let templateSuggestion = "";
    
    if (bestTemplate) {
      templateSuggestion = `
I've identified a suitable plan template for your goal: "${bestTemplate.name}".
This template is designed for: ${bestTemplate.description}

Here's a customized plan based on this template:

${customizeTemplate(bestTemplate, context.goalState)}

You can use this template as a starting point and modify it based on your exploration of the codebase.
`;
    }

    const systemPrompt = `You are an AI agent tasked with creating a plan to achieve a goal in a codebase.

CURRENT GOAL:
"${context.goalState}"

HISTORY OF ACTIONS:
${JSON.stringify(context.history, null, 2)}

You have access to bash commands and code analysis tools to explore the codebase:
- List files and directories
- Read file contents
- Check file existence
- Analyze project structure
- Analyze code relationships and dependencies

First, explore the codebase to understand what needs to be changed.
Then create a clear, descriptive plan that outlines:
1. What files need to be modified
2. What changes need to be made
3. How we'll validate the changes
4. What the expected outcome will be

Your plan should be:
- Structured with clear sections
- Specific about files and changes
- Detailed enough for implementation
- Broken down into manageable steps
- Focused on WHAT needs to be done, not HOW to do it

${templateSuggestion ? templateSuggestion : ""}

Use the bash tool and codeAnalyzer tool to explore the codebase before finalizing your plan.`;

    // Get the plan from OpenAI
    const plan = await ChatCompletion.run({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content:
            "Explore the codebase and create a detailed, structured plan to achieve the current goal.",
        },
      ],
      model: "claude-3-7-sonnet-latest",
      temperature: 0.7,
      max_tokens: 10000,
      tools: [bashTool, codeAnalyzerTool],
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