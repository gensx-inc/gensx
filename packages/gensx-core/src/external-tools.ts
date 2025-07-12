import * as z3 from "zod/v3";
import * as z4 from "zod/v4/core";
import { zodToJsonSchema } from "zod-to-json-schema";

import { Component } from "./component.js";
import { getCurrentContext } from "./context.js";
import { JsonValue } from "./workflow-state.js";

export interface ToolDefinition<
  TParamsSchema extends z4.$ZodType | z3.ZodType = z4.$ZodType | z3.ZodType,
  TResultSchema extends z4.$ZodType | z3.ZodType = z4.$ZodType | z3.ZodType,
> {
  description?: string;
  params: TParamsSchema;
  result: TResultSchema;
}

// Tool box type
export type ToolBox = Record<string, ToolDefinition>;

// Extract param/result types automatically
export type InferToolParams<T extends ToolBox, Tool extends keyof T> = z4.infer<
  T[Tool]["params"]
>;
export type InferToolResult<T extends ToolBox, Tool extends keyof T> = z4.infer<
  T[Tool]["result"]
>;

// Tool implementations for frontend
export type ToolImplementations<T extends ToolBox> = {
  [K in keyof T]: {
    execute: (
      params: InferToolParams<T, K>,
    ) => InferToolResult<T, K> | Promise<InferToolResult<T, K>>;
  };
};

// Helper to create tool box
export function createToolBox<T extends ToolBox>(definitions: T): T {
  return definitions;
}

export async function executeExternalTool<
  T extends Record<string, ToolDefinition>,
  K extends keyof T,
>(
  toolBox: T,
  toolName: K,
  params: InferToolParams<T, K>,
): Promise<InferToolResult<T, K>> {
  const toolDef = toolBox[toolName] as ToolDefinition;
  let validatedParams: unknown;
  if ("_zod" in toolDef.params) {
    validatedParams = z4.parse(toolDef.params, params);
  } else {
    validatedParams = toolDef.params.parse(params);
  }

  let paramsJsonSchema:
    | ReturnType<typeof z4.toJSONSchema>
    | ReturnType<typeof zodToJsonSchema>;
  if ("_zod" in toolDef.params) {
    paramsJsonSchema = z4.toJSONSchema(toolDef.params);
  } else {
    paramsJsonSchema = zodToJsonSchema(toolDef.params);
  }
  let resultJsonSchema:
    | ReturnType<typeof z4.toJSONSchema>
    | ReturnType<typeof zodToJsonSchema>;
  if ("_zod" in toolDef.result) {
    resultJsonSchema = z4.toJSONSchema(toolDef.result);
  } else {
    resultJsonSchema = zodToJsonSchema(toolDef.result);
  }

  const component = Component(
    "ExternalTool",
    async ({
      toolName,
      validatedParams,
    }: {
      toolName: string;
      validatedParams: Record<string, unknown>;
    }) => {
      const context = getCurrentContext();
      const workflowContext = context.getWorkflowContext();
      const currentNode = context.getCurrentNode();
      if (!currentNode) {
        throw new Error("No current node ID found");
      }

      // Ensure that the we have flushed all pending updates to the server.
      await workflowContext.checkpointManager.waitForPendingUpdates();

      // Send external tool call message
      workflowContext.sendWorkflowMessage({
        type: "external-tool",
        toolName: String(toolName),
        params: validatedParams as JsonValue,
        paramsSchema: paramsJsonSchema,
        resultSchema: resultJsonSchema,
        nodeId: currentNode.id,
      });

      // For now we rely on the request input mechanism to resume the workflow later.
      // The next iteration of this will use the non-blocking queue.
      return (await workflowContext.onRequestInput({
        type: "external-tool",
        toolName: String(toolName),
        nodeId: currentNode.id,
        params: validatedParams as JsonValue,
        paramsSchema: paramsJsonSchema,
        resultSchema: resultJsonSchema,
      })) as InferToolResult<T, K>;
    },
  );

  return await component({
    toolName: String(toolName),
    validatedParams: validatedParams as Record<string, unknown>,
  });
}
