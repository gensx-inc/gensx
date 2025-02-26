import { GSXTool } from "@gensx/openai";
import { z } from "zod";

import { buildWorkspace, type Workspace } from "../../workspace.js";

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
      const output = await buildWorkspace(workspace);
      return { output };
    },
  });
}
