/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

import { getCurrentContext } from "./context.js";
import { JsonValue } from "./workflow-state.js";

// Base tool definition - just schemas
export interface ToolDefinition<TParams = any, TResult = any> {
  params: z.ZodSchema<TParams>;
  result: z.ZodSchema<TResult>;
}

// Tool box type
export type ToolBox<T extends Record<string, ToolDefinition>> = T;

// Extract param/result types automatically
export type InferToolParams<T extends ToolDefinition> = z.infer<T["params"]>;
export type InferToolResult<T extends ToolDefinition> = z.infer<T["result"]>;

// Tool implementations for frontend
export type ToolImplementations<T extends ToolBox<any>> = {
  [K in keyof T]: {
    execute: (params: any) => any | Promise<any>;
  };
};

// Helper to create tool box
export function createToolBox<T extends Record<string, ToolDefinition>>(
  definitions: T,
): ToolBox<T> {
  return definitions;
}

// Helper to create tool implementations with type safety
export function createToolImplementations<
  T extends ToolBox<any>,
>(implementations: {
  [K in keyof T]: (params: any) => any | Promise<any>;
}): ToolImplementations<T> {
  return Object.fromEntries(
    Object.entries(implementations).map(([name, impl]) => [
      name,
      { execute: impl },
    ]),
  ) as ToolImplementations<T>;
}

// Enhanced executeExternalTool with tool box - workflow side helper

export async function executeExternalTool<
  T extends ToolBox<any>,
  K extends keyof T,
>(toolBox: T, toolName: K, params: any): Promise<any> {
  const context = getCurrentContext();
  const workflowContext = context.getWorkflowContext();

  // Generate unique call ID
  const callId = `${String(toolName)}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  // Validate params against schema

  const toolDef = toolBox[toolName] as ToolDefinition;
  const validatedParams = toolDef.params.parse(params);

  // Send external tool call message
  workflowContext.sendWorkflowMessage({
    type: "external-tool-call",
    toolName: String(toolName),
    params: validatedParams as JsonValue,
    callId,
    nodeId: context.getCurrentNodeId() ?? "unknown",
    sequenceNumber: Date.now(),
  });

  // Wait for response (this would need to be implemented in the workflow execution engine)
  return new Promise((_resolve, reject) => {
    // This is a placeholder - the actual implementation would need to:
    // 1. Store the resolve/reject callbacks keyed by callId
    // 2. Have the workflow execution engine call the appropriate callback
    //    when it receives the external-tool-response message
    // 3. Handle timeouts

    // For now, we'll throw an error indicating this needs implementation
    reject(
      new Error(
        "External tool execution not yet implemented in workflow engine",
      ),
    );
  });
}
