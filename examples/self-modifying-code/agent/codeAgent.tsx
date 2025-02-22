// Agent based on https://www.anthropic.com/research/swe-bench-sonnet

import { GSXChatCompletion } from "@gensx/openai";
import { gsx } from "gensx";
import { z } from "zod";

import { Workspace } from "../workspace.js";
import { bashTool } from "./tools/bashTool.js";
import { getBuildTool } from "./tools/buildTool.js";
import { editTool } from "./tools/editTool.js";

interface CodeAgentProps {
  task: string;
  additionalInstructions?: string;
  repoPath: string;
  workspace: Workspace;
}

// Schema for code agent output
const codeAgentOutputSchema = z.object({
  summary: z.string().describe("A summary of the changes made or attempted"),
  success: z.boolean().describe("Whether the changes were successful"),
});

export type CodeAgentOutput = z.infer<typeof codeAgentOutputSchema>;

export const CodeAgent = gsx.Component<CodeAgentProps, CodeAgentOutput>(
  "CodeAgent",
  ({ task, additionalInstructions, repoPath, workspace }) => {
    const buildTool = getBuildTool(workspace);

    return (
      <GSXChatCompletion
        messages={[
          {
            role: "system",
            content:
              "You are a helpful assistant designed to act as an expert software engineer designed to autonomously update codebases based on user instructions.",
          },
          {
            role: "user",
            content: getCodeAgentPrompt(
              task,
              additionalInstructions ?? "",
              repoPath,
            ),
          },
        ]}
        model="gpt-4o"
        temperature={0.7}
        tools={[editTool, bashTool, buildTool]}
        outputSchema={codeAgentOutputSchema}
      />
    );
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
2. Make the necessary code changes using the editTool
3. Use the buildTool to verify your changes compile successfully
4. If the build fails, examine the error output and fix any issues
5. Once the build succeeds, verify that your changes meet all the requirements

You have access to:
- bashTool: For exploring the codebase and examining files
- editTool: For making code changes
- buildTool: For verifying changes compile successfully with 'pnpm build'

Be thorough in your thinking and explain your changes. Make sure to verify the build succeeds before considering the task complete.`;
}
