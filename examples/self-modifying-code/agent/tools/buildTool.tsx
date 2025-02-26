import { GSXTool } from "@gensx/openai";
import { z } from "zod";

import { buildWorkspace, type Workspace } from "../../workspace.js";

// Empty schema since we don't need any parameters
const buildToolSchema = z.object({});

type BuildToolParams = z.infer<typeof buildToolSchema>;

// Centralized logging function
function logError(context: string, error: unknown) {
  console.error(`❌ ${context}`, error);
  if (error instanceof Error) {
    console.error(error.stack);
  }
}

// Retry function with exponential backoff
async function retryOperation(operation: () => Promise<any>, retries: number = 3, delay: number = 500): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i < retries - 1) {
        console.log(`Retrying operation, attempt ${i + 1}`);
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
      } else {
        throw error;
      }
    }
  }
}

export function getBuildTool(workspace: Workspace) {
  return new GSXTool<typeof buildToolSchema>({
    name: "build",
    description:
      "Build the project using pnpm build. Returns build output or error messages.",
    schema: buildToolSchema,
    run: async (_params: BuildToolParams) => {
      try {
        console.log("💻 Starting build process...");
        const output = await retryOperation(() => buildWorkspace(workspace));
        console.log("🎉 Build process completed successfully.");
        return { output };
      } catch (error) {
        logError("Build process failed.", error);
        return { output: "Build failed: " + (error instanceof Error ? error.message : "Unknown error") };
      }
    },
  });
}
