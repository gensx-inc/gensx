// Agent based on https://www.anthropic.com/research/swe-bench-sonnet

import { GSXChatCompletion, GSXChatCompletionResult } from "@gensx/openai";
import { gsx } from "gensx";

import { bashTool } from "./bashTool.js";
import { editTool } from "./editTool.js";

interface CodeAgentProps {
  task: string;
  additionalInstructions?: string;
  repoPath: string;
}

export const CodeAgent = gsx.Component<CodeAgentProps, GSXChatCompletionResult>(
  "CodeAgent",
  ({ task, additionalInstructions, repoPath }) => {
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
        tools={[editTool, bashTool]}
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

I've uploaded a code repository in the directory ${repoPath} (not in /tmp/inputs). Consider the following PR description:

<user_instructions>
${task}${additionalInstructions ? `\n\n${additionalInstructions}` : ""}
</user_instructions>

Can you help me implement the necessary changes to the repository so that the requirements specified in the <user_instructions> are met?
I've already taken care of all changes to any of the test files described in the <user_instructions>. This means you DON'T have to modify the testing logic or any of the tests in any way!

Your task is to make the minimal changes to non-tests files in the ${repoPath} directory to ensure the <user_instructions> are satisfied.

Follow these steps to resolve the issue:
1. As a first step, it might be a good idea to explore the repo to familiarize yourself with its structure.
2. Create a script to reproduce the error and execute it using the BashTool, to confirm the error
3. Edit the sourcecode of the repo to resolve the issue
4. Rerun your reproduce script and confirm that the error is fixed!
5. Think about edge cases and make sure your fix handles them as well

Your thinking should be thorough so it's fine if it's very long.`;
}
