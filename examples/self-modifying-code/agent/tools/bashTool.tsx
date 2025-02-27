import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

import { GSXTool } from "@gensx/anthropic";
import { z } from "zod";

import { fileCache } from "./cacheManager.js";

// Define the schema as a Zod object
const bashToolSchema = z.object({
  command: z.string().describe("The bash command to run."),
  updateCache: z
    .boolean()
    .optional()
    .describe("Whether to update the cache for any files modified by this command (default: false)."),
});
// Use z.infer to get the type for our parameters
type BashToolParams = z.infer<typeof bashToolSchema>;

// Helper function to detect file operations in the command
function detectFileOperations(command: string): { operation: string; files: string[] } | null {
  // Check for common file operations
  const catMatch = command.match(/cat\s+([^\s|><;&]+)/);
  if (catMatch) {
    return { operation: "read", files: [catMatch[1]] };
  }
  
  const grepMatch = command.match(/grep\s+.*\s+([^\s|><;&]+)/);
  if (grepMatch) {
    return { operation: "read", files: [grepMatch[1]] };
  }
  
  const sedMatch = command.match(/sed\s+.*\s+([^\s|><;&]+)/);
  if (sedMatch) {
    return { operation: "read", files: [sedMatch[1]] };
  }
  
  const findMatch = command.match(/find\s+([^\s]+)/);
  if (findMatch) {
    return { operation: "list", files: [findMatch[1]] };
  }
  
  return null;
}

// Helper function to update cache for modified files
async function updateCacheForModifiedFiles(command: string): Promise<void> {
  // Simple detection for commands that might modify files
  if (command.includes(">") || command.includes(">>") || 
      command.includes("mv") || command.includes("cp") ||
      command.includes("sed -i") || command.includes("touch")) {
    
    // Extract potential file paths
    const matches = command.match(/(['"]?[a-zA-Z0-9_\-/.]+\.[a-zA-Z0-9]+['"]?)/g);
    if (matches) {
      // For each potential file path, check if it exists and update cache
      for (const match of matches) {
        const filePath = match.replace(/^['"]|['"]$/g, ""); // Remove quotes
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            const content = await fs.readFile(filePath, "utf-8");
            fileCache.set(filePath, content);
          }
        } catch (error) {
          // Ignore errors for files that don't exist
        }
      }
    }
  }
}

// Create the tool with the correct type - using the schema type, not the inferred type
export const bashTool = new GSXTool<typeof bashToolSchema>({
  name: "bash",
  description: `Run commands in a bash shell\n
* When invoking this tool, the contents of the \"command\" parameter does NOT need to be XML-escaped.\n
* You don't have access to the internet via this tool.\n
* You do have access to a mirror of common linux and python packages via apt and pip.\n
* State is persistent across command calls and discussions with the user.\n
* To inspect a particular line range of a file, e.g. lines 10-25, try 'sed -n 10,25p /path/to/the/file'.\n
* Please avoid commands that may produce a very large amount of output.\n
* Please run long lived commands in the background, e.g. 'sleep 10 &' or start a server in the background.`,
  schema: bashToolSchema,
  run: async ({ command, updateCache = false }: BashToolParams) => {
    console.log("💻 Calling the BashTool:", command);
    
    // Check if this is a file read operation that we can optimize with the cache
    const fileOp = detectFileOperations(command);
    if (fileOp && fileOp.operation === "read") {
      // For simple cat commands, we can use the cache
      if (command.startsWith("cat ") && fileOp.files.length === 1) {
        const filePath = fileOp.files[0];
        if (fileCache.has(filePath)) {
          console.log(`📋 Using cached content for ${filePath}`);
          return fileCache.get(filePath);
        }
      }
    }
    
    try {
      const result = await Promise.resolve(execSync(command));
      const output = result.toString();
      
      // Update cache if requested or if it's a read operation
      if (updateCache) {
        await updateCacheForModifiedFiles(command);
      } else if (fileOp && fileOp.operation === "read") {
        // For read operations, cache the content
        for (const filePath of fileOp.files) {
          try {
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
              fileCache.set(filePath, output);
            }
          } catch (error) {
            // Ignore errors for files that don't exist
          }
        }
      }
      
      return output;
    } catch (error) {
      // Check if error is an object with stderr property
      if (error && typeof error === "object" && "stderr" in error) {
        return (error.stderr as Buffer).toString();
      }
      // Fallback to error message if available
      if (error instanceof Error) {
        return error.message;
      }
      return "An unknown error occurred";
    }
  },
});