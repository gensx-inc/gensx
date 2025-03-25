// Agent based on https://www.anthropic.com/research/swe-bench-sonnet

import fs from "fs/promises";
import path from "path";

import { GSXChatCompletion } from "@gensx/anthropic";
import * as gensx from "@gensx/core";
import { serializeError } from "serialize-error";
import { z } from "zod";

import { useWorkspace } from "../workspace.js";
import { bashTool } from "./tools/bashTool.js";
import { getBuildTool } from "./tools/buildTool.js";
import { codeAnalyzerTool } from "./tools/codeAnalyzer.js";
import { editTool } from "./tools/editTool.js";
import { fileCache } from "./tools/cacheManager.js";
import { testGeneratorTool, getModifiedFiles, clearModifiedFiles } from "./tools/testGeneratorTool.js";

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

// Maximum number of retry attempts for operations
const MAX_RETRIES = 3;

/**
 * Create a backup of a file before modifying it
 */
async function createFileBackup(filePath: string): Promise<string | null> {
  try {
    const stats = await fs.stat(filePath).catch(() => null);
    if (!stats?.isFile()) {
      return null;
    }

    const backupPath = `${filePath}.backup-${Date.now()}`;
    await fs.copyFile(filePath, backupPath);
    console.log(`Created backup of ${filePath} at ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`Failed to create backup of ${filePath}:`, serializeError(error));
    return null;
  }
}

/**
 * Restore a file from its backup
 */
async function restoreFromBackup(backupPath: string, originalPath: string): Promise<boolean> {
  try {
    if (!backupPath) return false;
    
    const stats = await fs.stat(backupPath).catch(() => null);
    if (!stats?.isFile()) {
      return false;
    }

    await fs.copyFile(backupPath, originalPath);
    console.log(`Restored ${originalPath} from backup ${backupPath}`);
    
    // Update the cache with the restored content
    const fileContent = await fs.readFile(originalPath, "utf-8");
    fileCache.set(originalPath, fileContent);
    
    return true;
  } catch (error) {
    console.error(`Failed to restore from backup ${backupPath}:`, serializeError(error));
    return false;
  }
}

/**
 * Execute a function with retry logic
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  description = "operation"
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt}/${retries} for ${description} failed:`, serializeError(error));
      
      if (attempt < retries) {
        // Wait with exponential backoff before retrying
        const delay = Math.pow(2, attempt) * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`All ${retries} attempts for ${description} failed. Last error: ${
    lastError instanceof Error ? lastError.message : String(lastError)
  }`);
}

/**
 * Generate tests for modified files
 */
async function generateTestsForModifiedFiles(): Promise<string> {
  const modifiedFiles = getModifiedFiles();
  
  if (modifiedFiles.length === 0) {
    return "No files were modified, no tests to generate.";
  }
  
  const results: string[] = [];
  
  for (const filePath of modifiedFiles) {
    try {
      // Skip test files themselves
      if (filePath.includes('__tests__') || filePath.includes('.test.')) {
        continue;
      }
      
      console.log(`Generating tests for ${filePath}`);
      const result = await testGeneratorTool.run({
        command: 'generate',
        path: filePath,
        force: false
      });
      
      if (typeof result === 'string') {
        results.push(result);
      } else {
        results.push(`Failed to generate tests for ${filePath}`);
      }
    } catch (error) {
      console.error(`Error generating tests for ${filePath}:`, serializeError(error));
      results.push(`Error generating tests for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Clear the modified files list after generating tests
  clearModifiedFiles();
  
  return results.join('\n');
}

export const CodeAgent = gensx.Component<CodeAgentProps, CodeAgentOutput>(
  "CodeAgent",
  async ({ task, additionalInstructions, repoPath }) => {
    const workspace = useWorkspace();
    const buildTool = getBuildTool(workspace);
    
    // Track files that were modified for potential recovery
    const modifiedFiles = new Map<string, string>(); // filePath -> backupPath

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
        {
          ...editTool,
          run: async (params) => {
            try {
              // For write and edit operations, create a backup of the file first
              if (
                (params.command === "write" || params.command === "edit") &&
                params.path
              ) {
                const backupPath = await createFileBackup(params.path);
                if (backupPath) {
                  modifiedFiles.set(params.path, backupPath);
                }
              }

              // Execute the original tool with retry logic
              return await withRetry(
                () => editTool.run(params),
                MAX_RETRIES,
                `editTool ${params.command} on ${params.path}`
              );
            } catch (error) {
              console.error(`Error in editTool:`, serializeError(error));
              return {
                success: false,
                output: serializeError(error),
              };
            }
          },
        },
        bashTool,
        buildTool,
        codeAnalyzerTool,
        testGeneratorTool,
      ],
    });

    const textBlock = toolResult.content.find((block) => block.type === "text");
    const toolOutput = textBlock?.text ?? "";

    // Check if build was successful by looking for build tool invocation
    const buildSuccessful = toolOutput.includes("Build completed successfully");
    
    // If build was successful, generate tests for modified files
    let testGenerationOutput = "";
    if (buildSuccessful) {
      console.log("Build successful. Generating tests for modified files...");
      testGenerationOutput = await generateTestsForModifiedFiles();
      console.log(testGenerationOutput);
    }
    
    // If build failed, attempt to restore files from backups
    if (!buildSuccessful && modifiedFiles.size > 0) {
      console.log("Build failed. Attempting to restore files from backups...");
      
      for (const [filePath, backupPath] of modifiedFiles.entries()) {
        await restoreFromBackup(backupPath, filePath);
      }
      
      // Try building again after restoration
      const recoveryBuildResult = await buildTool.run({});
      const recoverySuccessful = typeof recoveryBuildResult === "string" && 
                                recoveryBuildResult.includes("Build completed successfully");
      
      if (recoverySuccessful) {
        console.log("Recovery successful! Build passed after restoring files.");
      } else {
        console.log("Recovery attempt failed. Build still failing after restoration.");
      }
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
- Any errors or issues encountered
- If tests were generated`,
      messages: [
        {
          role: "user",
          content: `Please analyze this code modification output and provide a structured summary:

${toolOutput}

${testGenerationOutput ? `Additional test generation output:\n${testGenerationOutput}` : ''}`,
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
2. Use the codeAnalyzer tool to understand code relationships and find appropriate places for modifications
3. Make the necessary code changes using the editTool
4. Feel free to use the scrapeWebpageTool to find relevant information online if needed
5. Use the buildTool to verify your changes compile successfully
6. If the build fails, examine the error output and fix any issues
7. Once the build succeeds, verify that your changes meet all the requirements
8. Use the testGenerator tool to analyze modified files and generate tests for them

You have access to some tools that may be helpful:
- bash: For exploring the codebase and examining files
- editor: For making code changes
- codeAnalyzer: For analyzing code structure, dependencies and finding insertion points
- build: For verifying changes compile successfully with 'pnpm build'
- testGenerator: For generating tests for modified files

Be thorough in your thinking and explain your changes in the summary. Make sure to verify the build succeeds before marking success as true.`;
}