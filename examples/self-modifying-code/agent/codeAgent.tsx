// Agent based on https://www.anthropic.com/research/swe-bench-sonnet

import { GSXChatCompletion } from "@gensx/anthropic";
import * as gensx from "@gensx/core";
import { z } from "zod";

import { useWorkspace } from "../workspace.js";
import { bashTool } from "./tools/bashTool.js";
import { getAnalysisTool } from "./tools/analysisTool.js";
import { getBuildTool } from "./tools/buildTool.js";
import { getDiagnosticTool } from "./tools/diagnosticTool.js";
import { diffTool } from "./tools/diffTool.js";
import { editTool } from "./tools/editTool.js";
import { getErrorAnalysisTool } from "./tools/errorAnalysisTool.js";
import { rollbackTool } from "./tools/rollbackTool.js";
import { getTestTool } from "./tools/testTool.js";
import { versionControlTool } from "./tools/versionControlTool.js";

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

export const CodeAgent = gensx.Component<CodeAgentProps, CodeAgentOutput>(
  "CodeAgent",
  async ({ task, additionalInstructions, repoPath }) => {
    const workspace = useWorkspace();
    const buildTool = getBuildTool(workspace);
    const testTool = getTestTool(workspace);
    const analysisTool = getAnalysisTool(workspace);
    const errorAnalysisTool = getErrorAnalysisTool(workspace);
    const diagnosticTool = getDiagnosticTool(workspace);

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
      tools: [
        editTool, 
        bashTool, 
        buildTool, 
        testTool, 
        analysisTool, 
        errorAnalysisTool, 
        diagnosticTool,
        versionControlTool,
        diffTool,
        rollbackTool
      ],
    });

    const textBlock = toolResult.content.find((block) => block.type === "text");
    const toolOutput = textBlock?.text ?? "";

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
- If tests passed (if any were run)
- Code quality analysis results (if any were performed)
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
2. Use the analysisTool to analyze relevant code files before making changes
3. Make the necessary code changes using the editTool
4. Use the testTool to run tests on your changes when appropriate
5. Use the buildTool to verify your changes compile successfully
6. If the build fails, use the errorAnalysisTool to analyze the errors and fix any issues
7. Use the diagnosticTool to check error patterns and recovery statistics if needed
8. Once the build succeeds, verify that your changes meet all the requirements

You have access to these tools to help you:
- bash: For exploring the codebase and examining files
- editor: For making code changes
- build: For verifying changes compile successfully with 'pnpm build'
- test: For running tests on the codebase to validate changes
- analysis: For analyzing code to identify patterns, issues, and improvement opportunities
- errorAnalysis: For analyzing build and test errors and suggesting fixes
- diagnostic: For viewing error patterns, recovery statistics, and system performance
- versionControl: For tracking file versions, saving snapshots, and managing file history
- diff: For comparing different versions of files and analyzing changes
- rollback: For restoring previous versions of files when needed

When making changes:
1. Use versionControl to save a snapshot of a file before modifying it
2. After making changes, use diff to verify the changes are as intended
3. If changes cause issues, use rollback to restore previous versions

When encountering errors:
1. Use errorAnalysis to understand the root cause
2. Check diagnostic information for similar past errors
3. Make targeted fixes based on the analysis
4. Retry with incremental changes rather than large rewrites
5. Validate each fix before moving to the next issue

Be thorough in your thinking and explain your changes in the summary. Make sure to verify the build succeeds before marking success as true.`;
}