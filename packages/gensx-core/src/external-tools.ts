import { z } from "zod";

import { Component } from "./component.js";
import { getCurrentContext } from "./context.js";
import { JsonValue } from "./workflow-state.js";
import { toJsonSchema, zodValidate } from "./zod.js";

export interface ToolDefinition<
  TParamsSchema extends z.ZodTypeAny,
  TResultSchema extends z.ZodTypeAny,
> {
  description?: string;
  params: TParamsSchema;
  result: TResultSchema;
}

// Tool box type
export type ToolBox = Record<
  string,
  ToolDefinition<z.ZodTypeAny, z.ZodTypeAny>
>;

// Extract param/result types automatically
export type InferToolParams<T extends ToolBox, K extends keyof T> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T[K] extends ToolDefinition<infer P, any> ? z.infer<P> : never;

export type InferToolResult<T extends ToolBox, K extends keyof T> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T[K] extends ToolDefinition<any, infer R> ? z.infer<R> : never;

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

export async function executeExternalTool<T extends ToolBox, K extends keyof T>(
  toolBox: T,
  toolName: K,
  params: InferToolParams<T, K>,
): Promise<InferToolResult<T, K>> {
  const toolDef = toolBox[toolName] as ToolDefinition<
    z.ZodTypeAny,
    z.ZodTypeAny
  >;
  const validatedParams = zodValidate(toolDef.params, params);
  const paramsJsonSchema = toJsonSchema(toolDef.params);
  const resultJsonSchema = toJsonSchema(toolDef.result);

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

      // Send external tool call message
      workflowContext.sendWorkflowMessage({
        type: "external-tool",
        toolName: String(toolName),
        params: validatedParams as JsonValue,
        paramsSchema: paramsJsonSchema,
        resultSchema: resultJsonSchema,
        nodeId: currentNode.id,
      });

      const result = await workflowContext.onRequestInput({
        type: "external-tool",
        toolName: String(toolName),
        nodeId: currentNode.id,
        params: validatedParams as JsonValue,
        paramsSchema: paramsJsonSchema,
        resultSchema: resultJsonSchema,
      });

      if (
        typeof result === "object" &&
        result !== null &&
        "__gensxMissingToolImplementation" in result
      ) {
        throw new Error(`Tool implementation not found: ${String(toolName)}`);
      }

      return result as InferToolResult<T, K>;
    },
  );

  return await component({
    toolName: String(toolName),
    validatedParams: validatedParams as Record<string, unknown>,
  });
}
