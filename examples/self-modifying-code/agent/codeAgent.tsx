// Agent based on https://www.anthropic.com/research/swe-bench-sonnet

import { GSXChatCompletion } from "@gensx/anthropic";
import { gsx } from "gensx";
import { z } from "zod";

import { useWorkspace } from "../workspace.js";
import { analyzeFile, analyzeCorebase, validateCodeChanges } from "./utils/codeAnalyzer.js";
import { ErrorCategory, createErrorHandler, withErrorHandling } from "./utils/errorHandler.js";
import { bashTool } from "./tools/bashTool.js";
import { getBuildTool } from "./tools/buildTool.js";
import { editTool } from "./tools/editTool.js";

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
    const errorHandler = createErrorHandler();
    
    // Create an error-handled version of the main execution function
    const executeWithErrorHandling = withErrorHandling(async () => {
      // First run with tools to make the changes
      const toolResult = await GSXChatCompletion.run({
        system:
          "You are a helpful assistant designed to act as an expert software engineer designed to autonomously update codebases based on user instructions.",
        messages: [
          {
            role: "user",
            content: getCodeAgentPrompt(
              task,
              additionalInstructions ?? "",
              repoPath,
            ),
          },
        ],
        model: "claude-3-7-sonnet-latest",
        temperature: 0.7,
        max_tokens: 10000,
        tools: [editTool, bashTool, buildTool],
      });

      const textBlock = toolResult.content.find((block) => block.type === "text");
      const toolOutput = textBlock?.text ?? "";
      
      return toolOutput;
    }, errorHandler);
    
    // Execute the main function with error handling
    let toolOutput;
    try {
      toolOutput = await executeWithErrorHandling();
    } catch (error) {
      // If error handling didn't recover, create an error summary
      const errors = errorHandler.getErrors();
      const errorSummary = errors.map(e => `${e.category}: ${e.message}`).join('\n');
      
      toolOutput = `The agent encountered errors that could not be automatically resolved:\n\n${errorSummary}`;
    }

    // Then coerce the output into our structured format
    return GSXChatCompletion.run({
      system: `You are a helpful assistant that takes the output from a code modification session and structures it into a clear summary and success state.

The output should be structured as:
{
  "summary": "A clear description of what changes were made or attempted",
  "success": true/false  // true if changes were made and build succeeded, false if there were any failures
}

Look for:
- What files were modified
- Whether the changes were successful
- If the build succeeded
- Any errors or issues encountered`,
      messages: [
        {
          role: "user",
          content: `Please analyze this code modification output and provide a structured summary:

${toolOutput}`,
        },
      ],
      model: "claude-3-7-sonnet-latest",
      temperature: 0.7,
      max_tokens: 10000,
      outputSchema: codeAgentOutputSchema,
    });
  },
);

export function getCodeAgentPrompt(
  task: string,
  additionalInstructions: string,
  repoPath: string,
) {
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
2. Analyze the code structure to understand dependencies between files
3. Make the necessary code changes using the editTool
4. Feel free to use the scrapeWebpageTool to find relevant information online if needed
5. Use the buildTool to verify your changes compile successfully
6. If the build fails, examine the error output and fix any issues
7. Once the build succeeds, verify that your changes meet all the requirements

You have access to some tools that may be helpful:
- bash: For exploring the codebase and examining files
- editor: For making code changes
- build: For verifying changes compile successfully with 'pnpm build'

When creating new files, check if there are templates available in the agent/templates directory that you can use as a starting point.

Be thorough in your thinking and explain your changes in the summary. Make sure to verify the build succeeds before marking success as true.`;
}