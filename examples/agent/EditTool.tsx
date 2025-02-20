import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

import { GSXTool } from "@gensx/openai";
import { z } from "zod";

// Define the base schema as a Zod object
const editToolSchema = z.object({
  command: z
    .enum(["view", "create", "str_replace", "insert", "undo_edit"])
    .describe(
      "The commands to run. Allowed options are: `view`, `create`, `str_replace`, `insert`, `undo_edit`.",
    ),
  path: z
    .string()
    .describe(
      "Absolute path to file or directory, e.g. `/repo/file.py` or `/repo`.",
    ),
  file_text: z
    .string()
    .optional()
    .describe(
      "Required parameter of `create` command, with the content of the file to be created.",
    ),
  insert_line: z
    .number()
    .int()
    .optional()
    .describe(
      "Required parameter of `insert` command. The `new_str` will be inserted AFTER the line `insert_line` of `path`.",
    ),
  new_str: z
    .string()
    .optional()
    .describe(
      "Required parameter of `str_replace` command containing the new string. Required parameter of `insert` command containing the string to insert.",
    ),
  old_str: z
    .string()
    .optional()
    .describe(
      "Required parameter of `str_replace` command containing the string in `path` to replace.",
    ),
  view_range: z
    .array(z.number().int())
    .optional()
    .describe(
      "Optional parameter of `view` command when `path` points to a file. If none is given, the full file is shown. If provided, the file will be shown in the indicated line number range, e.g. [11, 12] will show lines 11 and 12. Indexing at 1 to start. Setting `[start_line, -1]` shows all lines from `start_line` to the end of the file.",
    ),
});

// Use z.infer to get the type for our parameters
type EditToolParams = z.infer<typeof editToolSchema>;

// Create the tool with the correct type
export const editTool = new GSXTool<typeof editToolSchema>({
  name: "str_replace_editor",
  description: `Custom editing tool for viewing, creating and editing files\n
* State is persistent across command calls and discussions with the user\n
* If \`path\` is a file, \`view\` displays the result of applying \`cat -n\`. If \`path\` is a directory, \`view\` lists non-hidden files and directories up to 2 levels deep\n
* The \`create\` command cannot be used if the specified \`path\` already exists as a file\n
* If a \`command\` generates a long output, it will be truncated and marked with \`<response clipped>\` \n
* The \`undo_edit\` command will revert the last edit made to the file at \`path\`\n
\n
Notes for using the \`str_replace\` command:\n
* The \`old_str\` parameter should match EXACTLY one or more consecutive lines from the original file. Be mindful of whitespaces!\n
* If the \`old_str\` parameter is not unique in the file, the replacement will not be performed. Make sure to include enough context in \`old_str\` to make it unique\n
* The \`new_str\` parameter should contain the edited lines that should replace the \`old_str\``,
  schema: editToolSchema,
  run: async (params: EditToolParams) => {
    console.log("Processing edit command", params);

    // Validate required fields based on command
    switch (params.command) {
      case "create":
        if (!params.file_text) {
          throw new Error("file_text is required for create command");
        }
        break;
      case "str_replace":
        if (!params.old_str || !params.new_str) {
          throw new Error(
            "old_str and new_str are required for str_replace command",
          );
        }
        break;
      case "insert":
        if (!params.insert_line || !params.new_str) {
          throw new Error(
            "insert_line and new_str are required for insert command",
          );
        }
        break;
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
            // For files, use cat -n and optionally filter by view_range
            if (params.view_range) {
              const [start, end] = params.view_range;
              const result = execSync(
                `sed -n '${start},${end}p' "${params.path}" | cat -n`,
                { encoding: "utf-8" },
              );
              return result;
            } else {
              const result = execSync(`cat -n "${params.path}"`, {
                encoding: "utf-8",
              });
              return result;
            }
          }
        }

        case "create": {
          if (stats) {
            throw new Error(
              `Cannot create file, path already exists: ${params.path}`,
            );
          }
          await fs.mkdir(path.dirname(params.path), { recursive: true });
          await fs.writeFile(params.path, params.file_text!, "utf-8");
          return `File created successfully: ${params.path}`;
        }

        case "str_replace": {
          if (!stats?.isFile()) {
            throw new Error(`Target must be an existing file: ${params.path}`);
          }

          const content = await fs.readFile(params.path, "utf-8");

          // Create backup before modification
          const backupPath = `${params.path}.bak`;
          await fs.writeFile(backupPath, content, "utf-8");

          // Count occurrences of old_str
          const occurrences = content.split(params.old_str!).length - 1;
          if (occurrences === 0) {
            throw new Error("old_str not found in file");
          }
          if (occurrences > 1) {
            throw new Error("old_str matches multiple locations in file");
          }

          // Perform the replacement
          const newContent = content.replace(params.old_str!, params.new_str!);
          await fs.writeFile(params.path, newContent, "utf-8");
          return `File updated successfully: ${params.path}`;
        }

        case "insert": {
          if (!stats?.isFile()) {
            throw new Error(`Target must be an existing file: ${params.path}`);
          }

          const content = await fs.readFile(params.path, "utf-8");
          const lines = content.split("\n");

          if (params.insert_line! < 0 || params.insert_line! > lines.length) {
            throw new Error(`Invalid insert_line: ${params.insert_line}`);
          }

          // Create backup before modification
          const backupPath = `${params.path}.bak`;
          await fs.writeFile(backupPath, content, "utf-8");

          // Insert the new string after the specified line
          lines.splice(params.insert_line!, 0, params.new_str!);
          await fs.writeFile(params.path, lines.join("\n"), "utf-8");
          return `File updated successfully: ${params.path}`;
        }

        case "undo_edit": {
          const backupPath = `${params.path}.bak`;
          const backupStats = await fs.stat(backupPath).catch(() => null);

          if (!backupStats) {
            throw new Error(`No backup file found for: ${params.path}`);
          }

          // Restore from backup
          await fs.copyFile(backupPath, params.path);
          await fs.unlink(backupPath);
          return `Successfully reverted last edit to: ${params.path}`;
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
