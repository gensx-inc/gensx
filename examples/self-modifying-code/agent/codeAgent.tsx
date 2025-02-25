// Agent based on https://www.anthropic.com/research/swe-bench-sonnet

import { GSXChatCompletion } from "@gensx/openai";
import { gsx } from "gensx";
import { z } from "zod";

import { useWorkspace } from "../workspace.js";
import { bashTool } from "./tools/bashTool.js";
import { getBuildTool } from "./tools/buildTool.js";
import { editTool } from "./tools/editTool.js";
import { scrapeUrlTool } from "./tools/scrapeWebpage.js";
interface CodeAgentProps {
  task: string;
  additionalInstructions?: string;
  repoPath: string;
}

// Schema for code agent output
const codeAgentOutputSchema = z.object({
  summary: z.string().describe("A summary of the changes made or attempted"),
  success: z.boolean().describe("Whether the changes were successful"),
});

export type CodeAgentOutput = z.infer<typeof codeAgentOutputSchema>;

export const CodeAgent = gsx.Component<CodeAgentProps, CodeAgentOutput>(
  "CodeAgent",
  async ({ task, additionalInstructions, repoPath }) => {
    const workspace = useWorkspace();
    const buildTool = getBuildTool(workspace);

    // Enhanced decision-making process
    const enhancedPrompt = `You are a highly capable AI designed to autonomously update codebases with advanced decision-making capabilities.

Your task is to:
1. Consider short-term and long-term goals
2. Handle complex tasks and edge cases effectively
3. Make informed decisions based on detailed analysis

You have access to tools like bash for exploring and editing files, and scrapeUrl for online information.`;

    // Run with tools to make the changes
    const toolResult = await GSXChatCompletion.run({
      messages: [
        {
          role: "system",
          content: enhancedPrompt,
        },
        {
          role: "user",
          content: getCodeAgentPrompt(
            task,
            additionalInstructions ?? "",
            repoPath,
          ),
        },
      ],
      model: "gpt-4o",
      temperature: 0.7,
      tools: [editTool, bashTool, buildTool, scrapeUrlTool],
    });

    const toolOutput = toolResult.choices[0]?.message?.content ?? "";

    // Structure the output
    return GSXChatCompletion.run({
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that structures outputs from code modification sessions into clear summaries.`,
        },
        {
          role: "user",
          content: `Please analyze the code modification output and provide a structured summary:

${toolOutput}`,
        },
      ],
      model: "gpt-4o",
      temperature: 0.7,
      outputSchema: codeAgentOutputSchema,
    });
  },
);

function getCodeAgentPrompt(task: string, additionalInstructions: string, repoPath: string) {
  return `<uploaded_files>
${repoPath}
</uploaded_files>

I've uploaded a code repository in the directory ${repoPath}. Consider the following task:

<user_instructions>
${task}${additionalInstructions ? `\n\n${additionalInstructions}` : ""}
</user_instructions>

Can you help me implement the necessary changes to the repository so that the requirements specified in the <user_instructions> are met?

Your task is to make the minimal necessary changes to the files in the ${repoPath} directory to implement the requirements.

Follow these steps:
1. First, explore the repo to understand its structure and identify the files that need to be modified
2. Make the necessary code changes using the editTool
3. Use the buildTool to verify your changes compile successfully
4. If the build fails, examine the error output and fix any issues
5. Verify that your changes meet all the requirements

You have access to tools for exploring the codebase and making changes.`;
}
