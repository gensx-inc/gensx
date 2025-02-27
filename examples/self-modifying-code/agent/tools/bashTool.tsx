import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

import { GSXTool } from "@gensx/anthropic";
import { z } from "zod";

import { fileCache } from "./cacheManager.js";

// Define the schema as a Zod object
const bashToolSchema = z.object({
  command: z.string().describe("The bash command to run."),
  useCache: z
    .boolean()
    .optional()
    .describe("Whether to use the cache for file read operations (default: true)."),
  updateCache: z
    .boolean()
    .optional()
    .describe("Whether to update the cache for any files modified by this command (default: true)."),
});
// Use z.infer to get the type for our parameters
type BashToolParams = z.infer<typeof bashToolSchema>;

// Regular expressions for common file operations
const FILE_READ_PATTERNS = [
  { cmd: 'cat', regex: /cat\s+(['"]?)([^\s|><;&]+)\1/ },
  { cmd: 'grep', regex: /grep\s+(?:.*?)\s+(['"]?)([^\s|><;&]+)\1/ },
  { cmd: 'head', regex: /head\s+(?:.*?)\s+(['"]?)([^\s|><;&]+)\1/ },
  { cmd: 'tail', regex: /tail\s+(?:.*?)\s+(['"]?)([^\s|><;&]+)\1/ },
  { cmd: 'less', regex: /less\s+(?:.*?)\s+(['"]?)([^\s|><;&]+)\1/ },
  { cmd: 'more', regex: /more\s+(?:.*?)\s+(['"]?)([^\s|><;&]+)\1/ },
  { cmd: 'sed', regex: /sed\s+(?:.*?)\s+(['"]?)([^\s|><;&]+)\1/ },
  { cmd: 'awk', regex: /awk\s+(?:.*?)\s+(['"]?)([^\s|><;&]+)\1/ }
];

const FILE_WRITE_PATTERNS = [
  { cmd: 'write', regex: />\s*(['"]?)([^\s|><;&]+)\1/ },
  { cmd: 'append', regex: />>\s*(['"]?)([^\s|><;&]+)\1/ },
  { cmd: 'touch', regex: /touch\s+(['"]?)([^\s|><;&]+)\1/ },
  { cmd: 'mkdir', regex: /mkdir\s+(?:-p\s+)?(['"]?)([^\s|><;&]+)\1/ },
  { cmd: 'mv', regex: /mv\s+(?:.*?)\s+(['"]?)([^\s|><;&]+)\1$/ },
  { cmd: 'cp', regex: /cp\s+(?:.*?)\s+(['"]?)([^\s|><;&]+)\1$/ },
  { cmd: 'rm', regex: /rm\s+(?:-[rf]\s+)?(['"]?)([^\s|><;&]+)\1/ },
  { cmd: 'sed -i', regex: /sed\s+-i\s+(?:.*?)\s+(['"]?)([^\s|><;&]+)\1/ }
];

// Helper function to detect file operations in the command
function detectFileOperations(command: string): { 
  reads: string[]; 
  writes: string[];
  isCacheable: boolean;
} {
  const result = {
    reads: [] as string[],
    writes: [] as string[],
    isCacheable: false
  };

  // Check for file read operations
  for (const pattern of FILE_READ_PATTERNS) {
    const matches = [...command.matchAll(new RegExp(pattern.regex, 'g'))];
    for (const match of matches) {
      const filePath = match[2];
      if (filePath && !filePath.includes('*') && !result.reads.includes(filePath)) {
        result.reads.push(filePath);
      }
    }
    
    // Simple cat commands are cacheable
    if (pattern.cmd === 'cat' && command.trim().startsWith('cat ') && !command.includes('|') && 
        !command.includes('>') && !command.includes(';')) {
      result.isCacheable = true;
    }
  }

  // Check for file write operations
  for (const pattern of FILE_WRITE_PATTERNS) {
    const matches = [...command.matchAll(new RegExp(pattern.regex, 'g'))];
    for (const match of matches) {
      const filePath = match[2];
      if (filePath && !filePath.includes('*') && !result.writes.includes(filePath)) {
        result.writes.push(filePath);
      }
    }
  }

  return result;
}

// Helper function to update cache for modified files
async function updateCacheForFiles(files: string[]): Promise<void> {
  for (const filePath of files) {
    try {
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        const content = await fs.readFile(filePath, "utf-8");
        fileCache.set(filePath, content);
        console.log(`📋 Updated cache for ${filePath}`);
      }
    } catch (error) {
      // Ignore errors for files that don't exist or can't be read
      fileCache.invalidate(filePath);
    }
  }
}

// Helper function to invalidate cache for modified or deleted files
async function invalidateCacheForFiles(files: string[]): Promise<void> {
  for (const filePath of files) {
    fileCache.invalidate(filePath);
    console.log(`🗑️ Invalidated cache for ${filePath}`);
  }
}

// Create the tool with the correct type
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
  run: async ({ command, useCache = true, updateCache = true }: BashToolParams) => {
    console.log("💻 Calling the BashTool:", command);
    
    // Detect file operations in the command
    const fileOps = detectFileOperations(command);
    
    // For simple cacheable commands, try to use the cache
    if (useCache && fileOps.isCacheable && fileOps.reads.length === 1) {
      const filePath = fileOps.reads[0];
      if (fileCache.has(filePath)) {
        console.log(`📋 Using cached content for ${filePath}`);
        return fileCache.get(filePath);
      }
    }
    
    try {
      // Execute the command
      const result = execSync(command, { encoding: 'utf-8' });
      
      // Update cache for read files if requested
      if (useCache && fileOps.reads.length > 0) {
        await updateCacheForFiles(fileOps.reads);
      }
      
      // Invalidate cache for written/modified files
      if (updateCache && fileOps.writes.length > 0) {
        await invalidateCacheForFiles(fileOps.writes);
        
        // Optionally update cache with new content for modified files
        if (useCache) {
          await updateCacheForFiles(fileOps.writes);
        }
      }
      
      return result;
    } catch (error) {
      // Invalidate cache for any files that might have been modified
      if (updateCache && fileOps.writes.length > 0) {
        await invalidateCacheForFiles(fileOps.writes);
      }
      
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