// Agent based on https://www.anthropic.com/research/swe-bench-sonnet

import { OpenAIProvider } from "@gensx/openai";
import { GSXCompletion } from "@gensx/openai";
import { gsx } from "gensx";

import { bashTool } from "./BashTool.js";
import { confirmationTool } from "./ConfirmationTool.js";
import { editTool } from "./EditTool.js";

interface CodeAgentProps {
  message: string;
  repoPath: string;
}

export const CodeAgent = gsx.Component<CodeAgentProps, string>(
  "CodeAgent",
  ({ message, repoPath }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <GSXCompletion
          messages={[
            {
              role: "system",
              content:
                "You are a helpful assistant designed to act as an expert software engineer and assist users with updating their code. Before making any changes or running any commands, you must get user confirmation.\n\nFor any bash or edit commands:\n1. First use the confirmation tool to get user approval\n2. Only proceed with the action if the user approves (returns 'yes')\n3. If the user denies (returns 'no'), explain that you won't proceed and ask what they'd like to do instead",
            },
            {
              role: "user",
              content: getCodeAgentPrompt(message, repoPath),
            },
          ]}
          model="gpt-4o-mini"
          temperature={0.7}
          tools={[confirmationTool, editTool, bashTool]}
        />
      </OpenAIProvider>
    );
  },
);

export function getCodeAgentPrompt(message: string, repoPath: string) {
  return `<uploaded_files>
${repoPath}
</uploaded_files>

I've uploaded a python code repository in the directory ${repoPath} (not in /tmp/inputs). Consider the following PR description:

<user_instructions>
${message}
</user_instructions>

Can you help me implement the necessary changes to the repository so that the requirements specified in the <user_instructions> are met?
I've already taken care of all changes to any of the test files described in the <user_instructions>. This means you DON'T have to modify the testing logic or any of the tests in any way!

Your task is to make the minimal changes to non-tests files in the ${repoPath} directory to ensure the <user_instructions> are satisfied.

Follow these steps to resolve the issue:
1. As a first step, it might be a good idea to explore the repo to familiarize yourself with its structure.
2. Create a script to reproduce the error and execute it with \`python <filename.py>\` using the BashTool, to confirm the error
3. Edit the sourcecode of the repo to resolve the issue
4. Rerun your reproduce script and confirm that the error is fixed!
5. Think about edge cases and make sure your fix handles them as well

Your thinking should be thorough so it's fine if it's very long.`;
}
