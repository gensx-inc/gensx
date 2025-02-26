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
      try {
        console.log("\ud83d\udcbb Starting build process...");
        const output = await buildWorkspace(workspace);
        console.log("\ud83c\udf89 Build process completed successfully.");
        return { output };
      } catch (error) {
        console.error("\u274c Build process failed.", error);
        return { output: "Build failed: " + (error instanceof Error ? error.message : "Unknown error") };
      }
    },
  });
}
