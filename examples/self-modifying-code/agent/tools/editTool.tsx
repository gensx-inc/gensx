import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

import { GSXTool } from "@gensx/openai";
import { z } from "zod";

// Define the base schema as a Zod object
const editToolSchema = z.object({
  command: z
    .enum(["view", "create", "write"])
    .describe(
      "The commands to run. Allowed options are: `view` (read file), `create` (new file), `write` (replace entire file).",
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
  - Use this for all file modifications`,
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
            // Read and return complete file contents
            const content = await fs.readFile(params.path, "utf-8");
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
          await fs.writeFile(params.path, params.content!, "utf-8");
          return `File created successfully: ${params.path}`;
        }

        case "write": {
          if (!stats?.isFile()) {
            throw new Error(`Target must be an existing file: ${params.path}`);
          }

          // Write new content atomically
          await fs.writeFile(params.path, params.content!, "utf-8");
          return `File updated successfully: ${params.path}`;
        }

        default:
          throw new Error(`Unknown command: ${String(params.command)}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to process command: ${String(error)}`);
    }
  },
});
