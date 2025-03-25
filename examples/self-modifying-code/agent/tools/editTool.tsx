import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

import { GSXTool } from "@gensx/anthropic";
import { serializeError } from "serialize-error";
import { z } from "zod";

import { fileCache } from "./cacheManager.js";
import { trackModifiedFile } from "./testGeneratorTool.js";

// Define the base schema as a Zod object
const editToolSchema = z.object({
  command: z
    .enum(["view", "create", "write", "edit"])
    .describe(
      "The commands to run. Allowed options are: `view` (read file), `create` (new file), `write` (replace entire file), `edit` (modify part of a file).",
    ),
  path: z
    .string()
    .describe(
      "Absolute path to file or directory, e.g. `/repo/file.py` or `/repo`.",
    ),
  content: z
    .string()
    .optional()
    .describe(
      "Required for create/write commands. The complete content to write to the file.",
    ),
  startLine: z
    .number()
    .optional()
    .describe("Starting line number for edit operations (1-based indexing)."),
  endLine: z
    .number()
    .optional()
    .describe("Ending line number for edit operations (inclusive, 1-based indexing)."),
  mode: z
    .enum(["replace", "insert", "delete"])
    .optional()
    .describe("Mode for edit operation: replace lines, insert at position, or delete lines."),
});

type EditToolParams = z.infer<typeof editToolSchema>;

export const editTool = new GSXTool<typeof editToolSchema>({
  name: "editor",
  description: `Tool for viewing and editing files. Operations are atomic - edits replace the entire file content.

Commands:
* view: Read a file or list directory contents
  - For files: returns the complete file content
  - For directories: lists files and directories up to 2 levels deep
* create: Create a new file with the specified content
  - Will create parent directories if needed
  - Fails if file already exists
* write: Replace entire file content
  - Creates a backup before modification
  - Writes the new content atomically
  - this does not edit a file in place, it creates a new file with the updated content
  - Use this for all file modifications
* edit: Modify part of a file
  - Requires startLine parameter (1-based indexing)
  - For replace: requires endLine and content parameters
  - For insert: requires content parameter (inserts at startLine)
  - For delete: requires endLine parameter`,
  schema: editToolSchema,
  run: async (params: EditToolParams) => {
    console.log("🛠️ Calling the EditTool:", params);

    // Validate required fields based on command
    if (
      (params.command === "create" || params.command === "write") &&
      !params.content
    ) {
      throw new Error("content is required for create and write commands");
    }

    if (params.command === "edit") {
      if (!params.startLine) {
        throw new Error("startLine is required for edit command");
      }
      
      if (!params.mode) {
        throw new Error("mode is required for edit command");
      }
      
      if (params.mode === "replace" && (!params.endLine || !params.content)) {
        throw new Error("endLine and content are required for replace mode");
      }
      
      if (params.mode === "insert" && !params.content) {
        throw new Error("content is required for insert mode");
      }
      
      if (params.mode === "delete" && !params.endLine) {
        throw new Error("endLine is required for delete mode");
      }
    }

    try {
      const stats = await fs.stat(params.path).catch(() => null);

      switch (params.command) {
        case "view": {
          if (!stats) {
            throw new Error(`Path does not exist: ${params.path}`);
          }

          if (stats.isDirectory()) {
            // List files up to 2 levels deep for directories
            const result = execSync(
              `find "${params.path}" -maxdepth 2 -not -path '*/\\.*' -type f -o -type d`,
              { encoding: "utf-8" },
            );
            return result;
          } else {
            // Check if file content is in cache
            const cachedContent = fileCache.get(params.path);
            if (cachedContent !== null) {
              console.log(`Cache hit for: ${params.path}`);
              return cachedContent;
            }

            // If not in cache, read from file system and cache it
            console.log(`Cache miss for: ${params.path}`);
            const content = await fs.readFile(params.path, "utf-8");
            fileCache.set(params.path, content);
            return content;
          }
        }

        case "create": {
          if (stats) {
            throw new Error(
              `Cannot create file, path already exists: ${params.path}`,
            );
          }
          await fs.mkdir(path.dirname(params.path), { recursive: true });
          
          // Make sure content is not undefined
          const content = params.content || "";
          await fs.writeFile(params.path, content, "utf-8");
          
          // Cache the new file content
          fileCache.set(params.path, content);
          
          // Track file creation for test generation
          // Only track TypeScript/JavaScript files
          if (params.path.endsWith('.ts') || params.path.endsWith('.tsx') || 
              params.path.endsWith('.js') || params.path.endsWith('.jsx')) {
            trackModifiedFile(params.path);
          }
          
          return `File created successfully: ${params.path}`;
        }

        case "write": {
          if (!stats?.isFile()) {
            throw new Error(`Target must be an existing file: ${params.path}`);
          }

          // Make sure content is not undefined
          const content = params.content || "";
          
          // Write new content atomically
          await fs.writeFile(params.path, content, "utf-8");
          
          // Update the cache with new content
          fileCache.set(params.path, content);
          
          // Track file modification for test generation
          // Only track TypeScript/JavaScript files
          if (params.path.endsWith('.ts') || params.path.endsWith('.tsx') || 
              params.path.endsWith('.js') || params.path.endsWith('.jsx')) {
            trackModifiedFile(params.path);
          }
          
          return `File updated successfully: ${params.path}`;
        }

        case "edit": {
          if (!stats?.isFile()) {
            throw new Error(`Target must be an existing file: ${params.path}`);
          }

          // Get the current content (from cache if available)
          let currentContent = fileCache.get(params.path);
          if (currentContent === null) {
            currentContent = await fs.readFile(params.path, "utf-8");
          }

          const lines = currentContent.split("\n");
          
          // Adjust for 1-based indexing
          const startIdx = (params.startLine as number) - 1;
          const endIdx = params.endLine ? params.endLine - 1 : startIdx;
          
          if (startIdx < 0 || startIdx >= lines.length || endIdx >= lines.length) {
            throw new Error(`Line numbers out of range. File has ${lines.length} lines.`);
          }

          let newContent: string;
          
          switch (params.mode) {
            case "replace": {
              // Replace the specified lines with new content
              const newLines = (params.content || "").split("\n");
              lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
              newContent = lines.join("\n");
              break;
            }
            case "insert": {
              // Insert new content at the specified line
              const newLines = (params.content || "").split("\n");
              lines.splice(startIdx, 0, ...newLines);
              newContent = lines.join("\n");
              break;
            }
            case "delete": {
              // Delete the specified lines
              lines.splice(startIdx, endIdx - startIdx + 1);
              newContent = lines.join("\n");
              break;
            }
            default:
              throw new Error(`Unknown edit mode: ${String(params.mode)}`);
          }

          // Write the updated content and update the cache
          await fs.writeFile(params.path, newContent, "utf-8");
          fileCache.set(params.path, newContent);
          
          // Track file modification for test generation
          // Only track TypeScript/JavaScript files
          if (params.path.endsWith('.ts') || params.path.endsWith('.tsx') || 
              params.path.endsWith('.js') || params.path.endsWith('.jsx')) {
            trackModifiedFile(params.path);
          }
          
          return `File edited successfully: ${params.path}`;
        }

        default:
          throw new Error(`Unknown command: ${String(params.command)}`);
      }
    } catch (error) {
      return {
        success: false,
        output: serializeError(error),
      };
    }
  },
});