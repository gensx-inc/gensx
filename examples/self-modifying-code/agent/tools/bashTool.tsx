import { execSync } from "child_process";

import { GSXTool } from "@gensx/anthropic";
import { z } from "zod";

import { fileCache } from "./cacheManager.js";

// Define the schema as a Zod object
const bashToolSchema = z.object({
  command: z.string().describe("The bash command to run."),
});
// Use z.infer to get the type for our parameters
type BashToolParams = z.infer<typeof bashToolSchema>;

// Commands that might modify the file system
const fileModifyingCommands = [
  "mv", "cp", "rm", "mkdir", "touch", "sed -i", "awk",
  ">", ">>", "tee", "cat >", "echo >", "printf >",
];

/**
 * Check if a command might modify files and invalidate cache accordingly
 */
function invalidateCacheIfNeeded(command: string): void {
  // Check if the command contains any file modifying operations
  const mightModifyFiles = fileModifyingCommands.some(cmd => command.includes(cmd));
  
  if (mightModifyFiles) {
    console.log("Detected file-modifying command, invalidating relevant cache entries");
    
    // For now, we'll use a simple approach and clear the entire cache
    // A more sophisticated approach would parse the command and invalidate only affected paths
    fileCache.clear();
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
  run: async ({ command }: BashToolParams) => {
    console.log("💻 Calling the BashTool:", command);
    try {
      // Check if we need to invalidate the cache based on the command
      invalidateCacheIfNeeded(command);
      
      const result = await Promise.resolve(execSync(command));
      return result.toString();
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