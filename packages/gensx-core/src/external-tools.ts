import { Component } from "./component.js";
import { getCurrentContext } from "./context.js";
import { JsonValue } from "./workflow-state.js";
import {
  AnyZodSchema,
  InferZodType,
  toJsonSchema,
  zodValidate,
} from "./zod.js";

export interface ToolDefinition<
  TParamsSchema extends AnyZodSchema = AnyZodSchema,
  TResultSchema extends AnyZodSchema = AnyZodSchema,
> {
  description?: string;
  params: TParamsSchema;
  result: TResultSchema;
}

// Tool box type
export type ToolBox = Record<string, ToolDefinition>;

// Extract param/result types automatically
export type InferToolParams<
  T extends ToolBox,
  Tool extends keyof T,
> = InferZodType<T[Tool]["params"]>;
export type InferToolResult<
  T extends ToolBox,
  Tool extends keyof T,
> = InferZodType<T[Tool]["result"]>;

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
