import { GSXTool } from "@gensx/anthropic";
import { serializeError } from "serialize-error";
import { z } from "zod";

import { validateBuild, type Workspace } from "../../workspace.js";

// Empty schema since we don't need any parameters
const buildToolSchema = z.object({});

type BuildToolParams = z.infer<typeof buildToolSchema>;

export function getBuildTool(workspace: Workspace) {
  return new GSXTool<typeof buildToolSchema>({
    name: "build",
    description:
      "Build the project using pnpm build. Returns build output or error messages.",
    schema: buildToolSchema,
    run: async (_params: BuildToolParams) => {
      try {
        const output = await validateBuild(workspace);
        return output;
      } catch (error) {
        return {
          success: false,
          output: serializeError(error),
        };
      }
    },
  });
}
