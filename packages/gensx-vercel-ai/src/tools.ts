import type { InferToolParams, ToolBox } from "@gensx/core";

import { executeExternalTool } from "@gensx/core";
import { jsonSchema, type Tool } from "ai";
import z4 from "zod/v4";

// Utility function to convert ToolBox to Vercel AI SDK ToolSet format
export function asToolSet(toolBox: ToolBox): Record<string, Tool> {
  return Object.entries(toolBox).reduce<Record<string, Tool>>(
    (acc, [name, toolDef]) => {
      let paramsSchema;
      if ("_zod" in toolDef.params) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        paramsSchema = jsonSchema(z4.toJSONSchema(toolDef.params) as any);
      } else {
        paramsSchema = toolDef.params;
      }
      acc[name] = {
        description: toolDef.description,
        parameters: paramsSchema,
        execute: async (args: InferToolParams<typeof toolBox, typeof name>) => {
          return await executeExternalTool(toolBox, name, args);
        },
      };
      return acc;
    },
    {},
  );
}
