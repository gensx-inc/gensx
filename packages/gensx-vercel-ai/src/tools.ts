import type { InferToolParams, ToolBox } from "@gensx/core";

import { executeExternalTool } from "@gensx/core";
import { jsonSchema, type Tool } from "ai";

import { toJsonSchema } from "./zod.js";

// Utility function to convert ToolBox to Vercel AI SDK ToolSet format
export function asToolSet(toolBox: ToolBox): Record<string, Tool> {
  return Object.entries(toolBox).reduce<Record<string, Tool>>(
    (acc, [name, toolDef]) => {
      acc[name] = {
        description: toolDef.description,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        parameters: jsonSchema(toJsonSchema(toolDef.params) as any),
        execute: async (args: InferToolParams<typeof toolBox, typeof name>) => {
          return await executeExternalTool(toolBox, name, args);
        },
      };
      return acc;
    },
    {},
  );
}
